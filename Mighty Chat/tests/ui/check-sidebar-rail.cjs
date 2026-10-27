const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const output=path.resolve(__dirname,'../../build/sidebar-review');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:820},deviceScaleFactor:1});
 await context.route(/^https?:/,route=>route.abort());
 await context.addInitScript(()=>{localStorage.setItem('mightySidebarCollapsed','false');window.webkit={messageHandlers:{companion:{postMessage(){}}}};});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../Sources/index.html')).href);
 await page.evaluate(()=>{contacts=Array.from({length:12},(_,i)=>({id:'rail-'+i,name:['Lucy','Lynae','Rover','Hailey'][i%4]+(i>5?' '+i:''),color:['#d5bde3','#b7dbe9','#d2e0ac'][i%3],profile:{speak:false},appearance:{...appearances.find(a=>a.name===['Lucy','Lynae','Rover (Female)','Hailey'][i%4])}}));localStorage.setItem('mightyCharacters',JSON.stringify(contacts));renderChats();});
 await page.waitForTimeout(100);
 const width=()=>page.locator('.sidebar').evaluate(e=>e.getBoundingClientRect().width);
 const shot=name=>page.screenshot({path:path.join(output,name+'.png')});
 assert.equal(await width(),92,'compact layout overrides a saved expanded preference');
 for(const name of ['Expand sidebar','Collapse sidebar','Search characters and messages','Create character']){
  assert.equal(await page.getByRole('button',{name,exact:true,includeHidden:true}).count(),0,name+' control is removed');
 }
 assert.equal(await page.locator('#sidebarExpanded').getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('#sidebarExpanded').evaluate(e=>e.inert),true);
 assert.equal(await page.locator('#sidebarRail').getAttribute('aria-hidden'),'false');
 const background=await page.locator('#homeBackground').getAttribute('src');
 assert.equal(await page.locator('#railChats button').count(),12);
 assert.equal(await page.locator('#homeBackground').getAttribute('src'),background);
 const home=await page.locator('#homeBackground').boundingBox();assert.equal(home.x,92);assert.equal(home.width,1188);
 await shot('collapsed');
 await page.locator('#railChats button').first().hover();await page.waitForTimeout(700);assert.equal(await page.locator('#controlTooltip').innerText(),'Lucy');
 await page.locator('#railChats button').nth(1).click();assert.equal(await page.locator('#contactName').innerText(),'Lynae');assert.equal(await page.locator('#railChats button.selected').getAttribute('aria-label'),'Lynae');
 await page.evaluate(()=>showTextMode());await page.locator('#message').fill('Keep this draft');
 assert.equal(await page.locator('#message').inputValue(),'Keep this draft');
 assert.equal(await width(),92,'character selection keeps the compact layout');
 for(const [label,title] of [['Apps','Integrations'],['Invite & Earn','Invite & Earn'],['Settings','Account']]){
  await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('#settingsContent h1').innerText(),title);await page.evaluate(()=>closeCharacterSettings());
 }
 await page.getByRole('button',{name:'Home',exact:true}).click();assert.equal(await page.locator('#homeView').isVisible(),true);
 await page.reload();await page.waitForTimeout(400);assert.equal(await width(),92,'collapsed state survives relaunch');
 await page.setViewportSize({width:880,height:600});await shot('minimum');
 const footer=await page.locator('.rail-footer').boundingBox(),chats=await page.locator('.rail-chats').boundingBox();assert.ok(chats.y+chats.height<=footer.y+1);assert.ok(footer.y+footer.height<=600);
 assert.equal(await page.locator('.rail-chats').evaluate(e=>e.scrollHeight>e.clientHeight),true,'long avatar lists scroll');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await width(),92);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({compactWidth:92,checks:['removed sidebar/search/create controls','saved expanded preference ignored','avatar selection','draft preservation','footer navigation','Home','relaunch','minimum size scrolling','reduced motion'],errors},null,2));
 console.log('PASS: permanent compact sidebar, removed controls, avatar/navigation behavior, relaunch, scrolling and no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
