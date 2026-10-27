'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { PocketWorker: PocketTTS } = require('../../Backend/providers/PocketTTS.cjs');
const { voiceSettings } = require('../../Backend/providers/ProviderSettings.cjs');
(async () => {
  const audioRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mighty-pocket-check-'));
  const wav = Buffer.alloc(44 + 4800);
  wav.write('RIFF'); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(24000,24);
  wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(0xffffffff,40);
  let mode = 'ok', first = 0;
  const tts = new PocketTTS({ audioRoot, packs:{ensure:async()=>{}}, fetchImpl: async (_, options) => {
    assert.equal(options.body.get('text'), 'Hello.');
    assert.equal(options.body.get('voice_url'), 'alba');
    if (mode === 'cancel') return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('cancelled')), { once: true }));
    if (mode === 'error') return new Response('', {status:503});
    if (mode === 'invalid') return new Response('bad audio');
    return new Response(new ReadableStream({start(c) { c.enqueue(wav.subarray(0,44)); c.enqueue(wav.subarray(44)); c.close(); }}));
  }});
  tts.ready = async () => {};
  try {
    assert.equal(voiceSettings({ttsProvider:'pocket',voiceSpeed:1.5}).voice,'alba');
    assert.equal(voiceSettings({ttsProvider:'pocket',voiceSpeed:1.5}).speed,1);
    assert.equal(voiceSettings({}).provider,'pocket');
    assert.equal(voiceSettings({ttsProvider:'pocket',pocketVoice:'marius'}).voice,'marius');
    const french=voiceSettings({ttsProvider:'pocket',pocketLanguage:'french',pocketSpeed:1.1,pocketPitch:-2,pocketVolume:.8});assert.equal(french.voice,'estelle');assert.equal(french.language,'french');assert.equal(french.speed,1.1);assert.equal(french.tone,-2);assert.equal(french.gain,.8);
    assert.equal(voiceSettings({ttsProvider:'pocket',pocketVoice:'../bad'}).voice,'alba');
    const result = await tts.synthesize({text:'Hello.',onFirstByte:()=>first++});
    assert.equal(first,1); assert.equal(result.durationSeconds,.1); assert.deepEqual(result.words,[]);
    const saved = fs.readFileSync(path.join(audioRoot,result.audioId+'.wav'));
    assert.equal(saved.readUInt32LE(4),saved.length-8); assert.equal(saved.readUInt32LE(40),4800);
    for (mode of ['error','invalid']) await assert.rejects(tts.synthesize({text:'Hello.'}));
    mode='cancel'; const job = tts.synthesize({text:'Hello.'});
    await new Promise(resolve=>setImmediate(resolve)); tts.cancel(job.jobId); await assert.rejects(job);
    let release; tts.ready = () => new Promise(resolve=>release=resolve);
    const waiting = tts.synthesize({text:'Hello.'}); tts.cancel(waiting.jobId); await assert.rejects(waiting); release();
    assert.equal(tts.jobs.size,0);
    assert.equal(fs.readdirSync(audioRoot).length,1,'errors/cancellation must not leave audio');
    console.log('Pocket provider: settings, PCM validation/header repair, no fake alignment, errors, startup and generation cancellation passed.');
  } finally { tts.close(); fs.rmSync(audioRoot,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1});
