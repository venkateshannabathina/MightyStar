'use strict';
const {parentPort} = require('node:worker_threads');
const fs = require('node:fs'), path = require('node:path');
const ort = require('../vendor/memory/node_modules/onnxruntime-node');
const root=path.join(__dirname,'models/bge-small-en-v1.5');
const tokenizer=JSON.parse(fs.readFileSync(path.join(root,'tokenizer.json'),'utf8'));
const vocab=tokenizer.model.vocab;
function ids(text) {
  const normalized=String(text).replace(/[\u0000\ufffd\p{Cc}\p{Cf}]/gu,' ').replace(/([\u4e00-\u9fff\u3400-\u4dbf])/gu,' $1 ').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu,'');
  const output=[vocab['[CLS]']];
  for (const word of normalized.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)||[]) {
    const chars=Array.from(word); let start=0, pieces=[];
    if(chars.length>100){output.push(vocab['[UNK]']);continue;}
    while(start<chars.length){let end=chars.length,token;
      for(;end>start;end--){const candidate=(start?'##':'')+chars.slice(start,end).join('');if(vocab[candidate]!==undefined){token=vocab[candidate];break;}}
      if(token===undefined){pieces=[vocab['[UNK]']];break;}pieces.push(token);start=end;
    }
    output.push(...pieces); if(output.length>=511)break;
  }
  return [...output.slice(0,511),vocab['[SEP]']];
}
(async()=>{
 const session=await ort.InferenceSession.create(path.join(root,'model_quantized.onnx'),{executionProviders:['cpu'],intraOpNumThreads:1,interOpNumThreads:1});
 async function embed(text) {
   const tokens=ids(text),shape=[1,tokens.length];const feeds={input_ids:new ort.Tensor('int64',BigInt64Array.from(tokens,BigInt),shape),attention_mask:new ort.Tensor('int64',BigInt64Array.from(tokens,()=>1n),shape),token_type_ids:new ort.Tensor('int64',new BigInt64Array(tokens.length),shape)};
   const result=await session.run(Object.fromEntries(session.inputNames.map(name=>[name,feeds[name]])));
   const data=result.last_hidden_state?.data || Object.values(result)[0].data;
   const values=Float32Array.from(data.slice(0,384));const norm=Math.sqrt(values.reduce((sum,n)=>sum+n*n,0));if(!norm||values.some(n=>!Number.isFinite(n)))throw Error();
   for(let i=0;i<384;i++)values[i]/=norm;
   return values;
 }
 // Readiness includes first inference, not just loading the model. This fixed,
 // non-user warmup stays local and is never stored as a fact or cached query.
 await embed('A brief conversation about everyday preferences and plans.');
 parentPort.postMessage({ready:true});
 let chain=Promise.resolve();
 parentPort.on('message', job=>{chain=chain.then(async()=>{
   if(job.close){await session.release();parentPort.close();return;}
   try{const values=await embed(job.text);
   parentPort.postMessage({id:job.id,values},[values.buffer]);
   }catch{parentPort.postMessage({id:job.id,error:true});}
 });});
})().catch(()=>{parentPort.postMessage({fatal:true});parentPort.close();});
