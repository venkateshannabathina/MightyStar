'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{once}=require('node:events');
const app=path.resolve(__dirname,'../..');
(async()=>{const root=fs.mkdtempSync('/private/tmp/mighty-stream-webkit-');
 try{for(const memory of [false,true]){
  const env={...process.env,MIGHTY_STREAM_CHAT:'1',MIGHTY_MEMORY_V1:memory?'1':'0',MIGHTY_MEMORY_ROOT:path.join(root,String(memory)),MIGHTY_EXPR_V2:'1',MIGHTY_ENERGY_JAW:'1',MIGHTY_GESTURES_V2:'1',MIGHTY_FACE_LAB:'0',MIGHTY_DEBUG_PERF:'0',GROQ_API_KEY:'offline-fixture-key'};
  const child=spawn(process.execPath,['-r',path.join(__dirname,'mock-provider.cjs'),process.env.MIGHTY_TEST_SERVER||path.join(app,'Sources/companion-server.cjs')],{env,stdio:['pipe','pipe','pipe']});
  try{
   const ready=await new Promise((resolve,reject)=>{let text='';child.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});child.once('exit',()=>reject(Error('Fixture stopped')));});
   const origin='http://127.0.0.1:'+ready.port,character={id:'webkit',name:'Mira',profile:{aiProvider:'groq',aiModel:'openai/gpt-oss-20b'}};
   if(memory)assert.equal((await fetch(origin+'/api/memory/characters',{method:'POST',headers:{'Content-Type':'application/json','X-Mighty-Token':ready.token},body:JSON.stringify({character})})).status,200);
   const body=memory?{characterId:'webkit',clientTurnId:'one',userMessage:'Hey'}:{character,messages:[{role:'user',content:'Hey'}]};
   const check=spawn(path.join(app,'build/check-stream-webkit'),[path.join(app,'Sources/companion-ui.js'),JSON.stringify({origin,token:ready.token,body})],{stdio:['ignore','pipe','pipe']});
   check.stdout.pipe(process.stdout);check.stderr.pipe(process.stderr);const[code]=await once(check,'exit');assert.equal(code,0,'Actual native WebKit streamed request failed');
  }finally{if(child.exitCode===null){const done=once(child,'exit');child.stdin.end();await done;}}
 }}finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
