'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {MindService}=require('../../Backend/mind/MindService.cjs');
const {ConversationSession}=require('../../Backend/call/ConversationSession.cjs');
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-mind-'));let now=100,request;
 let appraisal={valence:-.9,arousal:.8,type:'insult',severity:.9,sincere:true,summary:'called her useless'};
 const service=new MindService({root,clock:()=>now,fetchImpl:async(url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(appraisal)}}]})};}});
 const character={id:'lynae',name:'Lynae',profile:{aiProvider:'groq',aiModel:'test-model'}};
 const messages=[{role:'system',content:'Existing persona.'},{role:'user',content:'one'},{role:'assistant',content:'two'},{role:'user',content:'three'},{role:'assistant',content:'four'},{role:'user',content:'you are useless'}];
 try{
  const angry=await service.prepare({character,messages,turnId:'insult'});
  assert(angry.state.anger>.6);assert.equal(angry.nativeLabel,'angry');assert(angry.messages[0].content.includes('genuinely angry'));
  assert(angry.messages[0].content.startsWith('Existing persona.'));assert(!angry.messages[0].content.includes('[emotion:'));assert.equal(request.temperature,0);assert.deepEqual(request.messages.slice(1).map(m=>m.content),['two','three','four','you are useless']);
  assert.equal(messages[0].content,'Existing persona.','original prompt is not mutated');
  await service.appraise({...character,profile:{aiProvider:'groq',aiModel:'openai/gpt-oss-20b'}},messages);
  assert.equal(request.reasoning_effort,'low');assert.equal(request.max_completion_tokens,900,'reasoning cannot consume the entire appraisal JSON allowance');
  const retried=await service.prepare({character,messages,turnId:'insult'});assert.equal(retried.state.grudges.length,1,'same turn is appraised only once');
  assert.equal(service.result(angry,{reply:'hello',mood:'happy'}).mood,'angry');
  assert.equal(service.sentence(angry,{type:'sentence.start',e:'happy',i:1}).e,'angry');
  appraisal={valence:.2,arousal:0,type:'neutral',severity:0,sincere:true,summary:''};now+=7200;
  const restarted=new MindService({root,clock:()=>now,fetchImpl:service.fetch});
  const cold=await restarted.prepare({character,messages,turnId:'later'});assert(cold.state.anger<.12);assert(cold.state.grudges[0].weight>.3);assert(cold.messages[0].content.includes('a bit distant'));
  await restarted.finish(cold);
  const next=await restarted.prepare({character,messages,turnId:'again'});assert(next.state.grudges[0].mentioned);
  const unrelated=await restarted.prepare({character:{...character,id:'rover'},messages,turnId:'clean'});assert.equal(unrelated.state.grudges.length,0);
  service.fetch=async()=>{throw Error('offline');};now+=3;
  const neutral=await service.prepare({character:{...character,id:'failure'},messages,turnId:'bad'});assert.equal(neutral.state.anger,0);
  // Actual voice session must receive the mood context before streaming.
  const events=[];let sawMood=false;
  const voice=new ConversationSession({character,send:(type,id,fields)=>events.push({type,...fields}),apiKey:'test',model:'test',mind:restarted,
   stream:async function*({messages}){sawMood=messages[0].content.includes('PRIVATE EMOTIONAL CONTEXT');yield 'Still a little cold.';}});
  await voice.turn({characterId:'lynae',turnId:'voice',generation:0},'hello',[]);
  assert(sawMood);assert(events.some(e=>e.type==='response.complete'&&e.text==='Still a little cold.'));
  assert(fs.statSync(path.join(root,'mind.sqlite3')).mode&0o600);
  console.log('PASS: native mind bridge, real Python/SQLite engine, appraisal context/temperature, persona preservation, anger/coldness, retry idempotency, restart, character isolation, neutral failure, protocol mapping and voice integration');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
