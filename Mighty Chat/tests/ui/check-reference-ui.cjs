const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1214,height:814},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://phoshco.github.io/**',r=>r.abort());
 await page.goto('http://127.0.0.1:8765');
 await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/home.png')});
 for(const name of ['Account','General','Voice','Microphone','Shortcuts','Agents','Integrations','Dictation','Cursor','Invite & Earn']){
  await page.evaluate(p=>openSettings(p),name);await page.waitForTimeout(70);
  assert.equal(await page.locator('#settingsContent h1').textContent(),name);
  if(['Voice','General','Shortcuts','Integrations','Account','Agents','Microphone'].includes(name))await page.screenshot({path:path.resolve(__dirname,`../../build/ui-review/${name.toLowerCase()}.png`)});
  assert.equal(await page.evaluate(()=>document.querySelector('.settings-content').getBoundingClientRect().right<=innerWidth),true);
 }
 await page.evaluate(()=>openSettings('Voice'));
 await page.getByRole('button',{name:'0.5x',exact:true}).click();
 assert.equal(await page.evaluate(()=>currentProfile().voiceSpeed),.5);
 await page.evaluate(()=>{contacts=[{id:'fixture-one',name:'Research Buddy',profile:{job:'Research assistant',speak:false},description:'A thoughtful partner for your next idea.',color:'#d3c9ea',preview:'Start a conversation'},{id:'fixture-two',name:'Build Coach',profile:{speak:false},color:'#ecd7b1'}];saved={'fixture-one':[{role:'assistant',text:'**Make one clear plan.**\n\n1. Inspect the existing project.\n2. Match the reference in every detail.\n3. Keep your characters and conversations.\n\nUse `MightyStar` for your next idea.',time:'9:14 PM'}]};selectChat(0);});
 await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/conversation.png')});
 await page.evaluate(()=>toggleInspector());await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/inspector.png')});
 await page.evaluate(()=>{closeInspector();showTextMode()});
 await page.locator('#message').fill('Draft for Research Buddy');await page.locator('#message').dispatchEvent('input');
 await page.evaluate(()=>selectChat(1));await page.locator('#message').fill('Draft for Build Coach');await page.locator('#message').dispatchEvent('input');
 await page.evaluate(()=>selectChat(0));assert.equal(await page.locator('#message').inputValue(),'Draft for Research Buddy');
 await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/text.png')});
 await page.evaluate(()=>{toggleShortcuts()});await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/shortcuts-popover.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#shortcutPopover').isVisible(),false);
 await page.evaluate(()=>newChat());assert.equal(await page.locator('#creatorBackdrop').isVisible(),true);await page.keyboard.press('Escape');
 assert.equal(await page.locator('#creatorBackdrop').isVisible(),false);
 await page.evaluate(()=>{openSettings('Integrations')});await page.locator('#integrationSearch').fill('doesnotexist');assert.equal(await page.getByText('No integrations found',{exact:true}).isVisible(),true);
 await page.evaluate(()=>openSettings('Voice'));await page.setViewportSize({width:880,height:600});await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/voice-small.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>{closeCharacterSettings();selectChat(0);showVoiceMode()});await page.screenshot({path:path.resolve(__dirname,'../../build/ui-review/chat-small.png')});
 const hold=await page.locator('#holdTalk').boundingBox(),type=await page.locator('.type-button').boundingBox();assert.ok(hold.x+hold.width<=type.x+1,'voice controls must not overlap');assert.ok(type.x+type.width<=880,'voice controls fit minimum width');

 // Inspect every settings page at the supported minimum and larger desktop sizes.
 for(const size of [{width:880,height:600},{width:1024,height:700},{width:1240,height:820},{width:1600,height:1000}]){
  await page.setViewportSize(size);
  for(const name of ['Account','General','Voice','Microphone','Shortcuts','Agents','Integrations','Dictation','Cursor','Invite & Earn']){
   await page.evaluate(p=>openSettings(p),name);
   const outside=await page.locator('.settings-content button,.settings-content select,.settings-card').evaluateAll(els=>els.filter(el=>el.getClientRects().length).filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).map(el=>el.textContent.trim().slice(0,60)));
   assert.deepEqual(outside,[],`${name} controls fit at ${size.width}`);
  }
  await page.evaluate(()=>{closeCharacterSettings();selectChat(0);showTextMode()});
  await page.locator('#message').fill('A long draft '.repeat(80));await page.locator('#message').dispatchEvent('input');
  const input=await page.locator('.text-field').boundingBox(),send=await page.locator('#send').boundingBox();
  assert.ok(input.x+input.width<=size.width&&send.y+send.height<=size.height,'multiline composer fits');
  await page.evaluate(()=>{showVoiceMode();newChat()});
  await page.locator('#characterName').fill('Test character');
  for(let step=0;step<4;step++){
   await page.evaluate(n=>{draftAppearance={...appearances[0]};document.getElementById('characterDescription').value='Thoughtful and curious';document.getElementById('characterGreeting').value='Hello there';goCreatorStep(n);},step);
   assert.equal(await page.locator(`.wizard-step[data-step="${step}"]`).isVisible(),true);
   const form=await page.locator('#creatorForm').boundingBox(),save=await page.locator('#saveCharacterButton').boundingBox();
   assert.ok(form.x>=0&&form.x+form.width<=size.width&&save.y+save.height<=size.height,`editor ${step} fits ${size.width}`);
   assert.ok(await page.locator('.wizard-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'editor has no horizontal overflow');
   if(size.width===1240){await page.waitForTimeout(200);await page.screenshot({path:path.resolve(__dirname,`../../build/ui-review/editor-${step}.png`)});}
  }
  await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>showHome());
 await page.getByRole('button',{name:'Create character',exact:true}).hover();await page.waitForTimeout(600);
 assert.equal(await page.locator('#controlTooltip').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.mouse.move(700,400);await page.waitForTimeout(200);
 assert.equal(await page.locator('#controlTooltip').evaluate(el=>getComputedStyle(el).opacity),'0');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>newChat());
 assert.equal(await page.locator('#creatorForm').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.keyboard.press('Escape');
 await page.route('**/Companion/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Renderer fixture</title>'}));
 await page.evaluate(()=>{
  window.nativeMessages=[];
  window.webkit={messageHandlers:{companion:{postMessage:value=>nativeMessages.push(value)}}};
  contacts[0].appearance={...appearances[0]};
  selectChat(0);
  configureCompanion('http://127.0.0.1:8765','a'.repeat(43));
 });
 assert.equal(await page.locator('#companionStage,.composer-zone .dock').count(),0,'chat has no embedded character above talk controls');
 assert.equal(await page.locator('#holdTalk').isVisible(),true,'talk remains available with overlay');
 assert.deepEqual(await page.evaluate(()=>{const message=nativeMessages.filter(m=>m.action==='view').at(-1);return {mode:message.mode,keepChatVisible:message.keepChatVisible,id:message.character.id};}),{mode:'overlay',keepChatVisible:true,id:'fixture-one'},'character opens in overlay after backend becomes ready');
 await page.evaluate(()=>{toggleCharacterMenu()});
 assert.equal(await page.locator('#characterMenu .view-options button').allTextContents().then(labels=>labels.includes('Docked')),false);
 await page.evaluate(()=>chooseViewMode('standard'));
 assert.equal(await page.evaluate(()=>companionMode),'standard');
 await page.evaluate(()=>{nativeMessages.length=0;configureCompanion('http://127.0.0.1:8766','b'.repeat(43));});
 assert.equal(await page.evaluate(()=>nativeMessages.some(m=>m.action==='view')),false,'returning to Chat stays closed after backend reconnect');
 await page.evaluate(()=>chooseViewMode('docked'));
 assert.equal(await page.evaluate(()=>nativeMessages.filter(m=>m.action==='view').at(-1).mode),'overlay','legacy docked requests use overlay');
 await page.evaluate(()=>{selectChat(1);});
 assert.equal(await page.evaluate(()=>companionMode),'standard','characters without a model remain usable in chat');
 await page.evaluate(()=>{selectChat(0);editCharacter();});
 assert.ok(await page.evaluate(()=>nativeMessages.some(message=>message.action==='editCharacter'&&message.character.id==='fixture-one')),'existing characters open the native editor');
 // Explicitly exercise the browser fallback before checking its renderer reload.
 await page.evaluate(()=>{
  const bridge=window.webkit.messageHandlers.companion;
  delete window.webkit.messageHandlers.companion;
  try{editCharacter();}finally{window.webkit.messageHandlers.companion=bridge;}
 });
 const before=await page.locator('#appearancePreview iframe').getAttribute('src');
 await page.evaluate(()=>configureCompanion('http://127.0.0.1:8765','c'.repeat(43)));
 assert.notEqual(await page.locator('#appearancePreview iframe').getAttribute('src'),before,'backend restart recreates editor preview');
 assert.equal(await page.locator('#appearancePreview iframe').getAttribute('src'),'http://127.0.0.1:8765/Companion/index.html');
 await page.evaluate(()=>closeCreator());
 assert.deepEqual(errors,[]);
 console.log('Settings navigation, 0.5x persistence, per-character drafts, inspector, popover, creator, search, all four editor steps, multiline composer, four window sizes, tooltip, reduced motion and browser runtime checks passed.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
