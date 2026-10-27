'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'build/context-openings-20261022'),stage=path.join(out,'native-stage');
(async()=>{
 fs.mkdirSync(path.join(stage,'Resources/OrbAssets'),{recursive:true});
 if(!fs.existsSync(path.join(stage,'Backend')))fs.symlinkSync(path.join(root,'Backend'),path.join(stage,'Backend'));
 fs.copyFileSync(path.join(root,'Sources/companion-server.cjs'),path.join(stage,'Resources/companion-server.cjs'));
 const env={...process.env,GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq',MIGHTY_STREAM_CHAT:process.env.MIGHTY_CONTEXT_TAGGED==='1'?'1':'0',MIGHTY_MEMORY_V1:'0',MIGHTY_EXPR_V2:'0',MIGHTY_GESTURES_V2:'0',MIGHTY_DEBUG_PERF:'1',MIGHTY_OUTPUT_ONLY_FIXTURE:'1'};
 const server=spawn(process.execPath,['-r',path.join(__dirname,'context-opening-provider-fixture.cjs'),path.join(stage,'Resources/companion-server.cjs')],{env,stdio:['pipe','pipe','pipe']});
 try {
  const ready=await new Promise((resolve,reject)=>{let text='',errors='';server.stderr.on('data',b=>errors+=b);server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',()=>reject(Error('Offline fixture failed: '+errors.slice(0,800))));});
  const check=spawn(path.join(out,'check-context-runtime'),['http://127.0.0.1:'+ready.port,ready.token,out,root],{env,stdio:['ignore','pipe','pipe']});
  check.stdout.pipe(process.stdout);check.stderr.pipe(process.stderr);const [code]=await once(check,'exit');if(code)throw Error('Native contextual reply test failed');
 } finally {server.stdin.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
