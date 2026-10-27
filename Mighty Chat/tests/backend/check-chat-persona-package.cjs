'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events');
(async()=>{
 const app=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-persona-package-')),contents=path.join(temp,'Contents'),resources=path.join(contents,'Resources');
 fs.mkdirSync(path.join(resources,'OrbAssets'),{recursive:true});
 fs.cpSync(path.join(app,'Backend'),path.join(contents,'Backend'),{recursive:true,filter:file=>!['vendor','models'].includes(path.basename(file))});
 fs.symlinkSync(path.join(app,'Backend/vendor'),path.join(contents,'Backend/vendor'));
 fs.symlinkSync(path.join(app,'Backend/memory/models'),path.join(contents,'Backend/memory/models'));
 for(const directory of ['PocketTTS','EdgeTTS','VoiceOpenings'])fs.symlinkSync(path.join(app,'Sources',directory),path.join(resources,directory));
 fs.cpSync(path.join(app,'Shared'),path.join(resources,'Shared'),{recursive:true});
 for(const file of ['companion-server.cjs','catalog.js','chat-personas.js'])fs.copyFileSync(path.join(app,'Sources',file),path.join(resources,file));
 const child=spawn(process.execPath,['-r',path.join(app,'tests/memory/mock-provider.cjs'),path.join(resources,'companion-server.cjs')],{env:{...process.env,MIGHTY_MEMORY_ROOT:path.join(temp,'memory'),MIGHTY_MEMORY_V1:'1',GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq'},stdio:['pipe','pipe','pipe']});
 const timer=setTimeout(()=>child.kill(),20000);
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',errors='';child.stderr.on('data',b=>errors+=b);child.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});child.once('exit',()=>reject(Error('Packaged backend stopped: '+errors)));});
  const api=async(route,body)=>{const r=await fetch(`http://127.0.0.1:${ready.port}${route}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Mighty-Token':ready.token},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,...await r.json()};};
  const p=require('../../Sources/chat-personas.js').definitions[3];
  const saved=await api('/api/memory/characters',{character:{id:p.id,name:p.name,profile:{}}});assert.equal(saved.status,200);assert(saved.card.includes(p.voice));
  assert.equal((await api('/api/chat',{characterId:p.id,clientTurnId:'packaged',userMessage:'Hello'})).status,200);
  const file=await fetch(`http://127.0.0.1:${ready.port}/chat-personas.js`);assert.equal(file.status,200);assert((await file.text()).includes('Cyberpunk: Edgerunners'));
  const exited=once(child,'exit');child.stdin.end();assert.equal((await exited)[0],0,'packaged embedding worker shuts down cleanly');
  console.log('PASS: real Contents/Backend + Resources layout loads shared canonical personas, serves the browser module, handles compact chat and shuts down cleanly');
 }finally{clearTimeout(timer);if(child.exitCode===null){const stopped=once(child,'exit');child.stdin.end();await stopped;}fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
