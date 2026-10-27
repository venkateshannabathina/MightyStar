const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const server=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let output='',error='';const timer=setTimeout(()=>reject(Error('Backend startup timed out')),10000);server.stdout.on('data',b=>{output+=b;if(output.includes('\n')){clearTimeout(timer);resolve(JSON.parse(output.split('\n')[0]));}});server.stderr.on('data',b=>error+=b);server.once('exit',()=>{clearTimeout(timer);reject(Error('Backend stopped: '+error));});});
  const origin='http://127.0.0.1:'+ready.port;
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1240,height:820}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.nativeMessages=[];window.rendererLoads=[];window.rendererControls=[];window.webkit={messageHandlers:{companion:{postMessage:value=>nativeMessages.push(value)}}};window.addEventListener('message',event=>{if(event.data?.type==='fixture-appearance-load')rendererLoads.push(event.data.appearance);if(event.data?.type==='fixture-control')rendererControls.push(event.data.control);});});
  await page.route('https://phoshco.github.io/**',route=>route.request().resourceType()==='image'?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120"><rect width="96" height="120" fill="#51647b"/></svg>'}):route.fulfill({contentType:'application/json',body:JSON.stringify([{name:'Remote override',directory:'local/chars/hailey',pmx:'hailey.glb',image:'remote.jpeg'},{name:'Online fixture',directory:'gi/chars/online',pmx:'fixture.pmx',image:'online.png'}])}));
  await page.route('**/Companion/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Renderer fixture</title><script>addEventListener("message",event=>{if(event.data?.type==="mighty-companion-load")parent.postMessage({type:"fixture-appearance-load",appearance:event.data.appearance},"*");if(event.data?.type==="mighty-companion-control")parent.postMessage({type:"fixture-control",control:event.data},"*")})</script>'}));
  await page.route('**/api/appearance/cache',route=>route.fulfill({contentType:'application/json',body:'{"cached":true}'}));
  await page.goto(origin);
  assert.equal(await page.evaluate(()=>appearances.length),10);
  assert.equal(await page.evaluate(()=>appearances.some(item=>item.name==='Online fixture')),false,'remote data cannot expand the fixed roster');
  const localKey='local/chars/hailey/hailey.glb';
  assert.deepEqual(await page.evaluate(key=>{const item=appearances.find(item=>item.key===key);return {name:item.name,group:item.group,portrait:item.portrait,valid:validAppearance(item)};},localKey),{name:'Hailey',group:'The First Descendant',portrait:'local/chars/hailey/portrait.jpeg',valid:true},'fixed catalogue preserves the bundled character and supplied portrait');
  await page.evaluate(({origin,token})=>{
   configureCompanion(origin,token);
   contacts=[{id:'local-test',name:'My companion',description:'Existing personality',profile:{job:'Creative partner',greeting:'Hello',speak:false},appearance:{...appearances.find(item=>!item.directory.startsWith('local/'))}}];
   saved={'local-test':[{role:'user',text:'Keep this conversation',time:'09:00'}]};
   localStorage.setItem('mightyCharacters',JSON.stringify(contacts));selectChat(0);editCharacter();
  },{origin,token:ready.token});
  assert.ok(await page.evaluate(()=>nativeMessages.some(item=>item.action==='editCharacter'&&item.character.id==='local-test')),'editing an existing character hands off to the native editor');
  // Exercise the browser fallback explicitly; the native save path has its own bridge check.
  await page.evaluate(()=>{
   const bridge=window.webkit.messageHandlers.companion;
   delete window.webkit.messageHandlers.companion;
   try{editCharacter();}finally{window.webkit.messageHandlers.companion=bridge;}
  });
  const card=page.locator('[data-appearance="'+localKey+'"]');await card.waitFor();
  await page.waitForFunction(key=>document.querySelector('[data-appearance="'+key+'"]')?.dataset.portraitReady==='true',localKey);
  assert.equal(await card.locator('img').evaluate(image=>image.naturalWidth),360,'the collection loads the supplied photograph');
  await card.click();
  await page.waitForFunction(key=>rendererLoads.some(item=>item.key===key),localKey);
  const expectedPortrait=origin+'/assets/'+ready.token+'/local/chars/hailey/portrait.jpeg';
  assert.equal(await page.locator('#creatorPortrait img').getAttribute('src'),expectedPortrait);
  await page.evaluate(()=>goCreatorStep(3));assert.equal(await page.locator('#reviewModel img').getAttribute('src'),expectedPortrait,'review resolves the same authenticated portrait');
  await page.locator('#saveCharacterButton').click();
  assert.deepEqual(await page.evaluate(()=>({key:contacts[0].appearance.key,portrait:contacts[0].appearance.portrait,description:contacts[0].description,job:contacts[0].profile.job,history:saved['local-test'][0].text})),{key:localKey,portrait:'local/chars/hailey/portrait.jpeg',description:'Existing personality',job:'Creative partner',history:'Keep this conversation'});
  assert.equal(await page.locator('#contactAvatar img').getAttribute('src'),expectedPortrait);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mightyCharacters'))[0].appearance.key),localKey);
  assert.ok(await page.evaluate(key=>nativeMessages.some(item=>item.action==='view'&&item.mode==='overlay'&&item.character.appearance.key===key),localKey),'saved local appearance opens through the normal character view');
  await page.locator('#camera').click();
  assert.equal(await page.locator('#characterMenu').isVisible(),true,'the Companion view modes button keeps its menu open after the click bubbles');
  await page.locator('#characterMenu').getByRole('button',{name:'Overlay',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>{const item=nativeMessages.filter(item=>item.action==='view').at(-1);return {mode:item.mode,key:item.character.appearance.key};}),{mode:'overlay',key:localKey},'the menu opens the saved Hailey model in Overlay through the native host');
  assert.equal(await page.locator('#characterMenu').isVisible(),false);
  await page.evaluate(()=>openSettings('Cursor'));
  await page.locator('#settingsShell').getByRole('button',{name:'Companion view modes',exact:true}).click();
  assert.equal(await page.locator('#settingsShell').isVisible(),false);
  assert.equal(await page.locator('#characterMenu').isVisible(),true,'the settings window view-mode button also keeps the menu open');
  await page.locator('#characterMenu').getByRole('button',{name:'Overlay',exact:true}).click();
  await page.goto(origin+'/desktop.html');
  await page.evaluate(({origin,token})=>configureDesktop({origin,token,mode:'overlay',playing:true,character:{id:'local-hailey',name:'Hailey',appearance:{key:'local/chars/hailey/hailey.glb',directory:'local/chars/hailey',file:'hailey.glb',portrait:'local/chars/hailey/portrait.jpeg'}}}),{origin,token:ready.token});
  await page.waitForFunction(()=>rendererControls.some(value=>value.desktopInteraction));
  assert.equal(await page.locator('#menu .portrait img').getAttribute('src'),expectedPortrait,'desktop identity uses the supplied portrait');
  await page.evaluate(()=>{rendererControls.length=0;setDesktopHover(true);setDesktopHover(true);setDesktopHover(false);});
  await page.waitForFunction(()=>rendererControls.length===2);
  assert.deepEqual(await page.evaluate(()=>rendererControls.map(value=>value.hovered)),[true,false],'hover relay only sends state changes');
  await page.evaluate(()=>{rendererControls.length=0;setDesktopMotion(false);setDesktopHover(true);setDesktopMotion(true);});
  await page.waitForFunction(()=>rendererControls.filter(value=>'hovered' in value).length===3);
  assert.deepEqual(await page.evaluate(()=>rendererControls.filter(value=>'hovered' in value).map(({playing,hovered})=>({playing,hovered}))),[{playing:false,hovered:false},{playing:undefined,hovered:true},{playing:true,hovered:true}],'pause/resume relays current pointer state so hover resumes without needing a new pointer entry');
  await page.evaluate(()=>{rendererControls.length=0;setDesktopHover(true);configureDesktop({...config,character:{...config.character,id:'another-hailey'}});});
  // Reconfiguration also sends a pointer message, which can follow the hover reset.
  await page.waitForFunction(()=>rendererControls.some(value=>value.hovered===false));
  assert.deepEqual(errors,[]);
  console.log('Bundled character UI: fixed roster, supplied portrait, preview/review, save/persistence, personality/history, normal view, desktop portrait and hover relay passed');
 }finally{await browser?.close();server.stdin.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
