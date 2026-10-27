'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EdgeTTS } = require('../../Backend/providers/EdgeTTS.cjs');

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mighty-edge-check-'));
  const worker = new EdgeTTS({ audioRoot: directory });
  try {
    const result = await worker.synthesize({ text: 'Hello there.', voice: 'en-US-AvaMultilingualNeural' });
    assert(fs.statSync(path.join(directory, `${result.audioId}.mp3`)).size > 0);
    assert(result.durationSeconds >= result.lastWordEndSeconds);
    assert.equal(result.quality, 'heuristic-word-cues');
    console.log(`Persistent Edge synthesis passed: ${result.durationSeconds}s audio, ${result.lastWordEndSeconds}s last word`);
  } finally {
    worker.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
