'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {streamReply,replyLimit,fallbackProfiles}=require('../../Backend/providers/ReplyStream.cjs');
const {streamGroq}=require('../../Backend/providers/GroqLLM.cjs');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');
const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');
const env={MIGHTY_STREAM_CHAT:'1',OPENAI_API_KEY:'fixture-key',GEMINI_API_KEY:'fixture-key'};
const options={provider:'groq',apiKey:'fixture-key',model:'test',messages:[]};
const profile={aiFallbackProviders:['invalid','gemini','openai']};
const collect=async source=>{const out=[];for await(const s of source)out.push(s);return out;};
(async()=>{
 assert.deepEqual(fallbackProfiles(null),[]);assert.equal(replyLimit(null,'call'),220);
 assert.equal(replyLimit({},'call'),220);assert.equal(replyLimit(),300);assert.equal(replyLimit({},'call',{provider:'groq',model:'openai/gpt-oss-20b'}),900);assert.equal(replyLimit({callMaxTokens:9999},'call'),1200);
 for(const failure of ['connect','5xx','timeout']){
  const attempts=[];
  const stream=async function*(o){attempts.push(o);if(o.provider==='groq'){
   if(failure==='timeout')await new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
   throw Object.assign(Error(),{retryable:true});
  }yield 'Fallback';yield ' only.';};
  assert.deepEqual(await collect(streamReply(options,{profile,env,stream,mode:'call',firstTokenMs:15})),['Fallback',' only.']);
  assert.deepEqual(attempts.map(o=>o.provider),['groq','gemini']);assert(attempts.every(o=>o.maxTokens===220&&o.signal.aborted));
 }
 for(const committed of [true,false]){
  let n=0;const stream=async function*(){n++;if(committed)yield '[[e=';throw Object.assign(Error('failure'),{retryable:committed});};
  await assert.rejects(collect(streamReply(options,{profile,env,stream})));assert.equal(n,1,'no retry after any token or 4xx');
 }
 const abort=new AbortController();let attempts=0;
 await assert.rejects(collect(streamReply({...options,signal:abort.signal},{profile,env,stream:async function*(){attempts++;abort.abort();throw Object.assign(Error(),{retryable:true});}})));assert.equal(attempts,1);
 let attempts2=0;await assert.rejects(collect(streamReply(options,{profile,env,stream:async function*(){attempts2++;throw Object.assign(Error(),{retryable:true});}})));assert.equal(attempts2,2);
 let legacy;await collect(streamReply(options,{env:{},stream:async function*(o){legacy=o;yield 'old';}}));assert.equal(legacy.maxTokens,undefined);
 for(const status of [401,429,500,503]){
  let cancelled=false;
  await assert.rejects(collect(streamGroq({...options,fetchImpl:async()=>({ok:false,status,body:{cancel:async()=>{cancelled=true;}}})})),e=>e.retryable===(status>=500));assert(cancelled);
 }
 await assert.rejects(collect(streamGroq({...options,fetchImpl:async()=>{throw Error('connect');}})),e=>e.retryable===true);
 const {replyRequest}=require('../../Backend/providers/ReplyRequest.cjs');
 for(const provider of ['groq','openai','gemini']){
  const body=JSON.parse(replyRequest({provider,apiKey:'fixture',model:'openai/gpt-oss-20b',messages:[]},{stream:true,maxTokens:900,reasoningEffort:'low'}).options.body);
  assert.equal(body.reasoning_effort,provider==='groq'?'low':undefined);
 }
 await assert.rejects(collect(streamGroq({...options,fetchImpl:async()=>({ok:true,body:new ReadableStream({start(c){c.error(new TypeError('Disconnected'));}})})})),e=>e.retryable===true);
 // Built-in fetch pooling is the production transport; verify actual TCP reuse.
 const sockets=new Set();const server=http.createServer((req,res)=>{sockets.add(req.socket);req.resume();req.on('end',()=>res.end('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n'));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(let i=0;i<5;i++){await collect(streamGroq({...options,fetchImpl:(_url,init)=>fetch(`http://127.0.0.1:${server.address().port}`,init)}));await new Promise(r=>setTimeout(r,5));}assert.equal(sockets.size,1);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 // Retrieval deadline, hot hit, flag-off waiting, late result after forget/close.
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-wp7-memory-'));const store=new MemoryStore({root});
 let resolveEmbedding;const vector=new Float32Array(384);vector[0]=1;
 const memory=new MemoryService({store,embeddings:{embed:()=>new Promise(r=>resolveEmbedding=r),close(){}},generate:async()=>'{"card":"A friend"}'});
 const old=process.env.MIGHTY_STREAM_CHAT;process.env.MIGHTY_STREAM_CHAT='1';
 try{
  const sanitized=memory.sanitizeCharacter({id:'sanitized',profile:{aiFallbackProviders:[{aiProvider:'openai',aiModel:'password: synthetic-marker',apiKey:'forbidden-fixture'}]}});
  assert(!JSON.stringify(sanitized).includes('synthetic-marker'));assert(!JSON.stringify(sanitized).includes('forbidden-fixture'));
  await memory.saveCharacter({id:'wp7',name:'Mira',profile:{aiFallbackProviders:['openai'],callMaxTokens:250}});
  let retrieval=0;const original=store.retrieve.bind(store);store.retrieve=(...args)=>{retrieval++;return original(...args);};
  const start=performance.now();let ctx,receipt;
  const debugBefore=process.env.MIGHTY_DEBUG_PERF,errorBefore=console.error;
  try{process.env.MIGHTY_DEBUG_PERF='1';console.error=line=>{receipt=JSON.parse(line);};ctx=await memory.prepare({characterId:'wp7',clientTurnId:'slow',userMessage:'Hi'});}
  finally{console.error=errorBefore;if(debugBefore===undefined)delete process.env.MIGHTY_DEBUG_PERF;else process.env.MIGHTY_DEBUG_PERF=debugBefore;}
  assert.deepEqual(receipt,{event:'memory_retrieval_timeout',characterId:'wp7',clientTurnId:'slow',budgetMs:20});
  assert(ctx.retrievalTimedOut);assert(performance.now()-start<150);memory.fail(ctx);
  memory.forget('wp7');resolveEmbedding(vector);await new Promise(r=>setImmediate(r));assert.equal(retrieval,0,'late embedding epoch fenced');
  memory.embeddings.embed=async()=>vector;
  const hit=await memory.prepare({characterId:'wp7',clientTurnId:'hot',userMessage:'Hi'});assert.equal(hit.retrievalTimedOut,false);assert.equal(retrieval,1);memory.fail(hit);
  const assemble=memory.assemble.bind(memory);memory.assemble=(...args)=>{const until=performance.now()+25;while(performance.now()<until){}return assemble(...args);};
  const before=retrieval;const expiredSetup=await memory.prepare({characterId:'wp7',clientTurnId:'setup',userMessage:'Hello'});
  assert(expiredSetup.retrievalTimedOut);assert.equal(retrieval,before,'do not begin a database retrieval after setup consumed the deadline');memory.fail(expiredSetup);memory.assemble=assemble;
  process.env.MIGHTY_STREAM_CHAT='0';memory.embeddings.embed=()=>new Promise(r=>resolveEmbedding=r);
  let finished=false;const waiting=memory.prepare({characterId:'wp7',clientTurnId:'legacy',userMessage:'Hi'}).then(c=>{finished=true;return c;});await new Promise(r=>setTimeout(r,35));assert.equal(finished,false);resolveEmbedding(vector);memory.fail(await waiting);
 }finally{if(old===undefined)delete process.env.MIGHTY_STREAM_CHAT;else process.env.MIGHTY_STREAM_CHAT=old;await memory.close();fs.rmSync(root,{recursive:true,force:true});}
 // Learning must not enter the response path, including a permanently blocked job.
 const {ConversationSession}=require('../../Backend/call/ConversationSession.cjs');
 const order=[];const context={messages:[{role:'user',content:'Hi'}],character:{profile:{}}};
 const mem={prepare:async()=>context,finish:()=>order.push('saved'),afterReply:()=>order.push('learn'),fail(){}};
 const session=new ConversationSession({character:{},apiKey:'fixture',memory:mem,stream:async function*(){yield 'Hello there, welcome back.';},send:type=>order.push(type)});
 await session.turn({sessionId:'s',characterId:'c',turnId:'t',generation:0},'Hi',[]);
 assert(order.indexOf('learn')>order.indexOf('response.complete'));
 console.log('WP7: retry/timeout/no mixing/cancel, limits, socket reuse and memory deadline/late fencing passed');
})().catch(e=>{console.error(e);process.exitCode=1});
