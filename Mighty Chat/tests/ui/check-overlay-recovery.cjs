'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:360,height:650}});
  await context.route('http://127.0.0.1:20366/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><script>window.received=[];addEventListener("message",e=>received.push(e.data));</script>'}));
  await context.addInitScript(()=>{window.now=0;Object.defineProperty(performance,'now',{value:()=>window.now});window.nativeMessages=[];window.webkit={messageHandlers:{companion:{postMessage:v=>nativeMessages.push(v)}}};});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../Sources/desktop.html')).href);
  const config={origin:'http://127.0.0.1:20366',token:'x'.repeat(43),mode:'overlay',playing:true,character:{id:'test',name:'Test',appearance:{key:'test/model.glb'},profile:{}}};
  await page.evaluate(c=>configureDesktop(c),config);
  const child=()=>page.frames().find(f=>f.url().startsWith(config.origin));
  await page.waitForFunction(()=>document.getElementById('viewer').contentWindow!=null);
  let frame=child();if(!frame){await page.waitForEvent('framenavigated');frame=child();}
  const advance=async time=>page.evaluate(t=>{now=t;checkRendererHealth();},time);
  const ready=async()=>{await child().evaluate(()=>parent.postMessage({type:'mighty-companion-state',key:'test/model.glb',state:'ready'},'*'));await page.waitForFunction(()=>rendererReadyAt!==null);};
  await advance(10000);assert.equal(page.frames().includes(frame),true,'loading is not mistaken for a blank ready renderer');
  await page.evaluate(()=>{setDesktopSpeech('performance',{utteranceId:'voice',mouthCues:[]});setDesktopSpeech('playback',{utteranceId:'voice',state:'speaking',positionSeconds:1.25});});
  await ready();await advance(14000);
  await page.waitForFunction(()=>recoveryAttempts===1);await page.waitForFunction(()=>document.getElementById('viewer').contentWindow!=null);
  assert(!page.frames().includes(frame),'blank ready view is replaced with a new iframe');
  await page.waitForFunction(()=>document.getElementById('viewer').contentWindow!==null);
  for(let i=0;!child()&&i<20;i++)await page.waitForTimeout(20);
  await child().waitForFunction(()=>received.some(v=>v.type==='mighty-companion-playback'&&v.snapshot.positionSeconds===1.25));
  await ready();
  await child().evaluate(()=>parent.postMessage({type:'mighty-companion-hit-mask',width:8,height:1,data:'/w==',viewportWidth:360,viewportHeight:650},'*'));
  await page.waitForFunction(()=>lastVisibleAt===14000);
  await advance(16000);assert.equal(await page.evaluate(()=>recoveryAttempts),1,'visible silhouettes retain the live view');
  await advance(18000);await page.waitForFunction(()=>recoveryAttempts===2);
  for(let i=0;!child()&&i<20;i++)await page.waitForTimeout(20);
  await ready();await advance(22000);
  assert(await page.locator('#desktopRecovery').isVisible(),'repeated failure shows an actionable retry instead of a silent blank');
  assert(await page.evaluate(()=>nativeMessages.at(-1).regions.some(r=>r.width>0.5&&r.y>0.2)),'native click routing includes recovery controls');
  await page.getByRole('button',{name:'Try again',exact:true}).click();assert.equal(await page.evaluate(()=>recoveryAttempts),0);assert(!await page.locator('#desktopRecovery').isVisible());
  await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{origin:'http://attacker.invalid',source:null,data:{type:'mighty-companion-state',key:'test/model.glb',state:'ready'}})));
  assert.equal(await page.evaluate(()=>rendererReadyAt),null,'untrusted messages cannot mark the renderer ready');
  assert.deepEqual(errors,[]);
  console.log('Overlay recovery: loading/ready distinction, empty-surface remount, speech-clock replay, visible-surface preservation, retry limit/action/click regions and untrusted-message rejection passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
