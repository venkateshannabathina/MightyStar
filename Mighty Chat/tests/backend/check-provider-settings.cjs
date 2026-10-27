'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { providerSettings, voiceSettings } = require('../../Backend/providers/ProviderSettings.cjs');
const { OpenAITTS } = require('../../Backend/providers/OpenAITTS.cjs');
const { streamGroq } = require('../../Backend/providers/GroqLLM.cjs');
const { transcribeGroq } = require('../../Backend/providers/GroqBatchSTT.cjs');
(async () => {
  assert.equal(providerSettings({}).provider, 'groq');
  const config = providerSettings({MIGHTY_AI_PROVIDER:'openai',OPENAI_API_KEY:'test-openai',GROQ_API_KEY:'test-groq'});
  assert.equal(config.apiKey, 'test-openai'); assert.equal(config.model, 'gpt-4.1-mini');
  assert.equal(voiceSettings({ttsProvider:'edge',voiceSpeed:1.25,voicePitch:-10}).rate, '+25%');
  assert.equal(voiceSettings({ttsProvider:'openai',openaiVoice:'unknown'}).voice, 'marin');
  assert.equal(voiceSettings({ttsProvider:'edge',voiceSpeed:Infinity}).speed, 1);
  assert.equal(voiceSettings({ttsProvider:'edge',voiceSpeed:.5}).speed,.5);
  assert.equal(voiceSettings({ttsProvider:'edge',voiceSpeed:.5}).rate,'-50%');
  assert.equal(voiceSettings({ttsProvider:'edge',voiceSpeed:.1}).speed,.5);
  const profile = voiceSettings({ttsProvider:'openai',openaiVoice:'cedar',voiceSpeed:1.1,voiceInstructions:'Warm'});
  const audioRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mighty-provider-test-'));
  const tts = new OpenAITTS({audioRoot,apiKey:'test',fetchImpl:async (url, options) => {
    assert.equal(url,'https://api.openai.com/v1/audio/speech');
    const body=JSON.parse(options.body); assert.equal(body.voice,'cedar'); assert.equal(body.speed,1.1); assert.equal(body.instructions,'Warm');
    return {ok:true,arrayBuffer:async()=>Buffer.from('test-audio')};
  }});
  const result=await tts.synthesize({...profile,text:'Hello.'});
  assert.equal(result.quality,'audio-only'); assert.ok(fs.existsSync(path.join(audioRoot,result.audioId+'.mp3')));
  fs.rmSync(audioRoot,{recursive:true,force:true});
  const encoded=new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n');
  for await (const text of streamGroq({...config,messages:[],fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/chat/completions'); assert.equal(options.headers.Authorization,'Bearer test-openai');
    return {ok:true,body:new ReadableStream({start(c){c.enqueue(encoded);c.close();}})};
  }})) assert.equal(text,'Hello');
  const transcript=await transcribeGroq({...config,model:config.transcriptionModel,pcm:Buffer.alloc(3200),sampleRate:16000,fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');assert.equal(options.body.get('model'),'gpt-4o-mini-transcribe');
    return {ok:true,json:async()=>({text:'Hello'})};
  }});assert.equal(transcript,'Hello');
  console.log('Provider selection, voice controls, OpenAI speech, STT and reply routing passed');
})().catch(error=>{console.error(error);process.exitCode=1});
