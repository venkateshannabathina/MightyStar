'use strict';
require('../memory/mock-provider.cjs');
const original=globalThis.fetch;
const {EdgeTTS}=require('../../Backend/providers/EdgeTTS.cjs');
const synthesize=EdgeTTS.prototype.synthesize;
EdgeTTS.prototype.synthesize=function(options){if(options.text.includes('[['))throw Error('Directive reached TTS.');return synthesize.call(this,options);};
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body);
 if(!body.stream)return original(url,options);
 if(!String(url).startsWith('https://api.groq.com/'))throw Error('Offline fixture rejected network.');
 if(!body.messages[0].content.includes('EVERY sentence'))return original(url,options);
 if(body.messages.filter(m=>m.role==='user').at(-1)?.content==='FAIL')return new Response('{}',{status:503});
 const text='[[e=amused i=.6 g=talking]] Rude. [[e=happy i=.3 g=-]] You love me.';
 return new Response(new ReadableStream({start(c){
  for(const char of text)c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:char}}]})+'\n\n'));
  c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));c.close();
 }}),{status:200});
};
