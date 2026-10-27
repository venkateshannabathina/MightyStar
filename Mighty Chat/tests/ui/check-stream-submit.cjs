'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/chat-ui.js'),'utf8');
let fail=false;const spoken=[],persisted=[];
const context=vm.createContext({selected:0,contacts:[{id:'c'}],saved:{},pendingReplies:new Set(),Date,Number,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setOrbState(){},renderMessages(){},renderChats(){},updateSend(){},toast(){},persistMessages(){persisted.push(JSON.parse(JSON.stringify(context.saved)));},localStorage:{setItem(){}},speakCharacterReply:async(c,text)=>spoken.push(text),requestCharacterReply:async(c,rows,onEvent)=>{
 onEvent({type:'assistant.delta',text:'Hello. '});onEvent({type:'assistant.delta',text:'There.'});
 if(fail)throw Error('Interrupted');
 return{reply:'Hello. There.',mood:'happy',intensity:.3,sentenceEvents:[{index:0,e:'happy',i:.3,g:'-'}]};
}});
vm.runInContext(source.slice(source.indexOf('async function submitText('),source.indexOf('async function sendMessage(')),context);
(async()=>{
 await vm.runInContext("submitText('Hey')",context);assert.equal(context.saved.c.length,2);assert.equal(context.saved.c[1].text,'Hello. There.');assert.equal(context.saved.c[1].meta.sentenceEvents.length,1);assert.deepEqual(spoken,['Hello. There.']);assert.equal(context.pendingReplies.size,0);
 fail=true;await vm.runInContext("submitText('Again')",context);assert.equal(context.saved.c.length,4);assert.equal(context.saved.c.at(-1).role,'error');assert.equal(context.saved.c.filter(r=>r.role==='assistant').length,1);assert.equal(spoken.length,1);assert.equal(context.pendingReplies.size,0);
 assert(persisted.every(snapshot=>snapshot.c.filter(r=>r.role==='assistant').every(r=>r.text==='Hello. There.')));
 context.window={};
 vm.runInContext(source.slice(source.indexOf('window.liveCallTurnMeta='),source.indexOf('window.liveCallMessage=')),context);
 context.saved.c.push({role:'assistant',text:'A call reply.',callChunk:true});
 const meta={characterId:'c',turnId:'one',sentenceEvents:[{index:0,e:'happy',i:.3,g:'-'}]};context.window.liveCallTurnMeta(meta);context.window.liveCallTurnMeta(meta);
 assert.equal(context.saved.c.at(-1).meta.turns.length,1);assert.equal(context.saved.c.at(-1).text,'A call reply.');
 console.log('Streaming submit: one saved reply, sentence meta, one clean speech request, incomplete row cleanup and pending-state recovery passed');
})().catch(e=>{console.error(e);process.exitCode=1});
