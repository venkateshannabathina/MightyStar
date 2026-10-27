'use strict';
const assert = require('node:assert/strict');
const { pcm16ToWav, transcribeGroq } = require('../../Backend/providers/GroqBatchSTT.cjs');

(async () => {
  const pcm = Buffer.from([0, 0, 255, 127, 0, 128]);
  const wav = pcm16ToWav(pcm, 16000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.throws(() => pcm16ToWav(Buffer.alloc(3), 16000), /Invalid PCM/);
  assert.throws(() => pcm16ToWav(pcm, 7), /sample rate/);
  let sent;
  const text = await transcribeGroq({ pcm, sampleRate: 16000, apiKey: 'test', language: 'en', fetchImpl: async (url, request) => {
    sent = { url, request };
    return { ok: true, json: async () => ({ text: ' Hello. ' }) };
  } });
  assert.equal(text, 'Hello.');
  assert.equal(sent.request.body.get('model'), 'whisper-large-v3-turbo');
  assert.equal(sent.request.body.get('language'), 'en');
  assert.equal(sent.request.body.get('file').size, wav.length);
  console.log('Batch STT WAV format, limits, and provider request checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
