'use strict';
// Serve Sources at 127.0.0.1:8765. No microphone or provider is used.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
(async()=>{
 const output=path.resolve(__dirname,'../../build/orb-morph-review');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:884,height:600},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:8765');
 await page.evaluate(()=>{contacts=[{id:'orb-fixture',name:'Hailey',profile:{speak:false}}];saved={'orb-fixture':[{role:'user',text:'Hello'},{role:'assistant',text:'Hello.'}]};selectChat(0);window.webkit={messageHandlers:{companion:{postMessage(){}}}};});
 const frames=[];
 async function sample(phase,time){
  const result=await page.evaluate(async({phase,time})=>{
   cancelAnimationFrame(siriOrb.frame);siriOrb.frame=0;
   const conversation=document.getElementById('conversation');conversation.classList.toggle('siri-voice-mode',phase!=='exit');
   const field=document.querySelector('.text-field').getBoundingClientRect();
   document.querySelector('.siri-orb-label').textContent=document.getElementById('message').placeholder;siriOrb.desired=phase!=='exit';siriOrb.fieldWidth=field.width;siriOrb.fieldHeight=32;siriOrb.started=performance.now()-time;siriOrb.seek=0;siriOrb.painted='';setOrbPhase(phase);
   const frame=orbFrameAt(MIGHTY_ORB_REFERENCE.sequences[phase],time);await orbPage(frame.atlas).image.decode();
   orbPage(frame.atlas).ready=true;paintSiriOrb(siriOrb.started+time);cancelAnimationFrame(siriOrb.frame);siriOrb.frame=0;
   const rect=document.getElementById('siriVoiceOrb').getBoundingClientRect();return {phase,time,x:rect.x,y:rect.y,w:rect.width,h:rect.height,field:field.width,bottom:innerHeight-rect.bottom};
  },{phase,time});
  const file=`${phase}-${String(time).padStart(3,'0')}.png`;
  await page.screenshot({path:path.join(output,file),clip:{x:92,y:440,width:792,height:160}});frames.push({...result,file});return result;
 }
 const start=await sample('enter',0);assert.ok(Math.abs(start.w-start.field)<1,'starts at actual text field width');
 for(let t=40;t<=640;t+=40)await sample('enter',t);
 const narrow=frames.find(f=>f.phase==='enter'&&f.time===280);assert.ok(narrow.w<85&&narrow.h>100,'vertical overshoot is preserved');
 const round=await sample('enter',679);assert.ok(Math.abs(round.w-round.h)<5&&round.h>100,'settles to the recorded sphere size');
 for(let t=0;t<580;t+=40)await sample('exit',t);
 const end=await sample('exit',579);assert.ok(Math.abs(end.w-end.field)<5,'returns to the full input width');
 assert.ok(frames.every(frame=>Math.abs(frame.bottom-12)<1),'morph stays on the shared composer baseline');
 fs.writeFileSync(path.join(output,'geometry.json'),JSON.stringify(frames,null,2));
 // Exercise real time entry, interrupted reversal, re-entry, resizing and hiding.
 await page.evaluate(()=>{setOrbPhase('text');siriOrb.desired=false;document.getElementById('conversation').classList.remove('siri-voice-mode');showVoiceMode();});
 await page.waitForTimeout(150);await page.evaluate(()=>showTextMode());await page.waitForTimeout(80);await page.evaluate(()=>showVoiceMode());
 await page.waitForTimeout(750);assert.equal(await page.locator('#conversation').getAttribute('data-orb-phase'),'voice');
 const before=await page.locator('#siriVoiceOrb').boundingBox();await page.setViewportSize({width:1600,height:1000});await page.waitForTimeout(100);const after=await page.locator('#siriVoiceOrb').boundingBox();assert.ok(Math.abs(before.width-after.width)<1,'orb size remains independent of window width');
 await page.evaluate(()=>showTextMode());await page.waitForTimeout(650);assert.equal(await page.locator('#conversation').getAttribute('data-orb-phase'),'text');
 assert.equal(await page.locator('#holdTalk').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.screenshot({path:path.join(output,'text-restored.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>showVoiceMode());await page.waitForTimeout(100);assert.equal(await page.locator('#conversation').getAttribute('data-orb-phase'),'voice');
 await page.evaluate(()=>showHome());assert.equal(await page.evaluate(()=>siriOrb.frame),0,'hidden orb stops drawing');
 assert.deepEqual(errors,[]);await browser.close();console.log('Orb passed: reference-timed geometry, vertical overshoot, reverse expansion, shared baseline, rapid reversal, fixed scale, hidden rendering and reduced motion.');
})().catch(error=>{console.error(error);process.exit(1)});
