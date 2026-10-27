'use strict';
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 let browser;
 try {
 const {port}=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',code=>reject(new Error('Backend exited '+code)));});
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage();
 await page.route('https://**/*',r=>r.abort());
 await page.route('**/Companion/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Renderer fixture</title>'}));
 await page.goto(`http://127.0.0.1:${port}`);
 const result=await page.evaluate(()=>{
  const original={id:'native-editor-test',name:'Original',description:'Original personality',favorite:true,profile:{job:'Partner',memories:'Keep this memory',voicePitch:10},appearance:{...appearances[0]}};
  contacts=[original];selected=0;saved={[original.id]:[{role:'user',text:'Keep this conversation'}]};
  window.mightyCompanionOrigin='http://127.0.0.1:1';window.mightyBackendToken='test';
  const messages=[];window.webkit={messageHandlers:{companion:{postMessage:p=>messages.push(p)}}};
  editCharacter();
  const opened=messages.find(p=>p.action==='editCharacter');
  const unchanged=contacts[0]===original && !document.getElementById('creatorBackdrop');
  const draft={...opened.character,name:'Renamed',description:'New personality',appearance:{...appearances[1]},profile:{...original.profile,aiProvider:'gemini',aiModel:'custom-model',voice:'en-IN-NeerjaNeural'}};
  const applied=window.applyNativeCharacterEditor(draft);
  const persisted=JSON.parse(localStorage.getItem('mightyCharacters'))[0];
  const validBefore=contacts[0];const invalid=window.applyNativeCharacterEditor({...draft,appearance:{key:'bad'}});
  const missing=window.applyNativeCharacterEditor({...draft,id:'missing'});
  const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('Quota');};
  const failed=window.applyNativeCharacterEditor({...draft,name:'Should not save'});Storage.prototype.setItem=setItem;
  return {opened:!!opened,catalogCount:opened.catalog.length,unchanged,applied,persisted,history:saved[original.id],invalid,missing,failed,rollback:contacts[0]===validBefore};
 });
 assert.ok(result.opened&&result.unchanged);assert.equal(result.catalogCount,10);assert.equal(result.applied.ok,true);
 assert.equal(result.persisted.name,'Renamed');assert.equal(result.persisted.favorite,true);assert.equal(result.persisted.profile.memories,'Keep this memory');
 assert.equal(result.persisted.profile.voicePitch,10);assert.equal(result.persisted.profile.aiProvider,'gemini');assert.equal(result.history[0].text,'Keep this conversation');
 assert.ok(result.invalid.error&&result.missing.error&&result.failed.error&&result.rollback);
 console.log('Native editor bridge passed: draft isolation, identity-based save, profile/history preservation, invalid drafts and storage rollback.');
 } finally {await browser?.close();server.stdin.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
