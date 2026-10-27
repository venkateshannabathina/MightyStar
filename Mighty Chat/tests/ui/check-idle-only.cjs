'use strict';
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const app=path.resolve(__dirname,'../..');
const output=path.join(app,'build/idle-only-review');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=spawn(process.execPath,[path.join(app,'Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe'],env:{...process.env,MIGHTY_FACE_LAB:'1',MIGHTY_EXPR_V2:'1',MIGHTY_GESTURES_V2:'1',MIGHTY_ENERGY_JAW:'1'}});let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',err='';const timer=setTimeout(()=>reject(Error('Backend timeout '+err)),15000);server.stdout.on('data',data=>{text+=data;if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]));}});server.stderr.on('data',data=>err+=data);server.once('exit',()=>{clearTimeout(timer);reject(Error('Backend stopped '+err));});});
  const origin='http://127.0.0.1:'+ready.port,headers={'X-Mighty-Token':ready.token};
  const status=await(await fetch(origin+'/api/status',{headers})).json();assert.equal(status.idleOnly,true);
  for(const route of ['/api/animation-chat','/api/face/calibration'])assert.equal((await fetch(origin+route,{method:'POST',headers})).status,404);
  assert.equal((await fetch(origin+'/AnimationLab/index.html')).status,403);
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.addInitScript(()=>{window.nativeMessages=[];window.webkit={messageHandlers:{companion:{postMessage:value=>nativeMessages.push(value)}}};});
  await page.goto(origin);await page.evaluate(({origin,token})=>configureCompanion(origin,token),{origin,token:ready.token});
  assert.equal(await page.locator('#creatorBackdrop').count(),0);
  await page.evaluate(()=>{const appearance=appearances.find(a=>a.name==='Hailey');contacts=[{id:'idle-fixture',name:'Hailey',appearance,profile:{idleStyle:'female'}}];selectChat(0);toggleCharacterMenu();});
  assert.equal(await page.locator('#contactName').textContent(),'Hailey');assert.equal(await page.locator('#characterMenu').isVisible(),true);
  await page.evaluate(()=>openSettings('Account'));assert.equal(await page.locator('#settingsShell').isVisible(),true);
  await page.screenshot({path:path.join(output,'normal-ui.png')});
  await page.goto(origin+'/Companion/index.html?inspect=1');
  for(const appearance of [{key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'},{key:'ww/chars/Lynae/Lynae_skin/Lynae.pmx',name:'Lynae',directory:'ww/chars/Lynae/Lynae_skin',file:'Lynae.pmx'}]){
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,idleStyle:'female'},'*'),{appearance,token:ready.token});
   await page.waitForFunction(key=>document.getElementById('status').hidden&&mightyCompanionInspect().key===key,appearance.key,{timeout:90000});
   await page.waitForTimeout(700);const first=await page.evaluate(()=>mightyCompanionInspect());assert(first.meshCount>0);assert(first.bones.length>20);
   await page.waitForTimeout(600);const second=await page.evaluate(()=>mightyCompanionInspect());assert.notDeepEqual(first.bones,second.bones,'Idle moves the loaded skeleton');
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false},'*'));await page.waitForTimeout(150);
   const paused=await page.evaluate(()=>mightyCompanionInspect());
   await page.evaluate(()=>{for(const type of ['mighty-companion-phase','mighty-companion-performance','mighty-companion-playback'])window.postMessage({type,value:{type:'thinking'},performance:{version:1,utteranceId:'test',mouthCues:[{start:0,end:10,pose:'a'}]},snapshot:{utteranceId:'test',state:'speaking',positionSeconds:1}},'*');window.postMessage({type:'mighty-companion-control',pointer:{x:1,y:1,valid:true},hovered:true},'*');});
   await page.waitForTimeout(500);const still=await page.evaluate(()=>mightyCompanionInspect());assert.deepEqual(still.bones,paused.bones,'Speech and pointer cannot add motion');assert.equal(still.idlePreset.yaw,0);assert.equal(still.idlePreset.pitch,0);
   if(still.morphWeights)assert(Object.values(still.morphWeights).every(weight=>Number.isFinite(weight)&&weight>=0&&weight<=1),'Unified face controller keeps morphs bounded');
   await page.screenshot({path:path.join(output,appearance.name.toLowerCase()+'-idle.png'),omitBackground:true});
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:true},'*'));
  }
  assert.deepEqual(errors,[]);console.log('PASS: normal UI/settings, no creation wizard, deleted APIs despite old flags, real GLB + PMX idle, pause/resume, neutral face and ignored speech/pointer motion');
 }finally{await browser?.close();server.stdin.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
