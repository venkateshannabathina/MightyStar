const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

// Isolate the desktop controls from model downloads, the microphone, and AI calls.
// The native host owns dismissal across WKWebView lifetimes; configureDesktop
// replays that process-local value when a companion view is reopened.
const desktopURL=pathToFileURL(path.resolve(__dirname,'../../Sources/desktop.html')).href;
const output=path.resolve(__dirname,'../../build/talk-ui-review');
const baseConfig={mode:'overlay',playing:true,origin:'http://127.0.0.1:9',token:'test',shortcut:'Fn',talkHintDismissed:false,talkHeld:false,character:{id:'test-hailey',name:'Hailey',appearance:{key:'dummy/hailey.glb'},profile:{speak:true}}};

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:360,height:650},deviceScaleFactor:2});
  await context.route('http://127.0.0.1:9/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated character surface</title>'}));
  await context.addInitScript(()=>{window.nativeMessages=[];window.webkit={messageHandlers:{companion:{postMessage:value=>window.nativeMessages.push(value)}}};});
  const newView=async config=>{
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(desktopURL);await page.evaluate(value=>configureDesktop(value),config);return page;
  };
  const page=await newView(baseConfig);
  const hint=page.locator('#desktopHint');
  const bounds=()=>hint.evaluate(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};});
  const settled=async(mode,width,height)=>{
   await page.waitForFunction(({mode,width,height})=>{
    const element=document.getElementById('desktopHint'),r=element.getBoundingClientRect();
    return element.dataset.mode===mode&&(width===null||Math.abs(r.width-width)<.6)&&Math.abs(r.height-height)<.6;
   },{mode,width,height});
   await page.waitForTimeout(50);
   return bounds();
  };
  const matchingRegions=async()=>{
   await page.waitForFunction(()=>{
    const r=document.getElementById('desktopHint').getBoundingClientRect();
    const region=nativeMessages.filter(value=>value.action==='interactionRegions').at(-1)?.regions?.[0];
    return region&&Math.abs(region.x*innerWidth-r.x)<.6&&Math.abs(region.y*innerHeight-r.y)<.6&&Math.abs(region.width*innerWidth-r.width)<.6&&Math.abs(region.height*innerHeight-r.height)<.6;
   });
  };
  const screenshot=name=>page.screenshot({path:path.join(output,name+'.png'),omitBackground:true});
  const initial=await settled('instruction',null,32);
  assert.ok(initial.width>100,'the opening shortcut remains readable');
  assert.match(await hint.innerText(),/Hold Fn\s+to talk/);
  await matchingRegions();await screenshot('initial-instruction');

  // Pressing Fn must switch immediately, before backend/mic readiness or status.
  const startMessage=await page.evaluate(()=>nativeMessages.length);
  await page.evaluate(()=>{setDesktopTalkHeld(true);setDesktopCallStatus('connecting','Starting microphone…');});
  assert.equal(await hint.getAttribute('data-mode'),'recording','holding wins over delayed connecting status');
  const recording=await settled('recording',74,30);
  assert.ok(Math.abs(recording.bottom-initial.bottom)<.6,'the pill shrinks upward from the original lower edge');
  assert.equal(await page.locator('#hintWaveform i').count(),10);
  await matchingRegions();
  const regionWidths=await page.evaluate(start=>nativeMessages.slice(start).filter(value=>value.action==='interactionRegions').map(value=>value.regions[0]?.width*innerWidth),startMessage);
  assert.ok(regionWidths.some(width=>width>75&&width<initial.width-1),'native hit regions track intermediate animated widths');

  await page.evaluate(()=>setDesktopInputLevel(0));await page.waitForTimeout(220);
  const silent=await page.locator('#hintWaveform i').evaluateAll(bars=>bars.map(bar=>bar.getBoundingClientRect().height));
  await page.evaluate(()=>{setDesktopInputLevel(1);window.testMeter=setInterval(()=>setDesktopInputLevel(1),40);});await page.waitForTimeout(220);
  const loud=await page.locator('#hintWaveform i').evaluateAll(bars=>bars.map(bar=>bar.getBoundingClientRect().height));
  assert.ok(loud.reduce((sum,value)=>sum+value,0)>silent.reduce((sum,value)=>sum+value,0)+20,'real input level visibly expands the waveform');
  await screenshot('listening-waveform');
  await page.evaluate(()=>clearInterval(window.testMeter));await page.waitForTimeout(300);
  const decayed=await page.locator('#hintWaveform i').evaluateAll(bars=>bars.map(bar=>bar.getBoundingClientRect().height));
  assert.ok(decayed.every(height=>Math.abs(height-2)<.1),'interrupted input settles back to quiet dots');

  await page.evaluate(()=>{setDesktopTalkHeld(false);setDesktopInputLevel(1);});
  const idle=await settled('idle',40,8);
  assert.ok(Math.abs(idle.bottom-initial.bottom)<.6,'the resting bar keeps the original lower edge');
  await matchingRegions();await screenshot('idle-bar');
  for(const phase of ['listening','thinking','speaking']){
   await page.evaluate(state=>{setDesktopSpeech('orb',{state});setDesktopInputLevel(1);},phase);
   assert.equal(await hint.getAttribute('data-mode'),'idle','late '+phase+' status never reopens recording after release');
  }
  await page.evaluate(()=>setDesktopCallStatus('error','Microphone unavailable'));
  assert.equal(await hint.getAttribute('data-mode'),'idle','errors retain compact geometry');
  assert.match((await hint.getAttribute('aria-label')||'')+' '+(await hint.getAttribute('title')||''),/Microphone unavailable/,'the compact control keeps an accessible error explanation');
  await page.evaluate(value=>{configureDesktop(value);setDesktopTalkHintDismissed(false);},baseConfig);
  assert.equal(await hint.getAttribute('data-mode'),'idle','stale configuration cannot restore the instruction within this view');
  await page.evaluate(()=>setDesktopTalkHeld(true));await settled('recording',74,30);
  await page.evaluate(()=>setDesktopTalkHeld(false));await settled('idle',40,8);

  // The compact bar retains the character menu and keyboard controls.
  await hint.click();assert.equal(await page.locator('#menu').isVisible(),true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'talk');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>nativeMessages.at(-1).action),'desktopTalk');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#menu').isVisible(),false);
  assert.equal(await page.locator('#area').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'desktopHint');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#menu').isVisible(),true);
  await hint.click();assert.equal(await page.locator('#menu').isVisible(),false);
  await matchingRegions();
  assert.equal(await page.evaluate(()=>nativeMessages.filter(value=>value.action==='interactionRegions').at(-1).regions.length),1,'dismissed menus leave only the compact bar clickable');

  // New WKWebViews inherit the native launch state; a fresh launch starts over.
  const reopened=await newView({...baseConfig,talkHintDismissed:true});
  await reopened.waitForFunction(()=>document.getElementById('desktopHint').dataset.mode==='idle');
  const fresh=await newView(baseConfig);
  assert.equal(await fresh.locator('#desktopHint').getAttribute('data-mode'),'instruction');
  await reopened.close();await fresh.close();

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>setDesktopTalkHeld(true));await settled('recording',74,30);
  const transitions=await hint.evaluate(element=>getComputedStyle(element).transitionDuration.split(',').map(value=>parseFloat(value)));
  assert.ok(transitions.every(seconds=>seconds<=.01),'reduced motion removes the morph animation');
  await page.evaluate(()=>setDesktopTalkHeld(false));await settled('idle',40,8);await matchingRegions();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'talk-ui-report.json'),JSON.stringify({initial,recording,idle,silentBarHeights:silent,loudBarHeights:loud,animatedRegionWidths:regionWidths,checks:['immediate hold','volume response','release ignores stale levels/status','once per launch configuration','menu and keyboard','animated hit regions','reduced motion']},null,2));
  console.log('PASS: opening instruction, immediate Fn waveform, microphone response, compact release, launch state, animated native hit regions, menu keyboard access and reduced motion.');
  console.log('Screenshots and report: '+output);
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
