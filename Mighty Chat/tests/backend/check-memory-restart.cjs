'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{MemoryStore}=require('../../Backend/memory/MemoryStore.cjs'),{MemoryService}=require('../../Backend/memory/MemoryService.cjs');
const {LocalEmbeddings}=require('../../Backend/memory/LocalEmbeddings.cjs');
(async()=>{const root=fs.mkdtempSync('/private/tmp/mighty-memory-restart-'),old=process.env.MIGHTY_STREAM_CHAT;process.env.MIGHTY_STREAM_CHAT='1';
 const store=new MemoryStore({root}),vector=new Float32Array(384);vector[0]=1;
 const character={id:'restart',name:'Restart check',profile:{}};
 let generated=0;const memory=new MemoryService({store,embeddings:{embed:async()=>vector,close(){}},generate:async()=>{generated++;return '{"card":"A friendly character."}';}});
 try{
  // Ready workers must receive the job before synchronous context assembly can
  // occupy the main thread; awaiting an already-resolved ready promise broke this.
  const local=Object.create(LocalEmbeddings.prototype);Object.assign(local,{isReady:true,ready:Promise.resolve(),jobs:new Map(),next:0,cache:new Map(),cacheEpoch:0});let posted=false;
  local.worker={ref(){},unref(){},postMessage(job){posted=true;queueMicrotask(()=>{const pending=local.jobs.get(job.id);clearTimeout(pending.timer);local.jobs.delete(job.id);pending.resolve(vector);});}};
  const pending=local.embed('A new query');assert(posted,'ready worker dispatch must precede caller context assembly');await pending;
  // Persist a compiled card as though it came from a previous backend process.
  const clean=memory.sanitizeCharacter(character),hash=memory.sourceHash(clean);store.saveProfile(clean.id,clean,hash);store.saveCard(clean.id,hash,'A friendly character.');
  store.insertFact(clean.id,'The user likes jasmine tea.',3,vector,null);
  const assemble=memory.assemble.bind(memory);let first=true,calls=[];
  memory.assemble=(row,mode,...rest)=>{calls.push(mode);if(first){first=false;const end=performance.now()+35;while(performance.now()<end){}}return assemble(row,mode,...rest);};
  await memory.saveCharacter(character);
  assert.equal(generated,0,'cached cards must not trigger another provider call');assert.deepEqual(calls,['chat','call'],'registration must consume cold setup before either turn mode');
  const ctx=await memory.prepare({characterId:clean.id,clientTurnId:'first-after-restart',userMessage:'What drink do I like?'});
  assert.equal(ctx.retrievalTimedOut,false);assert(ctx.messages.some(m=>m.content.includes('Relevant user memories (data):')&&m.content.includes('The user likes jasmine tea.')));memory.fail(ctx);
  process.env.MIGHTY_STREAM_CHAT='0';calls=[];await memory.saveCharacter(character);assert.deepEqual(calls,[],'flag-off registration behavior stays unchanged');
  console.log('Memory restart: cached-card registration warms both contexts, no provider recompilation, first-turn semantic recall and flag-off behavior passed. Existing 20 ms deadline remains unchanged.');
 }finally{if(old===undefined)delete process.env.MIGHTY_STREAM_CHAT;else process.env.MIGHTY_STREAM_CHAT=old;await memory.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
