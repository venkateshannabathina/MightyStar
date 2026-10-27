'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const worker = process.argv[2] || path.join(root, 'Backend/workers/edge_worker.py');
const vendor = process.argv[3] || path.join(root, 'Sources/EdgeTTS');
const child = spawn('/usr/bin/python3', [worker], { env: { ...process.env, PYTHONPATH: vendor }, stdio: ['pipe', 'pipe', 'pipe'] });
let output = '', errors = '';
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
child.stdout.on('data', data => output += data);
child.stderr.on('data', data => errors += data);
child.stdin.write(JSON.stringify({ type: 'synthesize', jobId: 'invalid-job', text: 'x'.repeat(181) }) + '\n');
child.stdin.end();
const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
child.on('exit', code => {
  clearTimeout(timeout);
  try {
    assert.equal(code, 0, errors);
    assert.equal(JSON.parse(output.trim()).type, 'error');
    console.log('Persistent Edge worker start, validation, and shutdown passed');
  } catch (error) { console.error(error); process.exitCode = 1; }
});
