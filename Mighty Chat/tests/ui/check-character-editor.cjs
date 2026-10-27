const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
(async()=>{
 const server=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 const ready=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>{server.kill();reject(Error('Editor backend startup timed out'));},10000);server.stdout.on('data',b=>{out+=b;if(out.includes('\n')){clearTimeout(timer);resolve(JSON.parse(out.split('\n')[0]));}});server.once('exit',()=>{clearTimeout(timer);reject(Error('Editor backend stopped'));});});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
 const page=await browser.newPage({viewport:{width:1240,height:820},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Match the stricter ScrollBehavior enum in the native WKWebView host.
 await page.addInitScript(()=>{
  for(const method of ['scrollTo','scrollIntoView']){
   const original=Element.prototype[method];
   Element.prototype[method]=function(options,...rest){
    if(options && typeof options==='object' && options.behavior && !['auto','smooth'].includes(options.behavior))throw new TypeError('Invalid ScrollBehavior for WKWebView');
    return original.call(this,options,...rest);
   };
  }
 });
 // Deterministic image fixtures keep geometry tests independent of remote availability.
 let releasePortraits;const portraitGate=new Promise(resolve=>{releasePortraits=resolve;});
 await page.route('https://phoshco.github.io/**',async r=>{await portraitGate;return r.request().resourceType()==='image'?r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120"><rect width="96" height="120" fill="#51647b"/></svg>'}):r.abort();});
 await page.route('**/Companion/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated renderer fixture</title>'}));
 await page.route('**/api/appearance/cache',r=>r.fulfill({contentType:'application/json',body:'{"cached":true}'}));
 await page.route('**/Characters/hailey/portrait.jpeg',r=>r.fulfill({path:path.resolve(__dirname,'../../Sources/Characters/hailey/portrait.jpeg')}));
 await page.goto('http://127.0.0.1:'+ready.port);
 await page.evaluate(()=>{
  contacts=[{id:'editor-test',name:'My companion',description:'Existing personality',profile:{job:'Creative partner',greeting:'Hello',speak:false},appearance:{...appearances[0]}}];
  saved={'editor-test':[{role:'user',text:'Keep this conversation',time:'09:00'}]};
  localStorage.setItem('mightyCharacters',JSON.stringify(contacts));
  selectChat(0);editCharacter();
 });
 // Cached local portraits can finish and leave src set while the next request starts.
 // Count unresolved images, rather than all images ever assigned a URL.
 await page.waitForFunction(()=>[...document.querySelectorAll('#appearanceGrid img[src]')].filter(image=>!image.complete).length===3);
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#appearanceGrid img[src]').evaluateAll(images=>images.filter(image=>!image.complete).length),3,'stalled portraits cannot flood browser connections');
 await page.frameLocator('#appearancePreview iframe').locator('title').waitFor({state:'attached'});
 releasePortraits();
 await page.waitForFunction(()=>document.querySelector('.portrait-queue')?.children.length===0);
 assert.equal(await page.locator('.appearance-step').isVisible(),true,'edit starts with appearance');
 assert.equal(await page.locator('#saveCharacterButton').innerText(),'Save');
 assert.equal(await page.locator('.appearance-step nav,.appearance-step input[type="search"],.appearance-step .library-toolbar').count(),0,'selection canvas has no extra navigation or controls');
 assert.equal(await page.locator('[data-appearance]').count(),10,'all allowed appearances are available');
 const previewBefore=await page.locator('#appearancePreview').boundingBox();
 await page.locator('#appearanceGrid').hover();await page.mouse.wheel(0,450);await page.waitForTimeout(300);
 assert.deepEqual(await page.locator('#appearancePreview').boundingBox(),previewBefore,'scrolling roster does not move preview');
 await page.locator('#appearanceGrid').evaluate(el=>el.scrollTop=400);
 const card=page.locator('[data-appearance]').nth(7);
 await card.scrollIntoViewIfNeeded();
 const before=await page.locator('#appearanceGrid').evaluate(el=>el.scrollTop);
 await card.click();
 assert.ok(Math.abs(await page.locator('#appearanceGrid').evaluate(el=>el.scrollTop)-before)<2,'selection preserves scroll');
 assert.equal(await card.getAttribute('aria-pressed'),'true');
 assert.equal(await card.evaluate(el=>el===document.activeElement),true,'selection retains keyboard focus');
 const selectedKey=await card.getAttribute('data-appearance');
 await page.locator('#creatorCancel').click();
 assert.notEqual(await page.evaluate(()=>contacts[0].appearance.key),selectedKey,'cancel discards draft');
 await page.evaluate(()=>editCharacter());
 await page.locator('[data-appearance]').nth(1).click();
 const savedKey=await page.locator('.appearance-card.chosen').getAttribute('data-appearance');
 await page.locator('#appearanceName').fill('Updated name');
 await page.locator('#saveCharacterButton').click();
 assert.equal(await page.locator('#creatorBackdrop').isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>({key:contacts[0].appearance.key,name:contacts[0].name,series:contacts[0].series,text:saved['editor-test'][0].text})),{key:savedKey,name:'Updated name',series:'Wuthering Waves',text:'Keep this conversation'});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mightyCharacters'))[0].appearance.key),savedKey);
 await page.evaluate(()=>editCharacter());
 for(const size of [{width:1600,height:1000},{width:1240,height:820},{width:1024,height:700},{width:880,height:600},{width:640,height:600},{width:390,height:700}]){
  await page.setViewportSize(size);
  for(let step=0;step<4;step++){
   await page.evaluate(n=>goCreatorStep(n),step);
   assert.equal(await page.locator(`.wizard-step[data-step="${step}"]`).isVisible(),true);
   const bounds=await page.locator('#creatorForm').boundingBox();
   assert.deepEqual(bounds,{x:0,y:0,width:size.width,height:size.height},'editor fills entire window');
   assert.ok(await page.locator('.wizard-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no horizontal editor overflow');
   const save=await page.locator('#saveCharacterButton').boundingBox();
   assert.ok(save.y+save.height<=size.height&&save.x+save.width<=size.width,'save remains reachable');
  }
  await page.evaluate(()=>goCreatorStep(1));
  await page.waitForTimeout(50);
  const geometry=await page.locator('.appearance-row').evaluateAll(rows=>rows.slice(0,3).map(row=>({columns:getComputedStyle(row).gridTemplateColumns.split(' ').length,inset:parseFloat(row.style.getPropertyValue('--row-inset'))})));
  assert.ok(geometry.every(row=>row.columns===6),'exactly six columns');
  assert.ok(geometry.at(-1).inset>geometry[0].inset,'panel slopes right toward the bottom');
  assert.ok(await page.locator('#appearanceGrid').evaluate(el=>el.scrollHeight>=el.clientHeight),'roster keeps its independent scroll container');
  await page.waitForTimeout(450);
  if([880,390].includes(size.width))await page.screenshot({path:path.resolve(__dirname,`../../build/ui-review/character-editor-${size.width}.png`)});
 }
 await page.setViewportSize({width:1240,height:820});
 await page.evaluate(()=>{const card=document.querySelector('[data-appearance]');card.dataset.appearance='missing-portrait-test';handleAppearancePortraitError(card.querySelector('img'));});
 await page.waitForTimeout(80);
 assert.equal(await page.locator('[data-appearance="missing-portrait-test"]').count(),0,'failed portraits leave no empty card or text placeholder');
 assert.ok(await page.locator('.appearance-row').evaluateAll(rows=>rows.slice(0,-1).every(row=>row.children.length===6)),'remaining portraits pack into complete six-card rows');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.appearance-card').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.locator('[data-appearance]').last().focus();await page.keyboard.press('Tab');
 assert.equal(await page.getByRole('button',{name:'Back',exact:true}).evaluate(el=>el===document.activeElement),true,'Tab stays within dialog');
 await page.keyboard.press('Escape');
 await page.evaluate(()=>newChat());
 await page.locator('#characterName').fill('New companion');
 await page.locator('#saveCharacterButton').click();
 await page.locator('[data-appearance]').first().click();
 await page.locator('#saveCharacterButton').click();
 await page.locator('#characterDescription').fill('Thoughtful and curious');
 await page.locator('#characterGreeting').fill('Hi there');
 await page.locator('#saveCharacterButton').click();
 assert.equal(await page.locator('.review-step').isVisible(),true);
 await page.locator('#saveCharacterButton').click();
 assert.equal(await page.evaluate(()=>contacts.length),2,'four-step creation still saves');
 assert.deepEqual(errors,[]);
 console.log('Character editor passed: six-column diagonal layout, failed-portrait compaction, independent scrolling, direct editing, selection scroll/focus, cancel, save/persistence, conversation preservation, six sizes, reduced motion, focus containment, and new-character creation.');
 } finally {await browser.close();if(server.exitCode===null){const done=once(server,'exit');server.stdin.end();await done;}}
})().catch(e=>{console.error(e);process.exit(1)});
