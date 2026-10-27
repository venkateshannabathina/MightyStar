'use strict';
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const app=path.resolve(__dirname,'../..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-waist-visual-'));
const output=path.join(app,'build/waist-review');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=spawn(process.execPath,[path.join(app,'Sources/companion-server.cjs'),'--preview'],{stdio:['pipe','pipe','pipe'],env:{...process.env,MIGHTY_MEMORY_ROOT:path.join(scratch,'memory')}});let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',err='';const timer=setTimeout(()=>reject(Error('Backend timeout '+err)),15000);server.stdout.on('data',v=>{text+=v;if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]));}});server.stderr.on('data',v=>err+=v);server.once('exit',()=>{clearTimeout(timer);reject(Error(err));});});
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:900,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://127.0.0.1:'+ready.port+'/Companion/index.html?inspect=1');
  const catalog=require('../../Sources/catalog.js');
  for(const name of ['Lynae','Rover (Female)']){
   const appearance=catalog.appearances.find(a=>a.name===name&&!a.variant);
   assert(appearance);
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,idleStyle:'female'},'*'),{appearance,token:ready.token});
   await page.waitForFunction(key=>document.getElementById('status').hidden&&mightyCompanionInspect().key===key,appearance.key,{timeout:90000});
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',framing:'selection',animationTuning:{enabled:true,physicsEnabled:false,bones:{}}},'*'));
   await page.waitForTimeout(1500);
   const stem=name==='Lynae'?'lynae':'rover';
   await page.screenshot({path:path.join(output,stem+'-idle.png')});
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',animationTuning:{enabled:true,physicsEnabled:true,bones:{}}},'*'));
   await page.waitForFunction(()=>mightyCompanionInspect().physics.status==='on',null,{timeout:30000});
   await page.waitForTimeout(5000);
   const state=await page.evaluate(()=>mightyCompanionInspect());assert(state.physics.enabled);assert(state.bones.length>500);
   await page.screenshot({path:path.join(output,stem+'-physics.png')});
   fs.writeFileSync(path.join(output,stem+'-state.json'),JSON.stringify(state,null,2));
   console.log(`PASS: ${name}, real PMX/textures/WebGL render, physics off/on, ${state.physics.bodies} dynamic bodies, no page errors`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.kill();fs.rmSync(scratch,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
