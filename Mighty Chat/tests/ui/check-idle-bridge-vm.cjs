'use strict';
// Exercise the real bridge functions in a VM, without browser automation,
// network access, user storage or launching the installed application.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'../..');
const source = name => fs.readFileSync(path.join(root,'Sources',name),'utf8');
const slice = (text,start,end) => {
 const a=text.indexOf(start),b=text.indexOf(end,a);
 assert.ok(a>=0&&b>a,`Missing source boundary ${start}`);return text.slice(a,b);
};
const ui=source('companion-ui.js'),messages=[],stored=new Map();
let storageFails=false,chatSelections=0;
const character={id:'saved',name:'Hailey',favorite:true,description:'Keep personality',appearance:{key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'},profile:{editorSettings:{version:1,appearanceKey:'local/chars/hailey/hailey.glb',face:{'morph:0':.4},hiddenParts:['mesh:0']},animationTuning:{enabled:true,physicsEnabled:true,jiggleEnabled:true,speed:0.8,strength:1,bones:{Head:[10,0,0]}},idleStyle:'male',voice:'keep-voice',memories:'Keep memories'}};
const context=vm.createContext({contacts:[structuredClone(character)],selected:0,companionMode:'portrait',liveMotion:false,
 localStorage:{setItem(key,value){if(storageFails)throw new Error('Quota');stored.set(key,value);},getItem:key=>stored.get(key)},
 nativeCompanion:value=>messages.push(structuredClone(value)),rendererControl:value=>messages.push(structuredClone(value)),
 renderCharacterMenu(){},renderChats(){},selectChat(){chatSelections++;},toast(){}});
context.window=context;
vm.runInContext(source('catalog.js'),context);
vm.runInContext(slice(ui,'const idleStyles','let appearances')+slice(ui,'function validAppearance','function companionOrigin')+
 slice(ui,'window.applyNativeCharacterEditor','function editCharacter')+
 slice(ui,'window.applyVoiceSettings','window.previewVoiceSettings'),context);
assert.equal(context.applyIdleStyle({characterId:'saved',idleStyle:'dwarf2'}).ok,true);
assert.equal(JSON.parse(stored.get('mightyCharacters'))[0].profile.idleStyle,'dwarf2');
assert.equal(context.contacts[0].profile.memories,'Keep memories');
assert.equal(context.companionMode,'portrait');assert.equal(context.liveMotion,false);assert.equal(chatSelections,0);
assert.equal(messages.at(-1).action,'selection');assert.equal(messages.at(-1).mode,'portrait');
let previous=context.contacts[0],count=messages.length;
storageFails=true;
assert.ok(context.applyIdleStyle({characterId:'saved',idleStyle:'female'}).error);
assert.equal(context.contacts[0],previous);assert.equal(messages.length,count);
storageFails=false;
for(const idleStyle of ['toString','__proto__',null,{},['male']])assert.ok(context.applyIdleStyle({characterId:'saved',idleStyle}).error);
assert.equal(context.contacts[0],previous);
assert.equal(context.applyVoiceSettings({characterId:'saved',profile:{voice:'new-voice',editorSettings:{hiddenParts:[]},idleStyle:'male',animationTuning:{bones:{Head:[-10,0,0]}}}}).ok,true);
assert.equal(context.contacts[0].profile.idleStyle,'dwarf2','old voice settings cannot revert a new idle choice');
assert.equal(context.contacts[0].profile.animationTuning.bones.Head[0],10,'stale voice settings cannot revert bone tuning');
assert.deepEqual(context.contacts[0].profile.editorSettings.hiddenParts,['mesh:0'],'stale voice settings cannot revert face or clothes edits');
previous=context.contacts[0];storageFails=true;
assert.ok(context.applyVoiceSettings({characterId:'saved',profile:{voice:'unsaved'}}).error);
assert.equal(context.contacts[0],previous);storageFails=false;
const draft=structuredClone(context.contacts[0]);draft.profile.idleStyle='female';draft.profile.editorSettings.face['morph:0']=.7;
assert.equal(context.contacts[0].profile.idleStyle,'dwarf2','an isolated editor draft leaves the saved style untouched until Save');
storageFails=true;assert.ok(context.applyNativeCharacterEditor(draft).error);
assert.equal(context.contacts[0],previous);storageFails=false;
assert.equal(context.applyNativeCharacterEditor(draft).ok,true);
assert.equal(context.contacts[0].profile.idleStyle,'female');assert.equal(context.contacts[0].favorite,true);assert.equal(context.contacts[0].profile.editorSettings.face['morph:0'],.7,'Save commits facial edits');
assert.equal(context.contacts[0].profile.animationTuning.bones.Head[0],10,'native save preserves bone tuning');
assert.equal(context.contacts[0].profile.animationTuning.physicsEnabled,true,'physics preference survives native save');
assert.equal(context.contacts[0].profile.animationTuning.jiggleEnabled,true,'jiggle preference survives native save');
assert.equal(context.applyNativeCharacterEditor({...draft,profile:{idleStyle:'invalid'}}).ok,true);
assert.equal(context.contacts[0].profile.idleStyle,'female');

vm.runInContext(slice(source('mightystar-ui.js'),'function restoreLastCompanion','hydrateSymbols();'),context);
let restored=-1;context.selectChat=index=>{restored=index;};
context.contacts=[null,{id:'text-only'},structuredClone(character),{...structuredClone(character),id:'other'}];
stored.set('mightyLastCharacter','other');context.restoreLastCompanion();assert.equal(restored,3);
stored.set('mightyLastCharacter','missing');context.restoreLastCompanion();assert.equal(restored,2);
context.contacts=[];restored=-1;context.restoreLastCompanion();assert.equal(restored,-1);

const posts=[],hosts=[],listeners=new Map(),nodes=new Map();
function node(id){
 if(nodes.has(id))return nodes.get(id);
 const classes=new Set(),value={id,hidden:id==='menu'||id==='area'||id==='desktopRecovery',dataset:{},src:'',innerHTML:'',offsetWidth:220,offsetHeight:300,scrollWidth:100,
 style:{setProperty(){}},classList:{contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)},
 addEventListener(type,fn){listeners.set(id+':'+type,fn);},setAttribute(){},focus(){},
 cloneNode(){return {...this};},replaceWith(next){nodes.set(id,next);},
 getBoundingClientRect:()=>({x:0,y:0,width:100,height:24}),contentWindow:{postMessage:value=>posts.push(structuredClone(value))}};
 nodes.set(id,value);return value;
}
const desktop=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},body:node('body')},
 innerWidth:360,innerHeight:650,requestAnimationFrame:fn=>fn(),clearTimeout(){},setTimeout:()=>1,setInterval:()=>1,performance:{now:()=>0},
 ResizeObserver:class {observe(){}},URL,console,addEventListener(){},webkit:{messageHandlers:{companion:{postMessage:value=>hosts.push(structuredClone(value))}}}});
