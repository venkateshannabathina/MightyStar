'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {OPENINGS}=require('../../Backend/call/VoiceOpenings.cjs');
const {EdgeTTS}=require('../../Backend/providers/EdgeTTS.cjs');
const continuation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/context-body.json'),'utf8'));
const text=OPENINGS.find(c=>c.id==='07').text+' '+continuation.text;
globalThis.fetch=async(url,options)=>{
 const endpoint=String(url);
 if(endpoint.endsWith('/audio/transcriptions'))return new Response(JSON.stringify({text:'Your previous answer missed the point. Explain the audio delay.'}),{status:200});
 if(endpoint.startsWith('https://api.groq.com/') && endpoint.endsWith('/chat/completions')) {
  const prompt=JSON.parse(options.body);if(!prompt.messages[0].content.includes('Spoken reply openings'))throw Error('Context prompt missing');
  return new Response(new ReadableStream({start(c){for(const char of (process.env.MIGHTY_STREAM_CHAT==='1' ? '[[e=neutral i=.2 g=-]] '+text.replace(/\. /g,'. [[e=neutral i=.2 g=-]] ') : text))c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:char}}]})+'\n\n'));c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));c.close();}}),{status:200});
 }
 throw Error('Offline fixture rejected network');
};
EdgeTTS.prototype.warmup=function(){};
EdgeTTS.prototype.synthesize=function(options){
 const cached=this.openingCache.synthesize(options);if(cached)return cached;
 if(options.text!==continuation.text)throw Error('Unexpected or repeated continuation');
 return new Promise(resolve=>setTimeout(()=>{
  const audioId=crypto.randomUUID();fs.copyFileSync(path.resolve(__dirname,'../fixtures/context-body.mp3'),path.join(this.audioRoot,audioId+'.mp3'));
  const {text,...timeline}=continuation;resolve({audioId,...timeline});
 },2200));
};
