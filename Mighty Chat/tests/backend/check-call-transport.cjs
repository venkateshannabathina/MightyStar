'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const WebSocket = require('../../Backend/vendor/ws');

function firstLine(stream) {
  return new Promise((resolve, reject) => {
    let text = '';
    stream.on('data', chunk => {
      text += chunk.toString();
      const end = text.indexOf('\n');
      if (end >= 0) resolve(text.slice(0, end));
    });
    stream.on('error', reject);
    stream.on('end', () => reject(new Error('Server ended before readiness')));
  });
}
function open(url, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: token ? { 'X-Mighty-Token': token } : {} });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function message(ws) {
  return new Promise(resolve => ws.once('message', bytes => resolve(JSON.parse(bytes.toString()))));
}

(async () => {
  const serverPath = process.argv[2] || path.resolve(__dirname, '../../Sources/companion-server.cjs');
  const server = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GROQ_API_KEY: '' } });
  const timeout = setTimeout(() => { server.kill(); process.exitCode = 1; }, 8000);
  try {
    const { port, token } = JSON.parse(await firstLine(server.stdout));
    const url = `ws://127.0.0.1:${port}/api/call`;
    await assert.rejects(open(url), /401/);
    const ws = await open(url, token);
    const id = { sessionId: 's', characterId: 'c', generation: 0, turnId: 't' };
    const make = (type, sequence, identity) => ({ version: 2, type, eventId: `e-${sequence}`, sequence, identity });
    let next = message(ws);
    ws.send(JSON.stringify(make('session.open', 0, id)));
    assert.equal((await next).type, 'session.ready');
    next = message(ws);
    ws.send(JSON.stringify(make('generation.advance', 1, { ...id, generation: 1 })));
    assert.equal((await next).type, 'generation.accepted');
    next = message(ws);
    ws.send(JSON.stringify({ ...make('turn.text', 2, { ...id, generation: 1 }), text: 'Hello' }));
    assert.equal((await next).type, 'response.error');
    const closed = new Promise(resolve => ws.once('close', code => resolve(code)));
    ws.send(JSON.stringify(make('generation.advance', 3, { ...id, generation: 1 })));
    assert.equal(await closed, 1008);
    const second = await open(url, token);
    next = message(second);
    second.send(JSON.stringify(make('session.open', 0, id)));
    assert.equal((await next).type, 'session.ready');
    second.send(JSON.stringify({ ...make('input.begin', 1, id), format: 'pcm16le', sampleRate: 16000, totalBytes: 4 }));
    second.send(Buffer.from([0, 0, 0, 0]), { binary: true });
    next = message(second);
    second.send(JSON.stringify(make('input.commit', 2, id)));
    assert.equal((await next).type, 'response.error');
    const serverExit = new Promise(resolve => server.once('exit', resolve));
    server.stdin.end();
    assert.equal(await serverExit, 0, 'backend must exit with active WebSocket clients');
    console.log('Authenticated call transport checks passed');
  } finally {
    clearTimeout(timeout);
    server.stdin.end();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