desktop.window=desktop;vm.runInContext(source('desktop.js'),desktop);
const config={origin:'http://127.0.0.1:1',token:'test',mode:'portrait',playing:false,talkHeld:false,talkHintDismissed:true,character:structuredClone(character)};
desktop.configureDesktop(config);desktop.configureDesktop(config);
assert.equal(posts.find(p=>p.type==='mighty-companion-load').idleStyle,'male');
desktop.setDesktopPointer(2,-3,true);assert.equal(posts.at(-1).pointer.valid,false,'pause suppresses gaze');
desktop.setDesktopMotion(true);assert.deepEqual(posts.at(-1).pointer,{x:1,y:-1,valid:true});
assert.equal(posts.filter(p=>p.type==='mighty-companion-load').at(-1).animationTuning.bones.Head[0],10,'desktop receives saved bone tuning');
desktop.openDesktopMenu();assert.equal(posts.at(-1).pointer.valid,false,'menu suppresses gaze');
listeners.get('menu:click')({target:{closest:()=>({dataset:{action:'idle'}})}});
listeners.get('menu:click')({target:{closest:()=>({dataset:{idleStyle:'dwarf2'}})}});
assert.equal(hosts.at(-1).action,'desktopIdleStyle');assert.equal(hosts.at(-1).idleStyle,'dwarf2');
assert.equal(nodes.get('menu').hidden,false,'choosing a style keeps the existing menu open');
assert.deepEqual(posts.filter(p=>p.type==='mighty-companion-load').at(-1).editorSettings,config.character.profile.editorSettings,'desktop restores saved face and visibility');
const updated={...config,character:{...config.character,profile:{...config.character.profile,idleStyle:'dwarf2'}}};
desktop.configureDesktop(updated);
assert.equal(nodes.get('menu').hidden,false);assert.match(nodes.get('menu').innerHTML,/data-idle-style="dwarf2"/);
assert.equal(posts.filter(p=>p.type==='mighty-companion-control'&&'playing'in p).at(-1).playing,false);
desktop.dismissDesktopMenu();desktop.setDesktopMotion(true);
desktop.setDesktopPointer(NaN,0,true);assert.deepEqual(posts.at(-1).pointer,{x:0,y:0,valid:false});
desktop.setDesktopPointer(.8,.4,true);assert.equal(posts.at(-1).pointer.valid,true);
desktop.configureDesktop({...updated,playing:true,character:{...updated.character,id:'new'}});
assert.equal(posts.at(-1).pointer.valid,false,'a newly selected character does not inherit an old pointer');
desktop.configureDesktop({...updated,character:{...updated.character,profile:{idleStyle:['male']}}});
assert.equal(posts.filter(p=>p.type==='mighty-companion-load').at(-1).idleStyle,'female');
const main=source('main.swift');
assert.match(main,/action == "motion"[\s\S]*?desktopConfig\?\["playing"\] = playing/,'native pause survives later configuration updates');
console.log('PASS: idle profile persistence, invalid input, storage rollback, draft isolation, voice preservation, startup restoration, desktop menu/pause preservation and pointer lifecycle');
