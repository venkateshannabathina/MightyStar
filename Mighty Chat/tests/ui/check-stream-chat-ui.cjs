'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../Sources/companion-ui.js'),'utf8');
const start=source.indexOf('const memoryRegistered='),end=source.indexOf('let companionOutput=',start);
let mode='stream',cancelled=false;const seen=[],requests=[];
const events=[{type:'sentence.start',index:0,e:'happy',i:.4,g:'-'},{type:'assistant.delta',text:'Héllo. '},{type:'assistant.delta',text:'You.'},{type:'response.complete',reply:'Héllo. You.',sentenceEvents:[{index:0,e:'happy',i:.4,g:'-'}]}];
const context=vm.createContext({window:{mightyBackendToken:'fixture'},TextEncoder,TextDecoder,globalThis:{crypto:{randomUUID:()=> 'stable'}},companionOrigin:()=> 'http://127.0.0.1:1234',backendRequest:async(route,options)=>{requests.push({route,...options});return{reply:'Legacy'};},fetch:async(url,options)=>{
 requests.push({url,...options});
 if(mode==='cached')return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({reply:'Cached'})};
 const bytes=new TextEncoder().encode(events.map(e=>JSON.stringify(e)).join('\n')+'\n');let index=0;
 return{ok:true,headers:{get:()=> 'application/x-ndjson'},body:{getReader:()=>({read:async()=>index<bytes.length?{value:bytes.slice(index,index+=1),done:false}:{done:true},cancel:async()=>{cancelled=true;}})}};
},onEvent:e=>seen.push(e)});
vm.runInContext(source.slice(start,end),context);
(async()=>{
 context.window.mightyStreamChat=true;context.character={id:'c',name:'Mira'};context.rows=[{role:'user',text:'Hey'}];
 let result=await vm.runInContext('requestCharacterReply(character,rows,onEvent)',context);
 assert.equal(result.reply,'Héllo. You.');assert.equal(seen.filter(e=>e.type==='assistant.delta').map(e=>e.text).join(''),result.reply);assert(cancelled);assert.equal(requests[0].headers['X-Mighty-Token'],'fixture');
 mode='cached';result=await vm.runInContext('requestCharacterReply(character,rows,onEvent)',context);assert.equal(result.reply,'Cached');
 mode='stream';events.pop();await assert.rejects(vm.runInContext('requestCharacterReply(character,rows,onEvent)',context),/ended early/);
 events.push({type:'response.error',error:'Fixture failed'});await assert.rejects(vm.runInContext('requestCharacterReply(character,rows,onEvent)',context),/Fixture failed/);
 context.window.mightyStreamChat=false;result=await vm.runInContext('requestCharacterReply(character,rows,onEvent)',context);assert.equal(result.reply,'Legacy');
 console.log('Streaming UI: byte-split UTF-8/NDJSON, clean delta callback, authentication, cached JSON, truncation/error recovery and flag-off fallback passed');
})().catch(e=>{console.error(e);process.exitCode=1});
