'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/companion-ui.js'),'utf8');
const messages=[],native=[],audio=[];
class Audio{constructor(){this.events={};audio.push(this);}addEventListener(name,callback){this.events[name]=callback;}async play(){this.currentTime=.1;this.events.play?.();}pause(){this.events.pause?.();}}
const c=vm.createContext({Audio,crypto:{randomUUID:()=> 'turn-'+messages.length},Date,performance:{now:()=>1},setInterval:()=>1,clearInterval(){},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},backendRequest:async()=>({audioId:'fixture',durationSeconds:2,words:[],mouthCues:[]}),fetch:async()=>({ok:true,blob:async()=>({})}),dockOrb:{speech(){}},dockFrame:{contentWindow:{postMessage:m=>messages.push(m)}},companionOrigin:()=> 'http://127.0.0.1:1',nativeCompanion:m=>native.push(m)});c.window=c;
vm.runInContext(source.slice(source.indexOf('let companionOutput='),source.indexOf('window.speakSavedMessage =')),c);
(async()=>{
 const character={id:'c',appearance:{key:'key'},profile:{speak:true}};
 assert.equal(c.mightyFaceEvent('text.submit',character),undefined);assert.equal(messages.length,0);
 c.mightyExprV2=true;const identity=c.mightyFaceEvent('text.submit',character);c.mightyFaceEvent('response.complete',character,{identity});
 const cues=[{index:0,e:'happy',i:.9,g:'-',offset:0}];await c.speakCharacterReply(character,'Hello.',{mood:'happy',intensity:.9},cues,identity);
 const performance=messages.find(m=>m.type==='mighty-companion-performance').performance;assert.equal(performance.identity.turnId,identity.turnId);assert.equal(performance.sentenceCues[0].e,'happy');
 assert.equal(messages.filter(m=>m.type==='mighty-companion-phase').length,2);assert(native.some(m=>m.action==='speech'&&m.kind==='phase'));
 c.cancelCharacterSpeech();assert(messages.some(m=>m.type==='mighty-companion-phase'&&m.value.type==='cancel'));assert(messages.every(m=>!JSON.stringify(m).includes('[[')));
 const next=c.mightyFaceEvent('text.submit',character);assert(next.generation>identity.generation);
 c.mightyFaceEvent('audio.complete',character,{identity:undefined});assert(messages.at(-1).value.identity,'Undefined optional identity must not overwrite the active identity.');
 c.mightyExprV2=false;c.mightyGesturesV2=true;const gestureIdentity=c.mightyFaceEvent('text.submit',character);await c.speakCharacterReply(character,'Gesture.',{mood:'neutral',intensity:0},[{index:0,e:'neutral',i:0,g:'talking',p:.8,offset:0}],gestureIdentity);const gesturePerformance=messages.filter(m=>m.type==='mighty-companion-performance').at(-1).performance;assert(gesturePerformance.identity);assert.equal(gesturePerformance.sentenceCues[0].g,'talking');assert.equal(gesturePerformance.sentenceCues[0].p,.8);c.cancelCharacterSpeech();
 const desktop=fs.readFileSync(path.resolve(__dirname,'../../Sources/desktop.js'),'utf8');
 const relay=vm.createContext({window:{setPlayerSpeech(){}},config:null,facePhase:null,speechPerformance:null,speechSnapshot:null});
 vm.runInContext(desktop.slice(desktop.indexOf('window.setDesktopSpeech='),desktop.indexOf('\n',desktop.indexOf('window.setDesktopSpeech='))),relay);
 relay.window.setDesktopSpeech('phase',{type:'response.complete'});relay.window.setDesktopSpeech('performance',{utteranceId:'complete'});relay.window.setDesktopSpeech('playback',{state:'ended'});assert.equal(relay.speechPerformance,null,'Completed v2 speech must not replay as an unfinished turn after view reload.');
 console.log('Director UI bridge: default-off, phase relay, turn identities, speech cues, cancellation and retry generation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
