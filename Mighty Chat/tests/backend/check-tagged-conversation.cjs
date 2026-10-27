'use strict';
const assert=require('node:assert/strict');
const {ConversationSession}=require('../../Backend/call/ConversationSession.cjs');
process.env.MIGHTY_STREAM_CHAT='1';
(async()=>{
 const events=[],spoken=[];let saved;
 const id={sessionId:'s',characterId:'c',generation:0,turnId:'t'};
 const memory={prepare:async()=>({messages:[{role:'system',content:'compiled tagged persona'},{role:'user',content:'Hey'}]}),finish:(ctx,result)=>{saved=result;},afterReply(){},fail(){}};
 const session=new ConversationSession({character:{name:'Mira'},apiKey:'fixture',memory,
  stream:async function*(){for(const token of ['[','[e=amused i=.6 g=talking]','] Rude. ','[[e=happy i=.3 g=-]] You love me.'])yield token;},
  send(type,identity,fields){events.push({type,...fields});if(type==='speech.chunk.ready')setImmediate(()=>session.ackChunk(fields.index));},
  tts:{synthesize({text}){assert(!text.includes('[['));spoken.push(text);return Promise.resolve({audioId:'fixture',durationSeconds:1});},cancel(){}}
 });
 await session.turn(id,'Hey',[]);await new Promise(r=>setTimeout(r,20));
 assert.deepEqual(spoken,['Rude.','You love me.']);assert(!saved.reply.includes('[['));assert.equal(saved.sentenceEvents.length,2);
 assert.deepEqual(events.filter(e=>e.type==='sentence.start').map(e=>e.e),['amused','happy']);assert(events.some(e=>e.type==='speech.audio.complete'));
 let resume;const stale=[];
 const cancelled=new ConversationSession({send:type=>stale.push(type),apiKey:'fixture',stream:async function*(){yield '[[e=happy i=.3 g=-]] Hi. ';await new Promise(r=>resume=r);yield '[[e=sad i=.4 g=-]] Bye.';}});
 const pending=cancelled.turn(id,'Hey',[]);await new Promise(r=>setImmediate(r));const count=stale.length;cancelled.advance(1);resume();await pending;assert.equal(stale.length,count);
 const cached=[];const retrySession=new ConversationSession({send:(type,id,fields)=>cached.push({type,...fields}),memory:{prepare:async()=>({cached:saved})}});
 await retrySession.turn(id,'Hey',[]);assert.equal(cached.filter(e=>e.type==='sentence.start').length,2);assert(!cached.some(e=>e.type==='speech.chunk.ready'));
 const {taggedPrompt}=require('../../Backend/call/TaggedPrompt.cjs');const example=taggedPrompt({name:'Mira',profile:{examples:'User: Hey. Mira: Hey, you. Nice day.'}});assert.match(example,/Character voice example/);assert.match(example,/\[\[e=neutral i=0.2 g=-\]\] Nice day/);
 const prompt=[];
 const noMemory=new ConversationSession({character:{name:'Mira',description:'Opinionated friend.'},apiKey:'fixture',send(){},stream:async function*({messages}){prompt.push(...messages);yield 'No tags?';}});
 await noMemory.turn(id,'Hi',[]);assert.match(prompt[0].content,/EVERY sentence/);assert.match(prompt[0].content,/Opinionated friend/);assert(!prompt[0].content.includes('Return only a JSON'));
 console.log('Tagged calls: clean phrase/TTS/save path, sentence meta, default prompts, completion and stale generation suppression passed');
})().catch(e=>{console.error(e);process.exitCode=1});
