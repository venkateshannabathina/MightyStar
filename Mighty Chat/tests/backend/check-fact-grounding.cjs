'use strict';
const assert=require('node:assert/strict');
const {groundedEvidence:g,recalledAssertion}=require('../../Backend/memory/FactGrounding.cjs');
assert(g('For this harmless test, remember that my bicycle is cobalt blue.','my bicycle is cobalt blue'));
assert(g('My favorite drink is tea. What is two plus two?','My favorite drink is tea.'));
assert(g('私の好きな飲み物はお茶です。','私の好きな飲み物はお茶です'));
assert(!g('What is two plus two?','two plus two'));
assert(!g('What is two plus two?','two plus two is four'));
assert(!g('No preferences or pets in this reply.','No preferences or pets'));
assert(!g('For the next six short checks, reply with numbers only.','six short checks'));
assert(!g('My bicycle is blue.',undefined));
assert(!g('My bicycle is blue.','My bicycle is red.'));
assert(!g('What is tea?','What is tea?'));
assert(recalledAssertion('The user likes tea.','私はお茶が好きです。'));
assert(recalledAssertion('The user enjoys walking.','I enjoy hiking.'));
console.log('Fact grounding: exact user evidence, question/temporary instruction rejection and multilingual assertions passed');
const {MemoryService}=require('../../Backend/memory/MemoryService.cjs');
(async()=>{
 const saved=[];let payload;
 const store={epoch:()=>0,state:()=>({mood:'neutral'}),insertFact:(_id,text)=>saved.push(text),db:{prepare:()=>({run(){}})}};
 const memory=new MemoryService({store,embeddings:{embed:async()=>new Float32Array(384)},generate:async(_config,messages)=>{
  payload=JSON.parse(messages[1].content);
  return JSON.stringify({facts:[
   {text:'The user has a blue bicycle.',evidence:'My bicycle is blue.',importance:3},
   {text:'The user says two plus two is four.',evidence:'two plus two',importance:5},
   {text:'The user has no pets.',evidence:'No pets in this reply.',importance:5},
   {text:'The user likes invented tea.',importance:5}
  ]});
 }});
 await memory.learn({id:'c',epoch:0,character:{profile:{}},input:'My bicycle is blue. What is two plus two? No pets in this reply.',userTurn:1,userCount:1},{reply:'Four. Invented tea is lovely.'});
 assert.deepEqual(Object.keys(payload),['user'],'assistant claims never enter the extraction request');
 assert.deepEqual(saved,['The user has a blue bicycle.'],'only grounded user assertions are stored');
 console.log('Fact grounding integration: assistant input excluded and ungrounded facts rejected before storage');
})().catch(error=>{console.error(error);process.exitCode=1});
