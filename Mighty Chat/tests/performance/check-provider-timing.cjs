'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OpenAITTS } = require('../../Backend/providers/OpenAITTS.cjs');
const { EdgeTTS } = require('../../Backend/providers/EdgeTTS.cjs');
const { streamGroq } = require('../../Backend/providers/GroqLLM.cjs');
(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mighty-provider-timing-'));
  try {
    let called = 0, fetchStarted = false;
    const tts = new OpenAITTS({audioRoot:root, apiKey:'fixture', fetchImpl:async () => ({ok:true, body:new ReadableStream({start(controller) { controller.enqueue(new Uint8Array([1])); controller.enqueue(new Uint8Array([2])); controller.close(); }})})});
    const output = await tts.synthesize({text:'Fixture', onFirstByte:() => { called++; assert.equal(fs.readdirSync(root).length, 0); }});
    assert.equal(called,1); assert.deepEqual([...fs.readFileSync(path.join(root, output.audioId+'.mp3'))],[1,2]);
    const edge = new EdgeTTS({audioRoot:root});
    edge.pending.set('j', {cancelled:false, onFirstByte:() => called++});
    edge.onMessage({type:'first_audio',jobId:'j'}); edge.onMessage({type:'first_audio',jobId:'j'}); assert.equal(called,2);
    edge.pending.get('j').cancelled = true; edge.pending.get('j').output = path.join(root,'absent'); edge.pending.get('j').metadata = path.join(root,'absent-json');
    edge.onMessage({type:'first_audio',jobId:'j'}); assert.equal(called,2);
    const tokens = [];
    for await (const token of streamGroq({apiKey:'fixture', messages:[], onRequestSent:() => { assert(!fetchStarted); }, fetchImpl:async () => {fetchStarted=true; return {ok:true,body:new ReadableStream({start(c){ c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n')); c.close(); }})}; }})) tokens.push(token);
    assert.deepEqual(tokens,['Hi']); assert(fetchStarted);
    console.log('Provider timing: first nonempty bytes, once-only/cancelled callbacks and request boundary passed');
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
})().catch(error => { console.error(error); process.exitCode=1; });
