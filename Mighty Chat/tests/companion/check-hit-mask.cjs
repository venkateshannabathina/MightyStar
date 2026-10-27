'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../../model-viewer-clean/node_modules/typescript');
const appRoot = path.resolve(__dirname, '../..');
const source = path.join(appRoot, 'Renderer/AlphaHitMask.ts');

function harness(file) {
    let pixels = new Uint8ClampedArray(0), encodes = 0, reads = 0;
    const messages = [];
    const context = {
        clearRect() {}, drawImage() {},
        getImageData() { reads++; return { data: pixels }; },
    };
    const sandbox = {
        exports: {}, document: { createElement: () => ({ width: 300, height: 150, getContext: () => context }) },
        window: { parent: { postMessage: value => messages.push(value) } },
        btoa(value) { encodes++; return Buffer.from(value, 'binary').toString('base64'); },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, sandbox);
    return {
        mask: new sandbox.exports.AlphaHitMask(), messages,
        pixels(value) { pixels = value; },
        get encodes() { return encodes; }, get reads() { return reads; },
    };
}

function frame(width, height, seed) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    const packed = Buffer.alloc(Math.ceil(width * height / 8));
    for (let pixel = 0; pixel < width * height; pixel++) {
        const alpha = [0, 15, 16, 255][(pixel * 13 + seed) % 4];
        rgba[pixel * 4 + 3] = alpha;
        if (alpha >= 16) packed[Math.floor(pixel / 8)] |= 2 ** (pixel % 8);
    }
    return { rgba, data: packed.toString('base64') };
}

const candidate = harness(source);
const canvas = { clientWidth: 5, clientHeight: 4 };
let fixture = frame(5, 4, 0);
candidate.pixels(fixture.rgba);
candidate.mask.sample(canvas, 20);
assert.equal(candidate.reads, 0, 'preserve sampling throttle');
candidate.mask.sample(canvas, 40);
assert.equal(candidate.messages.length, 1);
assert.equal(candidate.messages[0].data, fixture.data, 'alpha threshold, row packing and partial bytes');
candidate.mask.sample(canvas, 80);
assert.equal(candidate.messages.length, 1, 'unchanged mask is deduplicated');
assert.equal(candidate.encodes, 1, 'unchanged samples do not encode again');
candidate.mask.sample(canvas, 540);
assert.equal(candidate.messages.length, 2, 'unchanged mask retains the 500ms heartbeat');
assert.equal(candidate.encodes, 1, 'heartbeat reuses the encoded mask');
fixture = frame(5, 4, 1); candidate.pixels(fixture.rgba);
candidate.mask.sample(canvas, 580);
assert.equal(candidate.messages.at(-1).data, fixture.data, 'changed pixels clear obsolete bits');
assert.equal(candidate.encodes, 2);
canvas.clientWidth = 4; canvas.clientHeight = 5;
candidate.mask.sample(canvas, 620);
assert.equal(candidate.messages.at(-1).width, 4, 'resize sends immediately even with the same packed bytes');
assert.equal(candidate.messages.at(-1).height, 5);
for (const [clientWidth, clientHeight] of [[1, 1], [300, 150], [1000, 2000], [2000, 1000], [0, 0]]) {
    const scale = Math.min(1, 512 / Math.max(1, clientWidth), 1024 / Math.max(1, clientHeight));
    const width = Math.max(1, Math.ceil(clientWidth * scale)), height = Math.max(1, Math.ceil(clientHeight * scale));
    const item = harness(source), expected = frame(width, height, 2);
    item.pixels(expected.rgba); item.mask.sample({ clientWidth, clientHeight }, 40);
    const value = item.messages[0];
    assert.deepEqual(JSON.parse(JSON.stringify(value)), {
        type: 'mighty-companion-hit-mask', width, height, data: expected.data,
        viewportWidth: clientWidth, viewportHeight: clientHeight,
    });
}
console.log('PASS: hit-mask alpha threshold, packed rows, bit clearing, resize, throttle, native heartbeat and encoding reuse');

if (process.argv.includes('--benchmark')) {
    const original = path.join(appRoot, 'build/optimization-review/originals/Renderer/AlphaHitMask.ts');
    const size = { clientWidth: 460, clientHeight: 760 }, frames = 180;
    const fixtures = [frame(460, 760, 0), frame(460, 760, 1)];
    const results = [];
    for (const changing of [false, true]) {
        const timings = { before: [], after: [] };
        for (let run = 0; run < 7; run++) {
            const packets = {};
            for (const label of (run % 2 ? ['after', 'before'] : ['before', 'after'])) {
                const item = harness(label === 'before' ? original : source);
                for (let i = 0; i < 60; i++) { item.pixels(fixtures[0].rgba); item.mask.sample(size, (i + 1) * 40); }
                item.messages.length = 0;
                const startEncodes = item.encodes, start = performance.now();
                for (let i = 0; i < frames; i++) {
                    item.pixels(fixtures[changing ? i % 2 : 0].rgba);
                    item.mask.sample(size, (i + 61) * 40);
                }
                const duration = performance.now() - start;
                timings[label].push(duration / frames);
                packets[label] = JSON.parse(JSON.stringify(item.messages));
                if (run === 6) results.push({ scenario: changing ? 'changing' : 'unchanged', label, encodes: item.encodes - startEncodes, frames });
            }
            assert.deepEqual(packets.after, packets.before, 'baseline and candidate send identical native packets');
        }
        for (const label of ['before', 'after']) {
            const values = timings[label].sort((a, b) => a - b);
            results.find(value => value.scenario === (changing ? 'changing' : 'unchanged') && value.label === label).processingMs = {
                median: values[3], min: values[0], max: values.at(-1), runs: values.length,
            };
        }
    }
    fs.writeFileSync(path.join(appRoot, 'build/optimization-review/hit-mask-benchmark.json'), JSON.stringify({
        environment: { node: process.version, platform: process.platform, architecture: process.arch },
        scope: 'CPU packing/encoding only; synthetic RGBA input excludes canvas readback, GPU and end-to-end frame time', results,
    }, null, 2));
    console.log(JSON.stringify(results, null, 2));
}
