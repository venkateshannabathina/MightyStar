'use strict';
const assert=require('node:assert/strict');
const {providerSettings,voiceSettings}=require('../../Backend/providers/ProviderSettings.cjs');
const {replyRequest}=require('../../Backend/providers/ReplyRequest.cjs');
const env={MIGHTY_AI_PROVIDER:'groq',MIGHTY_AI_MODEL:'global-model',GROQ_API_KEY:'groq-test',GEMINI_API_KEY:'gemini-test',OPENAI_API_KEY:'openai-test'};
const gemini=providerSettings(env,{aiProvider:'gemini',aiModel:'chosen-gemini'});
assert.equal(gemini.provider,'gemini');assert.equal(gemini.apiKey,'gemini-test');assert.equal(gemini.model,'chosen-gemini');assert.equal(gemini.transcriptionProvider,'groq');
assert.equal(providerSettings(env,{}).model,'global-model');assert.equal(providerSettings(env,{aiProvider:'invalid',aiModel:'ignored'}).model,'global-model');
assert.equal(providerSettings(env,{aiProvider:'openai'}).model,'gpt-4.1-mini');assert.equal(env.MIGHTY_AI_PROVIDER,'groq');
const request=replyRequest({...gemini,messages:[{role:'user',content:'Hello'}]},{stream:true,maxTokens:900});
assert.equal(request.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');assert.equal(request.options.headers.Authorization,'Bearer gemini-test');
assert.equal(JSON.parse(request.options.body).max_tokens,900);assert.equal(JSON.parse(request.options.body).stream,true);
assert.equal(JSON.parse(replyRequest({provider:'openai',apiKey:'test',model:'gpt-5',messages:[]}).options.body).temperature,undefined);
console.log('Per-character provider isolation, Gemini routing, streaming and speech fallback passed.');

for (const voice of ['zh-CN-liaoning-XiaobeiNeural','iu-Latn-CA-SiqiniqNeural','en-US-AvaMultilingualNeural']) assert.equal(voiceSettings({ttsProvider:'edge',voice}).voice,voice);
for (const voice of ['en-US-bad;echo', '../voice', '--help']) assert.equal(voiceSettings({ttsProvider:'edge',voice}).voice,'en-US-AvaMultilingualNeural');
console.log('Regional and script-specific Edge voices preserve their selected IDs.');
