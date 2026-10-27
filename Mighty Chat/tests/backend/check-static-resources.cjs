'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const source = path.resolve(__dirname, '../../Sources');

(async () => {
    const server = spawn(process.execPath, [path.join(source, 'companion-server.cjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
    try {
        const ready = await new Promise((resolve, reject) => {
            let output = '';
            const timer = setTimeout(() => reject(Error('Static-resource backend startup timed out')), 15000);
            server.once('error', error => { clearTimeout(timer); reject(error); });
            server.stdout.on('data', chunk => {
                output += chunk;
                if (output.includes('\n')) { clearTimeout(timer); resolve(JSON.parse(output.split('\n')[0])); }
            });
            server.once('exit', code => { clearTimeout(timer); reject(Error('Static-resource backend exited ' + code)); });
        });
        const origin = 'http://127.0.0.1:' + ready.port;
        const index = await fs.readFile(path.join(source, 'index.html'), 'utf8');
        const resources = new Set([...index.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]));
        const sandbox = { window: {} };
        vm.runInNewContext(await fs.readFile(path.join(source, 'background-assets.js'), 'utf8'), sandbox);
        for (const background of sandbox.window.MIGHTY_BACKGROUNDS) {
            resources.add(background.url); resources.add(background.thumbnail);
        }
        for (const resource of resources) {
            assert.ok(!resource.includes('://'), 'only bundled resources are expected');
            const response = await fetch(origin + '/' + resource);
            assert.equal(response.status, 200, 'referenced UI resource is served: ' + resource);
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(source, resource)));
            if (resource.endsWith('.js')) assert.match(response.headers.get('content-type'), /^text\/javascript/);
            if (resource.endsWith('.css')) assert.match(response.headers.get('content-type'), /^text\/css/);
            const head = await fetch(origin + '/' + resource, { method: 'HEAD' });
            assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
        }
        for (const resource of ['companion-server.cjs', 'main.swift', 'Characters/hailey/hailey.glb', 'Backgrounds/not-bundled.jpg', 'Backgrounds/../companion-server.cjs', '%2e%2e%2fBackend/CallTransport.cjs']) {
            assert.equal((await fetch(origin + '/' + resource)).status, 403, 'private/unlisted paths remain blocked: ' + resource);
        }
        console.log('PASS: all ' + resources.size + ' referenced UI/background resources, matching bytes, script/style MIME types, HEAD and private-path rejection');
    } finally { server.stdin.end(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
