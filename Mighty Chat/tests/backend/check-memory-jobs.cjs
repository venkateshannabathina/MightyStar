'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-memory-jobs-')),store=new MemoryStore({root});let summaries=0,extractions=0,blocked,rejectBlocked;
 const embedding=new Float32Array(384);embedding[0]=1;
 const memory=new MemoryService({store,embeddings:{embed:async()=>embedding.slice(),close(){},clear(){}},generate:async(_config,messages)=>{
  if(messages[0].content.includes('persona card'))return JSON.stringify({card:'A friend.'});
  if(messages[0].content.includes('Summarize')){summaries++;return JSON.stringify({summary:'Useful detail '.repeat(200)});}
  extractions++;if(blocked){blocked=false;return new Promise((_,reject)=>rejectBlocked=reject);}
  return JSON.stringify({facts:[],mood:'happy'});
 }});
 try{
  await memory.saveCharacter({id:'c',name:'Mira',profile:{}});
  for(let i=1;i<=10;i++){const ctx=await memory.prepare({characterId:'c',clientTurnId:'t'+i,userMessage:'Hello '+i});memory.finish(ctx,{reply:'Hi'});memory.afterReply(ctx,{reply:'Hi'});await memory.drain();}
  assert.equal(extractions,10);assert.equal(summaries,1);assert.equal(store.state('c').summarized_upto,20);assert(store.state('c').summary.split(/\s+/).length<=120);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM turns').get().n,20,'summary folding keeps stored turns');
  blocked=true;const ctx=await memory.prepare({characterId:'c',clientTurnId:'delayed',userMessage:'Hello'});const result=memory.finish(ctx,{reply:'Available immediately'});memory.afterReply(ctx,result);
  assert.equal(result.reply,'Available immediately');while(!rejectBlocked)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(store.db.prepare("SELECT status FROM requests WHERE client_id='delayed'").get().status,'complete');rejectBlocked(Error('Model failed after response'));await memory.drain();assert.equal(memory.failures.extraction,1);
  console.log('Memory jobs: ten-turn cadence, bounded rolling summary, fold watermark/no deletion and delayed-extraction failure isolation passed');
 }finally{await memory.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
