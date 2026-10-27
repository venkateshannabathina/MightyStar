'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const flags=['MIGHTY_MEMORY_V1','MIGHTY_STREAM_CHAT','MIGHTY_EXPR_V2','MIGHTY_ENERGY_JAW','MIGHTY_GESTURES_V2','MIGHTY_FACE_LAB','MIGHTY_DEBUG_PERF'];
const fields=['memoryV1','streamChat','exprV2','energyJaw','gesturesV2','faceLab'];
(async()=>{
 const root=fs.mkdtempSync('/private/tmp/mighty-wp9-rollout-');
 try{
  const cases=[{},Object.fromEntries(flags.map(f=>[f,'true'])),...flags.map(f=>({[f]:'1'})),Object.fromEntries(flags.map(f=>[f,'1']))];
  for(let index=0;index<cases.length;index++){
   const env={...process.env};for(const f of flags)delete env[f];
   Object.assign(env,cases[index],{MIGHTY_MEMORY_ROOT:path.join(root,String(index),'memory'),MIGHTY_FACE_CALIBRATION_ROOT:path.join(root,String(index),'calibration')});
   // This check needs no credentials and must not invoke credential migration.
   for(const p of ['GROQ','OPENAI','ANTHROPIC','GEMINI'])delete env[p+'_API_KEY'];
   const child=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{env,stdio:['pipe','pipe','pipe']});
   try{
    const ready=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Startup timed out')),10000);child.stdout.on('data',b=>{output+=b;if(output.includes('\n')){clearTimeout(timer);resolve(JSON.parse(output.split('\n')[0]));}});child.once('exit',()=>{clearTimeout(timer);reject(Error('Server stopped'));});});
    const origin='http://127.0.0.1:'+ready.port,headers={'X-Mighty-Token':ready.token};
    assert.equal((await fetch(origin+'/api/status')).status,401);
    const status=await(await fetch(origin+'/api/status',{headers})).json();
    fields.forEach((field,i)=>assert.equal(status[field],cases[index][flags[i]]==='1',field));
    const perf=await fetch(origin+'/api/debug/perf/export',{headers});assert.equal(perf.status,cases[index].MIGHTY_DEBUG_PERF==='1'?200:404);
    const memory=await fetch(origin+'/api/memory/facts?characterId=wp9',{headers});assert.equal(memory.status,cases[index].MIGHTY_MEMORY_V1==='1'?200:404);
    assert.equal(fs.existsSync(env.MIGHTY_MEMORY_ROOT),cases[index].MIGHTY_MEMORY_V1==='1');
    assert(!fs.existsSync(env.MIGHTY_FACE_CALIBRATION_ROOT),'Read-only startup must not write calibration');
   }finally{if(child.exitCode===null){const done=once(child,'exit');child.stdin.end();await done;}}
  }
  console.log('Release rollout: unset, invalid, seven independent flags and all-on; authenticated status, debug/memory gates and no flag-off storage passed (10 cases).');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
