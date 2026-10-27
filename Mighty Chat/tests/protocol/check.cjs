const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { playbackSnapshot } = require('../../Shared/CallProtocol.cjs');
for (const [name, expected] of [['valid-snapshot', true], ['invalid-stale-shape', false], ['invalid-sample', false]]) {
  const value = JSON.parse(fs.readFileSync(path.join(__dirname, '../../Shared/fixtures', `${name}.json`), 'utf8'));
  assert.equal(playbackSnapshot(value), expected, name);
}
console.log('JavaScript protocol fixtures passed');
