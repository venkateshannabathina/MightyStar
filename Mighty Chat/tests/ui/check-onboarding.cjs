'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sources=path.resolve(__dirname,'../../Sources');
const html=fs.readFileSync(path.join(sources,'onboarding.html'),'utf8');
function element(name=""){return {dataset:{name,character:name.toLowerCase()},style:{},hidden:false,inert:false,handlers:{},setAttribute(){},focus(){},addEventListener(type,fn){this.handlers[type]=fn;}};}
const items=['Evelyn','Lynae','Lucy','Rover'].map(element),previous=element(),next=element(),hint=element(),name=element(),announcement=element(),login=element(),google=element();
for(const item of items)item.animate=()=>({finished:Promise.resolve(),cancel(){}});
const stage=element();stage.hidden=true;stage.clientWidth=1120;stage.clientHeight=760;
stage.querySelectorAll=()=>items;
stage.querySelector=selector=>({'[role="status"]':announcement,'.carousel-name':name,'.previous':previous,'.next':next,'.enter-hint':hint})[selector];
const handlers={},messages=[];
const context=vm.createContext({document:{querySelector:selector=>({'#reference-carousel':stage,'.layout':login,'#google':google})[selector]},matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>handlers[type]=fn,setTimeout,clearTimeout,console});
context.window=context;context.webkit={messageHandlers:{onboarding:{postMessage:message=>messages.push(message)}}};
const script=html.match(/<script>\(function\(\)\{([\s\S]*?)\}\)\(\);/)[0].replace('<script>','');
vm.runInContext(script,context);
function key(value){handlers.keydown({key:value,preventDefault(){}});}
async function settle(){for(let i=0;i<5;i++)await Promise.resolve();}
(async()=>{
 key('Enter');assert.equal(messages.length,0,'hidden welcome must not select a character');
 context.enterCarousel();assert.equal(name.textContent,'Evelyn');assert.equal(items.length,4);
 key('Enter');assert.equal(messages.at(-1).character,'evelyn');
 key('ArrowRight');await settle();assert.equal(name.textContent,'Lynae');hint.handlers.click();assert.equal(messages.at(-1).character,'lynae');
 key('ArrowRight');await settle();assert.equal(name.textContent,'Lucy');
 key('ArrowRight');await settle();assert.equal(name.textContent,'Rover');key('Enter');assert.equal(messages.at(-1).character,'rover');
 key('ArrowRight');await settle();assert.equal(name.textContent,'Evelyn','four-character wrap');
 key('Escape');assert(stage.hidden);assert.equal(login.inert,false);
 assert(!/JACK IN|tactical|type="email"/.test(html));
 assert(html.includes('Get started'));
 // The main host bridge changes only the requested character and persists before opening.
 const bridge=fs.readFileSync(path.join(sources,'companion-ui.js'),'utf8').split('// Native v0.1 startup')[1];
 const contacts=items.map(item=>({id:item.dataset.character,profile:{personaId:item.dataset.character,pocketVoice:'alba'}}));
 const calls=[],storage=new Map();
 const main=vm.createContext({contacts,localStorage:{setItem:(k,v)=>storage.set(k,v)},selectChat:i=>calls.push(['select',i]),chooseViewMode:mode=>calls.push(['mode',mode])});main.window=main;
 vm.runInContext('// Native v0.1 startup'+bridge,main);
 assert.equal(main.mightyLaunchOnboardedCharacter({character:'lucy',provider:'groq',model:'model'}),false,'wait for backend');
 main.mightyCompanionOrigin='http://127.0.0.1:1234';
 assert.equal(main.mightyLaunchOnboardedCharacter({character:'hailey',provider:'groq',model:'model'}),false);
 assert.equal(main.mightyLaunchOnboardedCharacter({character:'lucy',provider:'groq',model:'model'}),true);
 assert.deepEqual(calls,[['select',2],['mode','overlay']]);
 assert.equal(contacts[2].profile.aiProvider,'groq');assert.equal(contacts[2].profile.pocketVoice,'alba');assert.equal(contacts[0].profile.aiProvider,undefined);
 assert(storage.has('mightyCharacters'));
 console.log('PASS: welcome gating, four selections, Enter/click confirmation, wrap, Escape, backend readiness, persisted identity and overlay routing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
