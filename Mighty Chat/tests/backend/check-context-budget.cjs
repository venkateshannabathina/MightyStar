'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');const {Budget,LIMITS}=require('../../Backend/memory/Budget.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-context-')),store=new MemoryStore({root});
 const memory=new MemoryService({store,embeddings:{embed:async()=>{throw Error('unavailable')},close(){},clear(){}},generate:async()=>{throw Error('model offline')}});
 try{
  await memory.saveCharacter({id:'c',name:'Mira',description:'A warm friend. '.repeat(1000),profile:{preferences:'Be concise. '.repeat(500),examples:'User: Hi. Mira: Hi there.\n'.repeat(100)}},{compile:false});
  store.db.exec('BEGIN');for(let i=0;i<2000;i++)store.db.prepare('INSERT INTO turns(character_id,role,content,ts,meta) VALUES(?,?,?,?,?)').run('c',i%2?'assistant':'user','Long history '.repeat(1000),0,'{}');store.db.exec('COMMIT');
  const body={characterId:'c',clientTurnId:'new',userMessage:'Hello '.repeat(500)};assert(Buffer.byteLength(JSON.stringify(body))<8192);
  const ctx=await memory.prepare(body),budget=new Budget();const total=budget.messages(ctx.messages),limit=Object.values(LIMITS).reduce((a,b)=>a+b,0);
  assert(total<=limit*1.1,`${total} exceeds ${limit*1.1}`);assert(ctx.messages.length<=12);
  assert(!JSON.stringify(ctx.messages).includes('Long history '.repeat(100)));
  store.db.prepare('UPDATE state SET summary=? WHERE character_id=?').run('Rolling summary '.repeat(1000),'c');
  const emb=new Float32Array(384);emb[0]=1;store.insertFact('c','Standing preference '.repeat(20),5,emb,1);
  const filled=memory.assemble(store.profile('c'),'chat',body.userMessage,Array.from({length:4},()=>({text:'Relevant memory '.repeat(100)})));
  const full=budget.messages(filled);assert(full<=limit*1.1,`Filled context ${full} exceeds cap`);
  const prefix=ctx.messages[0].content;memory.finish(ctx,{reply:'Hi'});
  const next=await memory.prepare({...body,clientTurnId:'next',userMessage:'Another turn'});assert.equal(next.messages[0].content,prefix,'static prefix stays byte-identical');memory.finish(next,{reply:'Okay'});
  const before=Date.now();memory.generate=async()=>{throw Error('Extraction/summary offline')};
  const test=await memory.prepare({...body,clientTurnId:'failure',userMessage:'A fact'});test.userCount=10;memory.finish(test,{reply:'Ready'});memory.afterReply(test,{reply:'Ready'});
  assert(Date.now()-before<1000,'reply finish never waits for the model');await memory.drain();assert(memory.failures.extraction>0);assert(memory.failures.summary>0);
  const unknown=new Budget({provider:'anthropic',model:'custom'});assert(unknown.count('你好')>=2);assert(unknown.count(unknown.take('你好'.repeat(100),50))<=50);
  console.log(`Context budget: 2,000 turns, compact request, ${total}/${limit} token units (filled dynamic slots ${full}), stable prefix and background-failure isolation passed`);
 }finally{await memory.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
