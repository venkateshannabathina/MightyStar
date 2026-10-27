'use strict';
require('../memory/mock-provider.cjs');
const fallback=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body);
 if(!body.messages?.[0]?.content?.startsWith('You are an emotion appraisal engine'))return fallback(url,options);
 require('node:fs').appendFileSync(process.env.MIGHTY_TEST_TRACE,JSON.stringify({appraisal:body.messages,temperature:body.temperature})+'\n');
 const input=body.messages.at(-1).content;
 const result=input==='you are useless'?{valence:-.9,arousal:.9,type:'insult',severity:.9,sincere:true,summary:'called her useless'}:
  input==='sorry'?{valence:.2,arousal:0,type:'apology',severity:0,sincere:true,summary:'apologized for the insult'}:
  input==='you look sweet'?{valence:.8,arousal:.3,type:'compliment',severity:0,sincere:true,summary:'complimented her appearance'}:
  input==='a friendly joke'?{valence:.7,arousal:.3,type:'joke',severity:0,sincere:true,summary:'shared a friendly joke'}:
  {valence:0,arousal:0,type:'neutral',severity:0,sincere:true,summary:''};
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200});
};
