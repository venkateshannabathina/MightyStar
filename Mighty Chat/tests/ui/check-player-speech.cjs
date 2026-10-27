'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/companion-ui.js'),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
(async()=>{
 const media=[],messages=[],intervals=new Map();let nextInterval=0,pendingTTS=null;
 class Audio {
  constructor(){this.events={};this.paused=true;this.ended=false;this.currentTime=0;this.playbackRate=1;media.push(this);}
  addEventListener(name,fn){this.events[name]=fn;}
  async play(){this.paused=false;this.events.play?.();}
  pause(){this.paused=true;this.events.pause?.();}
 }
 const c=vm.createContext({Audio,crypto:{randomUUID:()=>String(media.length)},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  backendRequest:async()=>pendingTTS?await pendingTTS:{audioId:'id',durationSeconds:2,words:[{start:0,end:1,text:'Hello'}]},
  fetch:async()=>({ok:true,blob:async()=>({})}),setInterval:fn=>{intervals.set(++nextInterval,fn);return nextInterval;},clearInterval:id=>intervals.delete(id),
  performance:{now:()=>500},dockOrb:{speech(){}},dockFrame:null,previewFrame:null,companionOrigin:()=> 'http://127.0.0.1:1',
  nativeCompanion:message=>{messages.push(structuredClone(message));return true;},
  document:{getElementById:()=>({classList:{add(){}},setAttribute(){}})},
  viewNames:{standard:'Chat',player:'Player View',overlay:'Overlay'},selected:0,contacts:[{id:'character',appearance:{key:'test'},profile:{speak:true}}],
  companionMode:'standard',liveMotion:true,validAppearance:()=>true,setView(){},syncModeLabel(){},closeCharacterMenu(){},
  window:null});c.window=c;
 vm.runInContext(section('let companionOutput','window.speakSavedMessage'),c);
 c.setCompanionOutput({volume:.4,muted:false});
 await c.speakCharacterReply(c.contacts[0],'Hello');
 assert.equal(media[0].volume,.4);assert.equal(media[0].muted,false);
 const speech=messages.find(m=>m.kind==='performance').value;
 assert.equal(speech.text,'Hello');assert.equal(speech.words[0].text,'Hello');
 media[0].currentTime=.75;[...intervals.values()][0]();
 assert.equal(messages.at(-1).value.positionSeconds,.75,'subtitles follow the media clock even when the chat is hidden');
 c.setCompanionOutput({volume:.25,muted:true});assert.equal(media[0].volume,.25);assert.equal(media[0].muted,true);
 c.setCompanionOutput({muted:false});assert.equal(media[0].volume,.25);assert.equal(media[0].muted,false);
 vm.runInContext(section('function chooseViewMode','function askCharacter'),c);
 c.chooseViewMode('player');c.chooseViewMode('standard');
 assert.equal(media[0].paused,false,'view changes preserve ongoing reply playback');
 assert.equal(intervals.size,1);assert.ok(!messages.some(m=>m.action==='callEnd'),'view changes never end the live call');
 c.cancelCharacterSpeech();assert.equal(intervals.size,0);assert.equal(media[0].paused,true);
 assert.ok(messages.some(m=>m.kind==='playback'&&m.value.state==='cancelled'));
 let resolveTTS;pendingTTS=new Promise(resolve=>resolveTTS=resolve);
 const waiting=c.speakCharacterReply(c.contacts[0],'Cancelled before audio is ready');c.cancelCharacterSpeech();
 resolveTTS({audioId:'late',words:[]});await waiting;
 assert.equal(media.length,1,'cancelled speech cannot start late audio');
 console.log('PASS: spoken text/timestamps, actual playback clock relay, active volume/mute, view continuity and stale speech cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
