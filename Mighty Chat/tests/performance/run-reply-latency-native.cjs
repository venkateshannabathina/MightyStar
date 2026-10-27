'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const app=path.resolve(__dirname,'../..'),stage=path.join(app,'build/wp7-native-check');
async function run(enabled){
 const environment={...process.env,GROQ_API_KEY:'offline-fixture-key',MIGHTY_AI_PROVIDER:'groq',MIGHTY_EXPR_V2:'0',MIGHTY_GESTURES_V2:enabled?'1':'0',MIGHTY_STREAM_CHAT:'1',MIGHTY_DEBUG_PERF:'1',MIGHTY_MEMORY_V1:'0'};
 fs.mkdirSync(path.join(stage,'Resources/OrbAssets'),{recursive:true});fs.mkdirSync(path.join(app,'docs/wp7-evidence'),{recursive:true});for(const [target,link]of [[path.join(app,'Backend'),path.join(stage,'Backend')]]){if(!fs.existsSync(link))fs.symlinkSync(target,link);}
 fs.copyFileSync(path.join(app,'Sources/companion-server.cjs'),path.join(stage,'Resources/companion-server.cjs'));
 const server=spawn(process.execPath,['-r',path.join(__dirname,'../face/native-provider-fixture.cjs'),path.join(stage,'Resources/companion-server.cjs')],{env:environment,stdio:['pipe','pipe','pipe']});
 try{
  const ready=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',()=>reject(Error('Fixture server stopped.')));});
  const check=spawn(path.join(app,'build/check-reply-latency-native'),['http://127.0.0.1:'+ready.port,ready.token,path.join(app,'docs/wp7-evidence')],{env:environment,stdio:['ignore','pipe','pipe']});
  check.stdout.pipe(process.stdout);check.stderr.pipe(process.stderr);const[code]=await once(check,'exit');if(code)throw Error('Native fixture failed.');
 }finally{server.stdin.end();}
}
(async()=>{await run(false);if(!process.env.MIGHTY_TEST_FILLER_ROOT)await run(true);})().catch(e=>{console.error(e.message);process.exitCode=1});
