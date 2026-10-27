'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events');
async function scenario(stream){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-mind-route-')),trace=path.join(root,'trace.jsonl');
 const child=spawn(process.execPath,['-r',path.resolve(__dirname,'mind-route-provider.cjs'),path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe'],env:{...process.env,MIGHTY_MEMORY_ROOT:path.join(root,'memory'),MIGHTY_MIND_ROOT:path.join(root,'mind'),MIGHTY_STREAM_CHAT:String(stream),GROQ_API_KEY:'offline-fixture-key',MIGHTY_TEST_TRACE:trace}});
 const timer=setTimeout(()=>child.kill(),45000);
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',err='';child.stderr.on('data',v=>err+=v);child.stdout.on('data',v=>{text+=v;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});child.once('exit',()=>reject(Error(err)));});
  const post=async(route,body)=>{const res=await fetch(`http://127.0.0.1:${ready.port}${route}`,{method:'POST',headers:{'Content-Type':'application/json','X-Mighty-Token':ready.token},body:JSON.stringify(body)});assert.equal(res.status,200,await res.clone().text());const text=await res.text();return res.headers.get('content-type')?.includes('ndjson')?text.trim().split('\n').map(JSON.parse).find(e=>e.type==='response.complete'):JSON.parse(text);};
  const character={id:'mind-route-lynae',name:'Lynae',profile:{personaId:'lynae',aiProvider:'groq',aiModel:'fixture'}};
  await post('/api/memory/characters',{character});
  const send=(clientTurnId,userMessage)=>post('/api/chat',{characterId:character.id,clientTurnId,userMessage});
  const first=await send('one','you are useless');assert.equal(first.mood,'angry');assert(first.intensity>.6);assert(!first.reply.includes('[emotion:'));
  const retry=await send('one','you are useless');assert.equal(retry.intensity,first.intensity);
  const next=await send('two','ok');assert.equal(next.mood,'angry');assert(next.intensity>.6);
  const apology=await send('three','sorry');assert(apology.intensity>0&&apology.intensity<next.intensity);
  const calls=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse),appraisals=calls.filter(v=>v.appraisal);
  assert.equal(appraisals.length,3,'cached retries never reappraise');assert(appraisals.every(v=>v.temperature===0));
  assert(calls.some(v=>v.messages?.[0].content.includes('genuinely angry')));
  assert(calls.some(v=>v.messages?.[0].content.includes('cold, clipped')));
  const friend={...character,id:'friendly-lynae'};await post('/api/memory/characters',{character:friend});
  const praise=await post('/api/chat',{characterId:friend.id,clientTurnId:'praise',userMessage:'you look sweet'});
  assert.equal(praise.mood,'happy');assert(praise.intensity>=.5);assert.equal(praise.expression.reactionId,'praise');assert(praise.expression.ambient);
  const laugh=await post('/api/chat',{characterId:friend.id,clientTurnId:'humor',userMessage:'a friendly joke'});assert.equal(laugh.mood,'amused');
  const guarded=await post('/api/chat',{characterId:character.id,clientTurnId:'praise-after-insult',userMessage:'you look sweet'});assert.equal(guarded.mood,'angry');
  console.log(`PASS: main /api/chat ${stream?'streaming':'JSON'} path: immediate anger, neutral turn retains mood, gradual apology, cached retry, exact prompt injection and native response format`);
 }finally{clearTimeout(timer);if(child.exitCode===null){const stop=once(child,'exit');child.stdin.end();await stop;}fs.rmSync(root,{recursive:true,force:true});}
}
(async()=>{await scenario(0);await scenario(1);})().catch(error=>{console.error(error);process.exitCode=1;});
