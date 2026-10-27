const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const server=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('Backend startup timed out')),15000);server.stdout.on('data',b=>{s+=b;if(s.includes('\n')){clearTimeout(timer);resolve(JSON.parse(s.split('\n')[0]));}});server.once('exit',()=>{clearTimeout(timer);reject(Error('Backend stopped'));});});
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:360,height:650},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.nativeMessages=[];window.maskCount=0;window.maskValues=new Set();window.webkit={messageHandlers:{companion:{postMessage:v=>{if(v.action==='hitMask'){window.lastMask=v;maskCount++;maskValues.add(v.data);}else nativeMessages.push(v);}}}};});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../Sources/desktop.html')).href);
  await page.evaluate(({port,token})=>configureDesktop({mode:'overlay',playing:true,origin:'http://127.0.0.1:'+port,token,shortcut:'Fn',character:{id:'test-lucy',name:'Lucy',appearance:{key:'ww/chars/Lucy/Lucy.pmx',name:'Lucy',directory:'ww/chars/Lucy',file:'Lucy.pmx'},profile:{speak:true}}}),ready);
  const viewer=page.frameLocator('#viewer');
  await viewer.locator('#status').waitFor({state:'hidden',timeout:90000});
  await page.waitForFunction(()=>window.maskCount>5&&lastMask.data.replace(/A|=/g,'').length>50);
  const stats=await page.evaluate(()=>{
   const m=lastMask,b=atob(m.data);let occupied=0,edge=0;
   const hit=(x,y)=>!!(b.charCodeAt((y*m.width+x)>>3)&(1<<((y*m.width+x)&7)));
   for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(hit(x,y)){occupied++;if(x===0||y===0||x===m.width-1||y===m.height-1)edge++;}
   return {occupied,total:m.width*m.height,edge,width:m.width,height:m.height};
  });
  assert.ok(stats.occupied>stats.total*.03&&stats.occupied<stats.total*.65,'mask contains the character and substantial click-through space');
  assert.equal(stats.edge,0,'full character fits without clipping');
  await page.waitForFunction(()=>maskValues.size>2,{},{timeout:10000});
  await page.evaluate(()=>{setDesktopMotion(false);});
  await page.waitForTimeout(700);
  const before=await page.evaluate(()=>lastMask.data);
  await page.mouse.move(180,300);await page.mouse.down();await page.mouse.move(240,360,{steps:10});await page.mouse.up();await page.mouse.wheel(0,400);
  await page.waitForTimeout(700);
  const after=await page.evaluate(()=>lastMask.data);
  const a=Buffer.from(before,'base64'),b=Buffer.from(after,'base64');let changed=0;for(let i=0;i<a.length;i++){let v=a[i]^b[i];while(v){changed+=v&1;v>>=1;}}
  assert.ok(changed<stats.total*.003,'desktop drag and wheel must not rotate, pan or zoom the model');
  assert.equal(await page.locator('#menu').isVisible(),false,'left drag never opens menu');
  await page.mouse.click(180,300,{button:'right'});
  await page.locator('#menu').waitFor({state:'visible',timeout:5000});
  assert.equal(await page.locator('#menu').innerText().then(t=>t.includes('Telegram')),false);
  assert.equal(await page.locator('.menu-help').count(),0,'no instruction footer clutter');
  assert.equal(await page.locator('#menu').evaluate(el=>el.offsetWidth),228,'compact reference-sized menu');
  await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/desktop-menu.png'),omitBackground:true});
  assert.equal(await page.locator('.resize-corner:visible').count(),4,'right-click shows all four resize handles');
  await page.getByRole('menuitem',{name:'Hide area',exact:true}).click();assert.equal(await page.locator('#area').isVisible(),false);
  await page.getByRole('menuitem',{name:'Show area',exact:true}).click();assert.equal(await page.locator('#area').isVisible(),true);
  assert.equal(await page.locator('#menu').isVisible(),false,'Show area clears the menu for resizing');
  await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/desktop-brackets.png'),omitBackground:true});
  for(const corner of ['topLeft','topRight','bottomLeft','bottomRight']){
   const box=await page.locator(`[data-corner="${corner}"]`).boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(180,325,{steps:5});await page.mouse.up();
   await page.waitForFunction(c=>{const e=nativeMessages.filter(m=>m.action==='resizeCorner');return e.filter(v=>v.phase==='begin').at(-1)?.corner===c&&e.at(-1)?.phase==='end';},corner,{timeout:5000});
   const events=await page.evaluate(()=>nativeMessages.filter(m=>m.action==='resizeCorner'));
   assert.equal(events.filter(e=>e.phase==='begin').at(-1).corner,corner);
   assert.ok(events.some(e=>e.phase==='move'),'drag reports screen coordinates: '+JSON.stringify(events));
   assert.equal(events.at(-1).phase,'end','release finishes resize even away from bracket');
  }
  await page.evaluate(()=>openDesktopMenu());
  await page.getByRole('menuitem',{name:'Talk',exact:false}).click();assert.equal(await page.evaluate(()=>nativeMessages.at(-1).action),'desktopTalk');
  await page.evaluate(()=>setDesktopSpeech('orb',{state:'listening'}));
  await page.getByRole('menuitem',{name:'Send recording',exact:false}).click();assert.equal(await page.evaluate(()=>nativeMessages.at(-1).action),'desktopTalk');
  await page.getByRole('menuitem',{name:'Mute voice',exact:true}).click();assert.equal(await page.evaluate(()=>nativeMessages.at(-1).action),'desktopMute');
  await page.getByRole('menuitem',{name:'Resume animation',exact:true}).click();assert.equal(await page.evaluate(()=>nativeMessages.at(-1).action),'desktopMotion');
  await page.getByRole('menuitem',{name:'Character size',exact:true}).click();assert.equal(await page.locator('.resize-corner:visible').count(),4);assert.equal(await page.locator('#menu').isVisible(),false);
  for(const size of [{width:288,height:520},{width:300,height:440},{width:432,height:780}]){
   await page.setViewportSize(size);await page.evaluate(()=>openDesktopMenu(.98,.98));
   const box=await page.locator('#menu').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height,'menu stays inside window near edges');
  }
  await page.getByRole('menuitem',{name:'View Mode',exact:false}).click();await page.getByRole('menuitemradio',{name:'Portrait',exact:false}).click();assert.equal(await page.evaluate(()=>nativeMessages.filter(m=>m.action==='desktopMode').at(-1).mode),'portrait');
  await page.evaluate(()=>openDesktopMenu());await page.keyboard.press('Escape');assert.equal(await page.locator('#menu').isVisible(),false);
  assert.equal(await page.locator('#area').isVisible(),false,'one Escape hides the brackets and menu together');
  await page.evaluate(()=>openDesktopMenu());
  // Native outside-click observation invokes this same function for other apps.
  await page.evaluate(()=>dismissDesktopControls());
  assert.equal(await page.locator('#area').isVisible(),false);
  assert.equal(await page.locator('#menu').isVisible(),false);
  await page.evaluate(()=>openDesktopMenu());
  await page.locator('#desktopHint').click();
  assert.equal(await page.locator('#area').isVisible(),false,'closing with the hint also clears brackets');
  await page.evaluate(()=>openDesktopMenu());
  await page.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
  assert.equal(await page.locator('#area').isVisible(),false,'outside body click dismisses brackets');
  assert.equal(await page.locator('#menu').isVisible(),false,'outside body click dismisses menu');
  const regions=await page.evaluate(()=>nativeMessages.filter(m=>m.action==='interactionRegions').at(-1).regions);assert.equal(regions.length,1,'closed menu no longer blocks underlying apps');
  assert.deepEqual(errors,[]);
  console.log('Real animated model: silhouette mask, transparent margins, full-body framing, stationary camera, right-click menu, actions, menu bounds, all four resize gestures and dismissal passed.');
  console.log('Mask occupancy:',Math.round(stats.occupied/stats.total*100)+'%; camera test changed pixels:',changed);
 }finally{await browser?.close();server.stdin.end();server.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
