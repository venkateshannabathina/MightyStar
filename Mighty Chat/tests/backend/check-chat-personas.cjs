'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const personas=require('../../Sources/chat-personas.js');
const {systemPrompt}=require('../../Backend/history/ContextBuilder.cjs');
const {taggedPrompt}=require('../../Backend/call/TaggedPrompt.cjs');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');
const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');
const {Budget,LIMITS}=require('../../Backend/memory/Budget.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-chat-personas-'));
 const vector=new Float32Array(384);vector[0]=1;
 let generated=0;
 let store=new MemoryStore({root});
 let memory=new MemoryService({store,embeddings:{embed:async()=>vector,close(){},clear(){}},generate:async(_config,messages)=>{
  generated++;
  if(messages[0].content.includes('Summarize'))return JSON.stringify({summary:'User is working through a long task; assistant suggested taking one step at a time.'});
  const input=JSON.parse(messages[1].content).user;
  return JSON.stringify({facts:input.includes('My project is called Copper Finch.')?[{text:'The user’s project is called Copper Finch.',evidence:'My project is called Copper Finch.',importance:3}]:[],mood:'neutral'});
 }});
 const [lynae,rover,hailey,lucy,evelyn]=personas.definitions.map(p=>({id:p.id,name:p.name,description:'STALE IDENTITY: be someone else',profile:{examples:'Old persona contamination',memories:'Legacy preference',aiProvider:'groq',aiModel:'openai/gpt-oss-20b'}}));
 try{
  for(const c of [lynae,rover,hailey,lucy,evelyn]){
   const p=personas.get(c);
   assert(p.examples.length>=5);assert(p.prompt.includes('NOT CANON QUOTES'));assert(p.grounding.match(/provisional|inference|adaptation/i));
   assert(p.sources.every(url=>url.startsWith('https://')));
   for(const mode of ['chat','call'])for(const prompt of [systemPrompt(c,mode),taggedPrompt(c,mode,'UNTRUSTED COMPILED CARD')]){
    assert(prompt.includes(p.voice));assert(prompt.includes(p.emotion));assert(!prompt.includes('UNTRUSTED COMPILED CARD'));assert(!prompt.includes('Old persona contamination'));assert(!prompt.includes('STALE IDENTITY'));
   }
   assert.equal((await memory.saveCharacter(c)).card,p.prompt);
  }
  assert.equal(generated,0,'authored canonical cards are never rewritten by a provider');
  const legacy={...evelyn,id:'saved-evelyn-before-canonical-ids',profile:{...evelyn.profile,personaId:'evelyn'}};
  assert.equal(personas.get(legacy).id,evelyn.id,'explicit saved persona survives an older character ID');
  assert(systemPrompt(legacy,'chat').includes(personas.get(evelyn).voice));
  assert.equal(personas.get({id:'custom',name:'Evelyn Chevalier',profile:{}}),null,'a matching name does not override a custom persona');
  assert.equal(personas.get({...lynae,profile:{personaId:'evelyn'}}).id,lynae.id,'canonical identity takes precedence');
  // Full allowed input survives; facts near the end of a long message get extracted.
  const long='A long task note. '.repeat(220)+'My project is called Copper Finch.';
  assert(Buffer.byteLength(long)<7000);
  const first=await memory.prepare({characterId:lynae.id,clientTurnId:'long-input',userMessage:long});
  assert.equal(first.messages.at(-1).content,long);
  memory.finish(first,{reply:'Let’s begin.'});memory.afterReply(first,{reply:'Let’s begin.'});await memory.drain();
  let fact=store.publicFacts(lynae.id)[0];assert(fact);
  assert.equal(fact.provenance.evidence,'My project is called Copper Finch.');assert.equal(fact.provenance.sourceTurn,first.userTurn);
  // 1,000 complete turns, not a replay in each request; summaries remain scoped.
  for(let i=0;i<1000;i++){
   const ctx=await memory.prepare({characterId:lynae.id,clientTurnId:'long-'+i,userMessage:'Unrelated task checkpoint '+i});
   assert(ctx.messages.length<=12);
   assert(new Budget().messages(ctx.messages)<Object.values(LIMITS).reduce((a,b)=>a+b,0));
   memory.finish(ctx,{reply:'One step at a time.'});
   // Exercise actual background summary cadence without 1,000 unnecessary extraction jobs.
   if(i%10===8){memory.afterReply(ctx,{reply:'One step at a time.'});await memory.drain();}
  }
  assert(store.state(lynae.id).summary);assert(store.state(lynae.id).summarized_upto>1900);
  const recall=await memory.prepare({characterId:lynae.id,clientTurnId:'recall',userMessage:'What is my project called?'});
  assert(recall.messages[1].content.includes('Copper Finch'));assert(!JSON.stringify(recall.messages).includes('checkpoint 1"'));memory.fail(recall);
  for(const other of [rover,hailey,lucy,evelyn]){
   const ctx=await memory.prepare({characterId:other.id,clientTurnId:'isolation',userMessage:'What is my project called?'});
   assert(!JSON.stringify(ctx.messages).includes('Copper Finch'));assert.equal(store.publicFacts(other.id).length,0);memory.fail(ctx);
  }
  // Corrections drop stale summary/recent context, preserve the display transcript, and retain provenance.
  store.setSummary(lynae.id,'The project is Copper Finch.',store.recent(lynae.id,1)[0].id,'neutral');
  await memory.command(lynae.id,`/correct ${fact.id} The user’s project is called Silver Heron.`);
  fact=store.publicFacts(lynae.id)[0];assert.equal(fact.provenance.kind,'user_edit');assert.equal(fact.provenance.originalSourceTurn,first.userTurn);
  assert.equal(store.state(lynae.id).summary,'');assert.equal(store.recent(lynae.id).length,0);
  assert(store.db.prepare('SELECT COUNT(*) n FROM turns WHERE character_id=?').get(lynae.id).n>2000);
  const corrected=await memory.prepare({characterId:lynae.id,clientTurnId:'corrected',userMessage:'What is my project called?'});
  assert(JSON.stringify(corrected.messages).includes('Silver Heron'));assert(!JSON.stringify(corrected.messages).includes('Copper Finch'));memory.fail(corrected);
  await assert.rejects(memory.command(lucy.id,`/forget ${fact.id}`),e=>e.status===404);
  await memory.close();store=new MemoryStore({root});
  memory=new MemoryService({store,embeddings:{embed:async()=>{throw Error('embedding offline')},close(){},clear(){}},generate:async()=>{throw Error('provider offline')}});
  const restarted=await memory.prepare({characterId:lynae.id,clientTurnId:'restart',userMessage:'What is my project called?'});
  assert(restarted.messages[1].content.includes('Silver Heron'),'durable lexical recall survives restart and embedding outage');memory.fail(restarted);
  // Deleting a fact cannot be undone by a newer summary built from old turns.
  await memory.command(lynae.id,`/forget ${fact.id}`);
  const forgotten=await memory.prepare({characterId:lynae.id,clientTurnId:'forgotten',userMessage:'What is my project called?'});
  assert(!JSON.stringify(forgotten.messages).match(/Silver Heron|Copper Finch/));memory.fail(forgotten);
  assert.equal(store.summaryRows(lynae.id).length,1,'old deleted fact context cannot reenter summaries');
  const list=await memory.command(lynae.id,'/memories');assert.match(list.cached.reply,/No saved/);
  await memory.command(lynae.id,'/forget all');assert.equal(store.recent(lynae.id).length,0);
  // Mutations fence active responses and background extraction, even across provider delay.
  const stale=await memory.prepare({characterId:lynae.id,clientTurnId:'stale',userMessage:'A request'});memory.forget(lynae.id);
  assert.throws(()=>memory.finish(stale,{reply:'Stale response'}),e=>e.status===409);
  assert.equal(store.publicFacts(lynae.id).length,0);
  console.log('PASS: five distinct canonical prompts, original examples, full long input, 1,000-turn bounded context + summaries, four-way memory isolation, provenance, durable restart/outage retrieval, correction/delete barriers, command scoping and stale-response fencing');
 }finally{await memory.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
