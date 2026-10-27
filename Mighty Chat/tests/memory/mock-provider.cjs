'use strict';
const fs=require('node:fs');
const {EdgeTTS}=require('../../Backend/providers/EdgeTTS.cjs');
EdgeTTS.prototype.synthesize=function(options){options.onFirstByte?.();return Promise.resolve({audioId:require('node:crypto').randomUUID(),durationSeconds:1,quality:'audio-only',mouthCues:[]});};
globalThis.fetch=async(url,options)=>{
 if(!String(url).startsWith('https://api.groq.com/'))throw Error('Offline fixture rejected network access.');
 const body=JSON.parse(options.body),system=body.messages[0].content;
 if(process.env.MIGHTY_TEST_TRACE)fs.appendFileSync(process.env.MIGHTY_TEST_TRACE,JSON.stringify({messages:body.messages})+'\n');
 let value;
 if(system.includes('persona card'))value={card:'Mira is a warm friend. User: Hey. Mira: Good to see you.'};
 else if(system.includes('Extract only'))value={facts:[{text:'The user prefers green tea.',evidence:'I prefer green tea.',importance:4}],mood:'happy'};
 else if(system.includes('Summarize'))value={summary:'The user prefers green tea.'};
 else value={reply:'A quiet cup sounds good.',mood:'happy',intensity:0.3};
 if(body.stream){const text='A quiet cup sounds good.';return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\n\ndata: [DONE]\n\n'));c.close();}}),{status:200});}
 return new Response(JSON.stringify({model:'fixture-model',choices:[{message:{content:JSON.stringify(value)}}]}),{status:200,headers:{'Content-Type':'application/json'}});
};
