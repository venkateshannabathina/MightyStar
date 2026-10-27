'use strict';
// Default migration regression (kept at the existing build-check entry point).
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/mightystar-ui.js'),'utf8');
const migration=source.slice(source.indexOf('// Migrate every existing'),source.indexOf('const navPages='));
const storage=new Map();const catalog=require('../../Sources/PocketTTS/catalog.json');
const context=vm.createContext({window:{MIGHTY_POCKET_CATALOG:catalog},contacts:[{id:'one',profile:{ttsProvider:'edge',voice:'en-GB-SoniaNeural',voiceSpeed:.9,memories:'Keep this'}},{id:'two',profile:{ttsProvider:'pocket',pocketVoice:'jean'}},{id:'three'}],defaultVoice:{ttsProvider:'edge'},readStored:(key,value)=>storage.has(key)?JSON.parse(storage.get(key)):value,localStorage:{setItem:(k,v)=>storage.set(k,v)},toast:message=>{throw Error(message)}});
vm.runInContext(migration,context);
assert(context.contacts.every(c=>c.profile.ttsProvider==='pocket'));
assert.equal(context.contacts[0].profile.voice,'en-GB-SoniaNeural');assert.equal(context.contacts[0].profile.voiceSpeed,.9);assert.equal(context.contacts[0].profile.memories,'Keep this');
assert.equal(context.contacts[0].profile.pocketVoice,'alba');assert.equal(context.contacts[1].profile.pocketVoice,'jean');assert.equal(context.defaultVoice.ttsProvider,'pocket');
context.contacts[0].profile.ttsProvider='openai';vm.runInContext(migration,context);assert.equal(context.contacts[0].profile.ttsProvider,'openai','later manual engine choices must survive restart');
assert.equal(JSON.parse(storage.get('mightyCharacters')).length,3);
console.log('Pocket defaults: one-time migration, preserved profiles/voice choices and later manual engine selection passed.');
