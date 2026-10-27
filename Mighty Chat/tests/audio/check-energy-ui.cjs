'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/companion-ui.js'),'utf8'),context=vm.createContext({setTimeout,clearTimeout});context.window=context;
vm.runInContext(source.slice(source.indexOf('async function createSpeechEnergy('),source.indexOf('function playbackSnapshot(')),context);
(async()=>{
 let created=0,closed=0,disconnected=0,bound=0;
 class Context{constructor(){created++;this.state='running';this.destination={};}async resume(){}createAnalyser(){return{connect(){},disconnect(){disconnected++},getFloatTimeDomainData(samples){samples.fill(.1)}}}createMediaElementSource(){bound++;return{connect(){},disconnect(){disconnected++}}}async close(){closed++}}
 context.AudioContext=Context;
 assert.equal(await context.createSpeechEnergy({}),null);assert.equal(created,0,'Flag off must not allocate an audio graph.');
 context.mightyEnergyJaw=true;let graph=await context.createSpeechEnergy({});assert(graph.read()>.5&&graph.read()<=1);graph.close();assert.equal(closed,1);assert.equal(disconnected,2);
 class Suspended extends Context{async resume(){this.state='suspended'}}context.AudioContext=Suspended;assert.equal(await context.createSpeechEnergy({}),null);assert.equal(bound,1,'Resume failure must leave the media element unbound.');
 class Stalled extends Context{resume(){return new Promise(()=>{})}}context.AudioContext=Stalled;assert.equal(await context.createSpeechEnergy({}),null,'A blocked resume must fall back within the bounded timeout.');assert.equal(bound,1);
 class BrokenAnalyser extends Context{createAnalyser(){return{connect(){throw Error('unavailable')}}}}context.AudioContext=BrokenAnalyser;graph=await context.createSpeechEnergy({});assert.equal(graph.read,undefined);graph.close();
 const messages=[],beforeClosed=closed;
 class Audio{constructor(){this.events={};}addEventListener(type,fn){this.events[type]=fn;}async play(){this.currentTime=.1;this.events.play?.();}pause(){this.events.pause?.();}}
 const playback=vm.createContext({Audio,AudioContext:Context,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},performance:{now:()=>1},crypto:{randomUUID:()=> 'fixture'},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},backendRequest:async()=>({audioId:'fixture',quality:'audio-only',mouthCues:[]}),fetch:async()=>({ok:true,blob:async()=>({})}),dockOrb:{speech:(kind,value)=>messages.push({kind,value})},dockFrame:null,companionOrigin:()=> 'http://127.0.0.1:1',nativeCompanion(){}});playback.window=playback;playback.mightyEnergyJaw=true;
 vm.runInContext(source.slice(source.indexOf('let companionOutput='),source.indexOf('window.speakSavedMessage =')),playback);
 await playback.speakCharacterReply({id:'c',profile:{speak:true}},'Fixture');assert.equal(messages.find(m=>m.kind==='performance').value.quality,'energy-envelope');
 playback.cancelCharacterSpeech();assert.equal(messages.at(-1).value.state,'cancelled');assert.equal(messages.at(-1).value.energy,0);assert.equal(closed,beforeClosed+1,'Cancel must dispose the active graph.');
 console.log('Browser energy graph: default-off allocation, bounded RMS, cleanup, blocked resume timeout and direct-output fallback passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
