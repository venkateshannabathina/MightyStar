'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const {DatabaseSync}=require('node:sqlite');
const WebSocket=require('../../Backend/vendor/ws');
const app=path.resolve(__dirname,'../..');
async function run(stream,memory){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-stream-'));
 const child=spawn(process.execPath,['-r',path.join(app,'tests/streaming/mock-provider.cjs'),path.join(app,'Sources/companion-server.cjs')],{env:{...process.env,MIGHTY_STREAM_CHAT:stream?'1':'0',MIGHTY_MEMORY_V1:memory?'1':'0',MIGHTY_MEMORY_ROOT:path.join(dir,'memory'),GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq'},stdio:['pipe','pipe','pipe']});
 const deadline=setTimeout(()=>child.kill(),30000);let socket;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='';child.stdout.on('data',bytes=>{text+=bytes;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});child.once('exit',()=>reject(Error('Backend stopped before readiness.')));});
  const request=(route,body,auth=true)=>fetch(`http://127.0.0.1:${ready.port}${route}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Mighty-Token':ready.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const status=await(await request('/api/status')).json();assert.equal(status.streamChat,stream);
  const character={id:'c',name:'Mira',description:'An opinionated friend.',profile:{aiProvider:'groq',aiModel:'openai/gpt-oss-20b'}};
  if(memory)assert.equal((await request('/api/memory/characters',{character})).status,200);
  const body=memory?{characterId:'c',clientTurnId:'one',userMessage:'Hey'}:{character,messages:[{role:'user',content:'Hey'}]};
  assert.equal((await request('/api/chat',body,false)).status,401);
  const response=await request('/api/chat',body);
  assert.equal(response.headers.get('access-control-allow-origin'),'null','file-backed native UI must be allowed to read replies');
  assert.equal(response.headers.get('vary'),'Origin');
  assert.match(response.headers.get('access-control-allow-headers'),/X-Mighty-Token/);
  if(!stream){assert.match(response.headers.get('content-type'),/application\/json/);assert.equal((await response.json()).reply,'A quiet cup sounds good.');return;}
  assert.match(response.headers.get('content-type'),/application\/x-ndjson/);
  const events=(await response.text()).trim().split('\n').map(JSON.parse),complete=events.at(-1);
  assert.equal(complete.type,'response.complete');assert.equal(complete.reply,' Rude.  You love me.');
  assert.deepEqual(events.filter(e=>e.type==='sentence.start').map(e=>e.e),['amused','happy']);
  assert(!JSON.stringify(events).includes('[['));
  if(memory){
   assert.equal((await(await request('/api/chat',body)).json()).reply,complete.reply);
   const db=new DatabaseSync(path.join(dir,'memory/memory.sqlite'),{readOnly:true});
   const row=db.prepare("SELECT content,meta FROM turns WHERE role='assistant'").get();assert(!row.content.includes('[['));assert.equal(JSON.parse(row.meta).sentenceEvents.length,2);db.close();
   const failed=await(await request('/api/chat',{...body,clientTurnId:'failure',userMessage:'FAIL'})).text();assert.match(failed,/response.error/);
   const next=await(await request('/api/chat',{...body,clientTurnId:'after-failure'})).text();assert.match(next,/response.complete/);
  }
  socket=new WebSocket(`ws://127.0.0.1:${ready.port}/api/call`,{headers:{'X-Mighty-Token':ready.token}});await once(socket,'open');
  let sequence=0;const identity={sessionId:'test',characterId:'c',generation:0,turnId:'call-one'};
  const send=(type,fields={})=>socket.send(JSON.stringify({version:2,type,eventId:'e'+sequence,sequence:sequence++,identity,...fields}));
  const readyCall=once(socket,'message');send('session.open',memory?{characterId:'c'}:{character});assert.equal(JSON.parse((await readyCall)[0]).type,'session.ready');
  const callEvents=[];
  const completed=new Promise((resolve,reject)=>socket.on('message',bytes=>{const e=JSON.parse(bytes);callEvents.push(e);if(e.type==='speech.chunk.ready'){assert(!e.text.includes('[['));send('playback.progress',{chunkIndex:e.index});}if(e.type==='speech.audio.complete')resolve();if(e.type==='response.error')reject(Error(e.error));}));
  send('turn.text',memory?{characterId:'c',clientTurnId:'call-one',userMessage:'Hey'}:{text:'Hey'});await completed;
  assert.equal(callEvents.filter(e=>e.type==='sentence.start').length,2);assert(!callEvents.find(e=>e.type==='response.complete').text.includes('[['));
 }finally{
  if(socket){socket.close();await once(socket,'close').catch(()=>{});}
  clearTimeout(deadline);if(child.exitCode===null){const exit=once(child,'exit');child.stdin.end();await exit;}fs.rmSync(dir,{recursive:true,force:true});
 }
}
(async()=>{await run(false,false);await run(true,false);await run(true,true);console.log('Streaming routes: auth, flag discovery, legacy JSON, NDJSON, memory combinations/retries/meta, provider failure recovery and WebSocket clean speech passed');})().catch(e=>{console.error(e);process.exitCode=1});
