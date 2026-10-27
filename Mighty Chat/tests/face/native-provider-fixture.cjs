'use strict';
require('../streaming/mock-provider.cjs');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),original=globalThis.fetch;
globalThis.fetch=(url,options)=>String(url).endsWith('/audio/transcriptions')?Promise.resolve(new Response(JSON.stringify({text:'Hello there.'}),{status:200})):original(url,options);
const{EdgeTTS}=require('../../Backend/providers/EdgeTTS.cjs');
EdgeTTS.prototype.warmup=function(){}; // Offline fixture must never open a provider connection.
let fixtureSyntheses=0;
EdgeTTS.prototype.synthesize=function(options){const audioId=crypto.randomUUID();fs.copyFileSync(path.resolve(__dirname,'../fixtures/hello-there.mp3'),path.join(this.audioRoot,audioId+'.mp3'));const result={audioId,durationSeconds:.936,quality:'fixture-word-boundaries',words:[{start:0,end:.8,text:options.text}],mouthCues:[{start:0,end:.9,pose:'a'}]};const delay=process.env.MIGHTY_TEST_FILLER_FIRST_ONLY==='1' && fixtureSyntheses++>0 ? 0 : Number(process.env.MIGHTY_TEST_FILLER_DELAY)||0;return delay ? new Promise(resolve=>setTimeout(()=>resolve(result),delay)) : Promise.resolve(result);};
