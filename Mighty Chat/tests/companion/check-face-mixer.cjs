'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../../model-viewer-clean/node_modules/typescript');
const appRoot = path.resolve(__dirname, '../..');
const faceRoot = path.join(appRoot, 'Renderer/face');
const source = path.join(faceRoot, 'FaceMixer.ts');

function harness(mixerFile = source) {
    let clock = 0, resets = 0;
    const values = {}, modules = new Map();
    const math = Object.create(Math); math.random = () => 0.1;
    const context = vm.createContext({ Math: math, performance: { now: () => clock } });
    function load(file) {
        if (modules.has(file)) return modules.get(file).exports;
        const module = { exports: {} }; modules.set(file, module);
        const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText;
        const evaluate = vm.runInContext('(function(require,module,exports){' + code + '\n})', context);
        evaluate(name => load(path.join(faceRoot, name + '.ts')), module, module.exports);
        return module.exports;
    }
    const mixer = new (load(mixerFile).FaceMixer)({
        set(channel, value) { values[channel] = value; },
        reset() { resets++; for (const channel in values) values[channel] = 0; },
    });
    return { mixer, values, clock(value) { clock = value; }, get resets() { return resets; } };
}

const performanceData = (mood = 'happy', pose = 'a') => ({
    version: 1, utteranceId: 'speech', characterId: 'fixture', appearanceKey: 'fixture',
    durationSeconds: 2, quality: 'word-boundaries',
    mouthCues: [{ start: 0, end: 1, pose }, { start: 1, end: 2, pose: 'o' }],
    expression: { mood, intensity: 0.6 },
});
const snapshot = (sequence, positionSeconds = 0, state = 'speaking') => ({
    utteranceId: 'speech', characterId: 'fixture', sequence, positionSeconds, playbackRate: 1, state,
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

for (const [pose, channel, weight] of [['a', 'a', 0.82], ['i', 'i', 0.62], ['u', 'u', 0.7], ['e', 'e', 0.68], ['o', 'o', 0.78], ['fv', 'i', 0.34], ['closed', 'a', 0]]) {
    const item = harness();
    item.mixer.setPerformance(performanceData('happy', pose));
    item.mixer.setSnapshot(snapshot(2)); item.mixer.update(0.1);
    near(item.values[channel], weight);
    near(item.values.smile, 0.6 * 0.5 * 0.58 * 0.25 * 0.8);
    near(item.values.smileEyes, 0.6 * 0.5 * 0.78 * 0.8);
    item.mixer.setSnapshot(snapshot(1, 1.5)); item.mixer.update(0.1);
    near(item.values[channel], weight);
    item.mixer.setSnapshot({ ...snapshot(3, 1.5), utteranceId: 'unrelated' }); item.mixer.update(0.1);
    near(item.values[channel], weight);
    item.mixer.setSnapshot(snapshot(3, 1.5)); item.mixer.update(0.1);
    near(item.values.o, 0.78);
    item.mixer.setSnapshot(snapshot(4, 1.5, 'ended')); item.mixer.update(0.1);
    for (const mouth of ['a', 'i', 'u', 'e', 'o']) near(item.values[mouth], 0);
    item.mixer.clear(); assert.equal(item.resets, 1);
    for (const value of Object.values(item.values)) near(value, 0);
    item.mixer.setPerformance(performanceData('sad')); item.mixer.setSnapshot(snapshot(1)); item.mixer.update(0.1);
    near(item.values.a, 0.82);
    assert.ok(item.values.sad > 0);
}
console.log('PASS: face mixer mouth poses, speech smile attenuation, expression blending, stale/unrelated snapshots, completion, reset and reuse');

if (process.argv.includes('--benchmark')) {
    const original = path.join(appRoot, 'build/optimization-review/originals/Renderer/face/FaceMixer.ts');
    const before = harness(original), after = harness();
    const states = ['ready', 'speaking', 'paused', 'ended', 'cancelled', 'error'];
    const moods = ['neutral', 'happy', 'amused', 'sad', 'concerned', 'surprised'];
    for (let i = 0; i < 3600; i++) {
        for (const item of [before, after]) {
            item.clock(i * 16);
            if (i % 37 === 0) item.mixer.setPerformance(performanceData(moods[Math.floor(i / 37) % moods.length]));
            item.mixer.setSnapshot(snapshot(i, (i % 120) / 60, states[Math.floor(i / 29) % states.length]));
            if (i % 211 === 0) item.mixer.clear();
            item.mixer.update([0, 1 / 120, 1 / 60, 0.1][i % 4]);
        }
        assert.deepEqual(after.values, before.values, 'every morph weight matches the original on frame ' + i);
    }
    const times = { before: [], after: [] }, frames = 12000;
    for (let run = 0; run < 7; run++) {
        for (const label of (run % 2 ? ['after', 'before'] : ['before', 'after'])) {
            const item = harness(label === 'before' ? original : source);
            item.mixer.setPerformance(performanceData()); item.mixer.setSnapshot(snapshot(1));
            for (let i = 0; i < 1000; i++) item.mixer.update(1 / 60);
            const start = performance.now();
            for (let i = 0; i < frames; i++) item.mixer.update(1 / 60);
            times[label].push((performance.now() - start) / frames);
        }
    }
    const result = { matchedFrames: 3600, framesPerRun: frames, runs: 7, scope: 'synthetic face mixer CPU work; excludes Babylon morph application and GPU rendering' };
    for (const label of ['before', 'after']) {
        const sorted = times[label].sort((a, b) => a - b);
        result[label] = { medianMs: sorted[3], minMs: sorted[0], maxMs: sorted.at(-1) };
    }
    fs.writeFileSync(path.join(appRoot, 'build/optimization-review/face-mixer-benchmark.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
}
