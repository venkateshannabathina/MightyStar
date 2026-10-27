'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');
(async()=>{
 const root=fs.mkdtempSync('/private/tmp/mighty-recall-fallback-'),old=process.env.MIGHTY_STREAM_CHAT;
 process.env.MIGHTY_STREAM_CHAT='1';
 const store=new MemoryStore({root}),v=new Float32Array(384);v[0]=1;
 const memory=new MemoryService({store,embeddings:{embed:()=>new Promise(r=>setTimeout(()=>r(v),65)),close(){}},generate:async()=>'{"card":"A friendly character."}'});
 try{
  let seed=0;const id='recall',add=(input,text,importance)=>{const client='seed-'+seed++;const t=store.begin(id,client,'seed',input);store.finish(id,client,{reply:'Okay.'});const unique=new Float32Array(384);unique[seed]=1;return store.insertFact(id,text,importance,unique,t.userTurn);};
  await memory.saveCharacter({id,name:'Recall',profile:{}});
  const bike=add('Please remember: my imaginary bicycle is cobalt blue.','User has an imaginary bicycle that is cobalt blue.',1);
  add('For six short checks, reply only with the number. What is two plus two?','User asked what is two plus two.',5);
  add('No preferences or pets in this reply. I won a contest!','User has no preferences or pets.',5);
  for(let i=0;i<6;i++)add('What is '+i+' plus one?','User asks an arithmetic question '+i,5);
  assert.equal(store.publicFacts(id).length,9,'existing records are preserved');
  assert.deepEqual(store.recallFacts(id).map(f=>f.id),[bike],'questions and transient source claims cannot become core or semantic facts');
  assert.deepEqual(store.lexicalRecall(id,'The short checks are finished. What color is my imaginary bicycle?').map(f=>f.id),[bike]);
  assert.equal(store.lexicalRecall('other','What color is my bicycle?').length,0);
  const ctx=await memory.prepare({characterId:id,clientTurnId:'first-cold',userMessage:'What color is my imaginary bicycle?'});
  assert.equal(ctx.retrievalTimedOut,true,'slow semantic work still obeys the 20 ms cutoff');
  assert(ctx.messages[1].content.includes('cobalt blue'),'literal recall survives a cold/late semantic worker');
  assert(!ctx.messages[1].content.includes('two plus two'),'pollution is not core context');memory.fail(ctx);
  await memory.editFact(id,bike,'The user collects antique maps.');
  assert.equal(store.recallFacts(id)[0].text,'The user collects antique maps.','explicit user edits are authoritative even when unrelated to the original source');
  memory.deleteFact(id,bike);assert.equal(store.lexicalRecall(id,'antique maps').length,0,'delete is immediately reflected without a stale cache');
  const secret=await memory.prepare({characterId:id,clientTurnId:'private',userMessage:'Keep this private: what color is my bicycle?'});assert(!secret.messages[1].content.includes('Relevant user memories'));memory.fail(secret);
  await new Promise(r=>setTimeout(r,75));
  console.log('Memory recall: first-turn lexical fallback under semantic timeout, source-grounded core/ranking, preserved rows, isolation, explicit edits, deletion and private-turn bypass passed');
 }finally{await memory.close();if(old===undefined)delete process.env.MIGHTY_STREAM_CHAT;else process.env.MIGHTY_STREAM_CHAT=old;fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
