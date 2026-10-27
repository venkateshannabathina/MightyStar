'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { once } = require('node:events');
async function check(enabled) {
  const child = spawn(process.execPath, [path.resolve(__dirname, '../../Sources/companion-server.cjs')], {
    env: {...process.env, MIGHTY_DEBUG_PERF: enabled ? '1' : '0'}, stdio: ['pipe', 'pipe', 'pipe']});
  try {
    const ready = await new Promise((resolve, reject) => {
      let text = ''; child.stdout.on('data', chunk => { text += chunk; if (text.includes('\n')) resolve(JSON.parse(text.split('\n')[0])); });
      child.once('exit', () => reject(new Error('Server did not start')));
    });
    const origin = `http://127.0.0.1:${ready.port}`;
    const api = (suffix, body, auth = true) => fetch(origin + '/api/debug/perf/' + suffix,
      {method: body === undefined ? 'GET' : 'POST', headers: {...(auth ? {'X-Mighty-Token':ready.token} : {}), 'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
    assert.equal((await api('export', undefined, false)).status, 401);
    if (!enabled) { assert.equal((await api('export')).status, 404); assert.equal((await api('clock', {})).status, 404); return; }
    const clock = await (await api('clock', {})).json(); assert(clock.sentMs >= clock.receivedMs);
    const identity = {sessionId:'s',characterId:'c',turnId:'t',generation:1};
    assert.equal((await api('sample', {identity, source:'native', offsetMs:0, uncertaintyMs:1, timestamps:{input_commit:clock.sentMs}})).status, 200);
    assert.equal((await api('sample', {identity, source:'native', offsetMs:0, uncertaintyMs:1, timestamps:{password:123}})).status, 400);
    const exported = await (await api('export')).text(); const row = JSON.parse(exported);
    assert.deepEqual(Object.keys(row).sort(), ['characterId','clockOffsetsMs','clockUncertaintyMs','generation','sessionId','timestamps','turnId']);
    assert.equal(row.timestamps.input_commit, clock.sentMs); assert(!exported.includes(ready.token));
  } finally { if (child.exitCode === null) { const exit = once(child, 'exit'); child.stdin.end(); await exit; } }
}
(async () => { await check(false); await check(true); console.log('Perf API: authentication, default-off, clock, correlated export and validation passed'); })().catch(error => { console.error(error); process.exitCode = 1; });
