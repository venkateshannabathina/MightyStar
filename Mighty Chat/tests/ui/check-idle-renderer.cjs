const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../../build/idle-review');fs.mkdirSync(output,{recursive:true});
const hailey={key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'};
const lynae={key:'ww/chars/Lynae/Lynae/Lynae.pmx',name:'Lynae',directory:'ww/chars/Lynae/Lynae',file:'Lynae.pmx'};
const rover={key:'ww/chars/Rover (Male)/Rover (Male)/Rover (Male).bpmx',name:'Rover (Male)',directory:'ww/chars/Rover (Male)/Rover (Male)',file:'Rover (Male).bpmx'};
const clipDurations=Object.fromEntries(['dwarf-idle.json','dwarf-idle-2.json'].map(file=>{
 const clip=require(path.resolve(__dirname,'../../../model-viewer-clean/res/animations',file));
 return [clip.name,(clip.frameCount-1)/clip.fps];
}));
(async()=>{
 const server=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let out='',err='';const timer=setTimeout(()=>reject(Error('Backend timed out: '+err)),15000);server.stdout.on('data',b=>{out+=b;if(out.includes('\n')){clearTimeout(timer);resolve(JSON.parse(out.split('\n')[0]));}});server.stderr.on('data',b=>err+=b);server.on('exit',()=>{clearTimeout(timer);reject(Error('Backend stopped: '+err));});});
  const origin='http://127.0.0.1:'+ready.port;
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:460,height:760},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Math.random=()=>0.1;window.idleStates=[];});
  await page.goto(origin+'/Companion/index.html?inspect=1');
  const load=async appearance=>{
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token},'*'),{appearance,token:ready.token});
   await page.locator('#status').waitFor({state:'hidden',timeout:90000});
   await page.waitForTimeout(1300);
   const state=await page.evaluate(()=>mightyCompanionInspect());
   assert.equal(state.key,appearance.key);assert.ok(state.bones.length>20);assert.ok(state.meshCount>0);assert.ok(state.height>1);
   for(const bone of state.bones){assert.ok(bone.rotation.every(Number.isFinite));assert.ok(bone.position.every(Number.isFinite));}
   return state;
  };
  const initial=await load(hailey);
  await page.screenshot({path:path.join(output,'hailey-idle-start.png'),omitBackground:true});
  const moves=async initial=>{
   for(let i=0;i<40;i++){
    await page.waitForTimeout(200);const state=await page.evaluate(()=>mightyCompanionInspect());
    if(JSON.stringify(initial.bones)!==JSON.stringify(state.bones))return state;
   }
   assert.fail('Character should visibly animate between ending-pose holds');
  };
  await moves(initial);
  await page.waitForFunction(()=>{const state=mightyCompanionInspect().idle;return state.holding&&state.holdElapsed<1.7;},{},{timeout:10000});
  const held=await page.evaluate(()=>mightyCompanionInspect());await page.waitForTimeout(1000);
  const stillHeld=await page.evaluate(()=>mightyCompanionInspect());
  assert.equal(stillHeld.idle.stage,'hold');assert.deepEqual(stillHeld.bones,held.bones,'The ending pose really freezes during the hold');
  await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false},'*'));await page.waitForTimeout(150);
  const paused=await page.evaluate(()=>mightyCompanionInspect());await page.waitForTimeout(500);assert.deepEqual((await page.evaluate(()=>mightyCompanionInspect())).idle,paused.idle,'pause freezes the idle scheduler');
  await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:true,hovered:true},'*'));
  await page.waitForTimeout(500);assert.equal((await page.evaluate(()=>mightyCompanionInspect())).idle.reacting,false,'Hover reaction is disabled');
  // Observe both complete authored animations, endpoint holds and transitions.
  const visibleFrame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
   const source=document.querySelector('canvas'),thumbnail=document.createElement('canvas');thumbnail.width=128;thumbnail.height=208;
   const context=thumbnail.getContext('2d');context.drawImage(source,0,0,128,208);resolve(Array.from(context.getImageData(0,0,128,208).data));
  })));
  const referencePixels=await visibleFrame();let visibleChanges=0;
  assert.ok(referencePixels.filter((_,index)=>index%4===3&&referencePixels[index]>32).length>500,'The actual renderer draws the character');
  const seen=new Set(),sampledRanges={};let crossfades=0;
  for(let i=0;i<60;i++){
   const state=await page.evaluate(()=>mightyCompanionInspect());seen.add(state.idle.primary.name);if(state.idle.secondary){seen.add(state.idle.secondary.name);crossfades++;}
   assert.equal(state.idle.reacting,false);
   for(const phase of [state.idle.primary,state.idle.secondary].filter(Boolean))assert.ok(phase.time>=-1e-8&&phase.time<=clipDurations[phase.name]+1e-8,'Animation samples stay inside their full source clip');
   if(state.idle.stage==='animation'){
    const phase=state.idle.primary,range=sampledRanges[phase.name]??={min:Infinity,max:-Infinity};
    range.min=Math.min(range.min,phase.time);range.max=Math.max(range.max,phase.time);
   }
   const pixels=await visibleFrame();let changed=0;
   for(let pixel=0;pixel<pixels.length;pixel+=4)if(Math.max(...[0,1,2,3].map(channel=>Math.abs(pixels[pixel+channel]-referencePixels[pixel+channel])))>24)changed++;
   visibleChanges=Math.max(visibleChanges,changed);
   for(const bone of state.bones)assert.ok([...bone.rotation,...bone.position].every(Number.isFinite));
   await page.waitForTimeout(500);
  }
  assert.deepEqual([...seen].sort(),['Dwarf Idle','Dwarf Idle 2'].sort(),'Only the requested two idles run');assert.ok(crossfades>0,'real character crossfades between ending poses');
  for(const [name,duration] of Object.entries(clipDurations)){
   assert.ok(sampledRanges[name]?.min<0.7,name+' plays from its beginning');
   assert.ok(sampledRanges[name]?.max>duration-0.7,name+' plays through its ending');
  }
  assert.ok(visibleChanges>150,'Animation visibly changes the rendered character after entry');
  await page.screenshot({path:path.join(output,'hailey-idle-cycle.png'),omitBackground:true});
  const snapshots=[];
  for(const appearance of [lynae,rover]){
   const state=await load(appearance);snapshots.push({name:appearance.name,bones:state.bones.length,height:state.height});
   await moves(state);
   await page.screenshot({path:path.join(output,appearance.name.toLowerCase()+'-idle.png'),omitBackground:true});
  }
  await load(hailey);const reset=await page.evaluate(()=>mightyCompanionInspect());assert.equal(reset.idle.primary.clipIndex,0,'switching characters resets their sequence');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'renderer-check.json'),JSON.stringify({haileyBones:initial.bones.length,normalClips:[...seen],sourceDurations:clipDurations,sampledRanges,holdSeconds:3,hoverEnabled:false,crossfades,visibleChangedPixels:visibleChanges,pmx:snapshots,errors},null,2));
  console.log('PASS: real GLB/PMX/BPMX loading, both complete Dwarf animations from beginning to end, frozen endpoint holds, smooth crossfades, visible movement, hover disabled, pause/resume and character switching');
 }finally{await browser?.close();server.stdin.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
