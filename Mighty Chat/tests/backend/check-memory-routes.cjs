'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');const {once}=require('node:events');
const app=path.resolve(__dirname,'../..');
async function run(enabled){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-memory-routes-')),trace=path.join(directory,'trace.jsonl');
 const processChild=spawn(process.execPath,['-r',path.join(app,'tests/memory/mock-provider.cjs'),path.join(app,'Sources/companion-server.cjs')],{env:{...process.env,MIGHTY_MEMORY_V1:enabled?'1':'0',MIGHTY_MEMORY_ROOT:path.join(directory,'memory'),GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq',MIGHTY_TEST_TRACE:trace},stdio:['pipe','pipe','pipe']});
 const deadline=setTimeout(()=>processChild.kill(),30000);
 try{
  const ready=await new Promise((resolve,reject)=>{let text='';processChild.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});processChild.once('exit',()=>reject(Error('Backend stopped before readiness.')));});
  const api=async(route,body,auth=true)=>{const response=await fetch(`http://127.0.0.1:${ready.port}${route}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Mighty-Token':ready.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,value:await response.json()};};
  assert.equal((await api('/api/memory/facts?characterId=c',undefined,false)).status,401);
  if(!enabled){assert.equal((await api('/api/memory/facts?characterId=c')).status,404);assert(!fs.existsSync(path.join(directory,'memory')));return;}
  const character={id:'c',name:'Mira',description:'A thoughtful friend.',profile:{aiProvider:'groq',aiModel:'openai/gpt-oss-20b',examples:'User: Hello. Mira: Hey, you.'}};
  const save=await api('/api/memory/characters',{character});assert.equal(save.status,200);assert(save.value.card.includes(character.profile.examples));
  assert.equal((await api('/api/memory/characters',{character})).status,200);
  let calls=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.length,1);
  const body={characterId:'c',userMessage:'I prefer green tea.',clientTurnId:'one'};
  const result=await api('/api/chat',body);assert.equal(result.status,200);assert.equal(result.value.mood,'happy');
  assert.deepEqual((await api('/api/chat',body)).value,result.value,'identical client turn reuses saved response');
  let facts=[];for(let i=0;i<100;i++){facts=(await api('/api/memory/facts?characterId=c')).value.facts;if(facts.length)break;await new Promise(resolve=>setTimeout(resolve,20));}
  assert.equal(facts.length,1);const factId=facts[0].id;
  assert.equal((await api('/api/memory/edit',{characterId:'c',factId,text:'The user prefers coffee.'})).status,200);
  assert.equal((await api('/api/memory/export?characterId=c')).value.facts[0].text,'The user prefers coffee.');
  assert.equal((await api('/api/memory/delete',{characterId:'other',factId})).status,404);
  assert.equal((await api('/api/memory/delete',{characterId:'c',factId})).status,200);
  assert.equal((await api('/api/memory/facts?characterId=c')).value.facts.length,0);
  assert.equal((await api('/api/memory/edit',{characterId:'c',factId,text:'password: unsafe-fixture'})).status,400);
  assert.equal((await api('/api/memory/forget',{characterId:'c'})).status,200);
  try{assert.equal((await api('/api/chat',{...body,clientTurnId:'oversize',userMessage:'x'.repeat(9000)})).status,413);}catch(error){assert.match(error.message,/fetch failed/,'existing body cap closes an oversized upload');}
  const WebSocket=require('../../Backend/vendor/ws');
  const socket=new WebSocket(`ws://127.0.0.1:${ready.port}/api/call`,{headers:{'X-Mighty-Token':ready.token}});
  await once(socket,'open');let sequence=0;
  const identity={sessionId:'memory-test',characterId:'c',generation:0,turnId:'call-one'};
  const send=(type,fields={})=>socket.send(JSON.stringify({version:2,type,eventId:'e'+sequence,sequence:sequence++,identity,...fields}));
  const next=()=>new Promise(resolve=>socket.once('message',bytes=>resolve(JSON.parse(bytes))));
  let waiting=next();send('session.open',{characterId:'c'});assert.equal((await waiting).type,'session.ready');
  const completed=new Promise((resolve,reject)=>{socket.on('message',bytes=>{const message=JSON.parse(bytes);if(message.type==='speech.chunk.ready')send('playback.progress',{chunkIndex:message.index});if(message.type==='response.complete')resolve(message);if(message.type==='response.error'&&message.stage!=='speech')reject(Error(message.error));});});
  send('turn.text',{characterId:'c',clientTurnId:'call-one',userMessage:'I prefer green tea.',history:[{role:'user',content:'CLIENT HISTORY MUST NOT ENTER CONTEXT'}]});
  assert.equal((await completed).text,'A quiet cup sounds good.');socket.close();await once(socket,'close');
  calls=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.filter(c=>c.messages[0].content.includes('persona card')).length,1);
  assert(!JSON.stringify(calls).includes('CLIENT HISTORY MUST NOT ENTER CONTEXT'));
 }finally{clearTimeout(deadline);if(processChild.exitCode===null){const exit=once(processChild,'exit');processChild.stdin.end();await exit;}fs.rmSync(directory,{recursive:true,force:true});}
}
(async()=>{await run(false);await run(true);console.log('Memory routes: default-off/no database, authentication, profile cache, compact chat, idempotency, CRUD/export, isolation and payload cap passed');})().catch(error=>{console.error(error);process.exitCode=1});
