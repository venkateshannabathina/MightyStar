'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const personas=require('../../Sources/chat-personas.js');
const WebSocket=require('../../Backend/vendor/ws');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-persona-routes-')),trace=path.join(dir,'trace.jsonl');
 const env={...process.env,MIGHTY_STREAM_CHAT:'0',MIGHTY_MEMORY_ROOT:path.join(dir,'memory'),GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq',MIGHTY_TEST_TRACE:trace};delete env.MIGHTY_MEMORY_V1;
 const child=spawn(process.execPath,['-r',path.resolve(__dirname,'../memory/mock-provider.cjs'),path.resolve(__dirname,'../../Sources/companion-server.cjs')],{env,stdio:['pipe','pipe','pipe']});
 const deadline=setTimeout(()=>child.kill(),30000);let socket;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',errors='';child.stderr.on('data',b=>errors+=b);child.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});child.once('exit',()=>reject(Error('Backend stopped: '+errors)));});
  const api=async(route,body)=>{const r=await fetch(`http://127.0.0.1:${ready.port}${route}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Mighty-Token':ready.token},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,...await r.json()};};
  assert.equal((await api('/api/status')).memoryV1,true,'memory enabled without an environment opt-in');
  for(const p of personas.definitions){
   assert.equal((await api('/api/memory/characters',{character:{id:p.id,name:p.name,profile:{}}})).status,200);
   const result=await api('/api/chat',{characterId:p.id,clientTurnId:'initial',userMessage:'I prefer green tea.'});assert.equal(result.status,200);
  }
  for(let i=0;i<100;i++){if((await api('/api/memory/facts?characterId='+personas.definitions[0].id)).facts.length)break;await new Promise(r=>setTimeout(r,20));}
  const p=personas.definitions[0],fact=(await api('/api/memory/facts?characterId='+p.id)).facts[0];assert(fact.provenance.evidence);
  assert.equal((await api('/api/chat',{characterId:p.id,clientTurnId:'command',userMessage:`/correct ${fact.id} The user prefers coffee.`})).status,200);
  const exported=await api('/api/memory/export?characterId='+p.id);assert.equal(exported.facts[0].provenance.kind,'user_edit');assert.equal(exported.summary.text,'');assert(exported.summary.contextFloor>0);
  socket=new WebSocket(`ws://127.0.0.1:${ready.port}/api/call`,{headers:{'X-Mighty-Token':ready.token}});await once(socket,'open');
  let sequence=0;const identity={sessionId:'canonical-call',characterId:p.id,generation:0,turnId:'voice'};
  const send=(type,fields={})=>socket.send(JSON.stringify({version:2,type,eventId:'e'+sequence,sequence:sequence++,identity,...fields}));
  let waiting=once(socket,'message');send('session.open',{characterId:p.id});assert.equal(JSON.parse((await waiting)[0]).type,'session.ready');
  const completed=new Promise((resolve,reject)=>socket.on('message',bytes=>{const e=JSON.parse(bytes);if(e.type==='speech.chunk.ready')send('playback.progress',{chunkIndex:e.index});if(e.type==='response.complete')resolve(e);if(e.type==='response.error'&&e.stage!=='speech')reject(Error(e.error));}));
  send('turn.text',{characterId:p.id,clientTurnId:'voice',userMessage:'Hello'});assert.equal((await completed).text,'A quiet cup sounds good.');
  socket.close();await once(socket,'close');socket=null;
  const calls=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse);
  assert(!calls.some(c=>c.messages[0].content.includes('Compile the supplied')),'no model-based persona rewriting');
  for(const p of personas.definitions)assert(calls.some(c=>c.messages[0].content.includes(p.voice)));
  const call=calls.find(c=>c.messages[0].content.includes('live voice call'));assert(call);assert(!call.messages[0].content.includes('Spoken reply openings:'),'generic cached openings do not flatten character voices');
  assert.equal((await api('/api/chat',{characterId:p.id,clientTurnId:'forget',userMessage:'/forget all'})).status,200);
  assert.equal((await api('/api/memory/facts?characterId='+p.id)).facts.length,0);
  console.log('PASS: default-on memory, five canonical HTTP personas, persisted evidence/export, correction + forget commands and canonical WebSocket voice/TTS path without generic openings (offline provider and TTS fixtures)');
 }finally{clearTimeout(deadline);socket?.terminate();if(child.exitCode===null){const stopped=once(child,'exit');child.stdin.end();await stopped;}fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
