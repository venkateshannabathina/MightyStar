'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=path.resolve(__dirname,'../..');
const roster=require('../../Sources/catalog.js');
const {assetPath,modelPath}=require('../../Backend/assets/CharacterCache.cjs');
const identities=new Set(['Lynae','Lucy','Rover (Male)','Rover (Female)','Hailey','Evelyn']);
assert.equal(roster.appearances.length,10);
assert.deepEqual(new Set(roster.appearances.map(item=>item.name)),identities);
for(const item of [...roster.appearances,...roster.legacyAppearances]){
 assert(roster.validAppearance(item));
 assert.equal(modelPath(item),item.key);
 assert.equal(assetPath(item.key),item.key);
 assert(!roster.validAppearance({...item,key:item.key+'-invalid'}));
 assert(!roster.validAppearance({...item,name:'Removed character'}));
}
assert.throws(()=>assetPath('ww/chars/removed/model.pmx'));
assert.throws(()=>assetPath('ww/chars/removed/portrait.png'));
assert.throws(()=>modelPath({directory:'ww/chars/removed',file:'model.pmx'}));
assert.equal(roster.appearances.find(item=>item.name==='Lucy').directory,'ww/chars/Lucy');
assert.equal(roster.appearances.find(item=>item.name==='Evelyn').directory,'zzz/chars/Evelyn Chevalier');
for(const key of ['zzz/chars/Lucy/Lucy/露西_帽.pmx','zzz/chars/Lucy/露西_帽.pmx','zzz/ZZZ/Lucy.png'])assert.throws(()=>assetPath(key));
// Migrate real startup state: preserve retained profiles and histories, drop removed selections.
const kept=roster.appearances.map((appearance,index)=>({id:'keep-'+index,name:'Custom name '+index,appearance:{...appearance},profile:{memories:'Keep this',idleStyle:'male'}}));
kept.push({id:'legacy',name:'Rover',appearance:{...roster.legacyAppearances[0]}});
kept.push({id:'existing-wuwa-lucy',name:'Lucy',appearance:{...roster.appearances.find(item=>item.name==='Lucy'),name:'Lucy (WuWa)'},profile:{memories:'Existing Lucy memory'}});
const messages=Object.fromEntries(kept.map(item=>[item.id,[{role:'user',text:'Keep history'}]]));
const storage=new Map([
 ['mightyCharacters',JSON.stringify([...kept,{id:'removed',name:'Removed',appearance:{key:'ww/chars/removed/model.pmx',directory:'ww/chars/removed',file:'model.pmx'}}])],
 ['mightyCharacterMessages',JSON.stringify(messages)],['mightyLastCharacter','removed']
]);
const context=vm.createContext({window:{},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
vm.runInContext(fs.readFileSync(path.join(app,'Sources/catalog.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(app,'Sources/chat-personas.js'),'utf8'),context);
const chat=fs.readFileSync(path.join(app,'Sources/chat-ui.js'),'utf8');
vm.runInContext(chat.slice(0,chat.indexOf('let selected='))+'\nglobalThis.result={contacts,saved};',context);
assert.equal(context.result.contacts.length,4);
assert.deepEqual(Array.from(context.result.contacts,c=>c.name),['Lynae','Rover','Lucy','Evelyn Chevalier']);
assert.equal(context.result.contacts[0].profile.memories,undefined,'old user memory is not imported');
assert.equal(context.result.contacts[0].profile.idleStyle,'male','visual settings survive');
assert.equal(JSON.stringify(context.result.saved),JSON.stringify(messages),'old visible histories remain intact');
assert(!storage.has('mightyLastCharacter'));
assert.equal(JSON.parse(storage.get('mightyCharacters')).length,4);
assert.equal(JSON.parse(storage.get('mightyChatRosterBackupV1')).length,kept.length+1);
assert(context.result.contacts.every(c=>c.appearance.name!=='Rover (Female)'));
const restarted=vm.createContext({window:{},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
for(const name of ['catalog.js','chat-personas.js'])vm.runInContext(fs.readFileSync(path.join(app,'Sources',name),'utf8'),restarted);
vm.runInContext(chat.slice(0,chat.indexOf('let selected='))+'\nglobalThis.result={contacts,saved};',restarted);
assert.equal(JSON.stringify(restarted.result.contacts),JSON.stringify(context.result.contacts),'stable IDs and settings on restart');
const ui=fs.readFileSync(path.join(app,'Sources/companion-ui.js'),'utf8');
assert(!ui.includes('appearanceSources'));
assert(!ui.includes("fetch('https://phoshco.github.io/"));
// Every editable and served prototype catalog must stay inside the same identities.
for(const viewer of ['model-viewer-clean','upstream-model-viewer']){
 for(const resources of ['res/assets','docs/res/assets']){
  const base=path.resolve(app,'..',viewer,resources);
  for(const directory of ['Genshin','HSR','ZZZ','WuWa','HNA','NTE']){
   for(const file of fs.readdirSync(path.join(base,directory)).filter(file=>file.endsWith('.json'))){
    for(const item of JSON.parse(fs.readFileSync(path.join(base,directory,file),'utf8'))){
     assert(identities.has(item.name),`${viewer}/${resources}/${directory}/${file}: ${item.name}`);
     assert.equal(modelPath({directory:item.directory,file:item.pmx}),item.directory+'/'+item.pmx);
    }
   }
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(base,'extras.json'),'utf8')),[]);
 }
}
console.log('PASS: fixed roster, model/asset rejection, legacy paths, saved-state migration, profile/history preservation and all viewer catalogs');
