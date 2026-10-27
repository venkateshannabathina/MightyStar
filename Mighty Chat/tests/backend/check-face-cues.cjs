'use strict';
const assert=require('node:assert/strict');const {ConversationSession}=require('../../Backend/call/ConversationSession.cjs');
process.env.MIGHTY_STREAM_CHAT='1';process.env.MIGHTY_EXPR_V2='1';
(async()=>{
 const sent=[],chunks=[];let memoryResult;
 const id={sessionId:'s',characterId:'c',generation:0,turnId:'t'};
 const session=new ConversationSession({character:{name:'Mira'},apiKey:'fixture',send(type,id,fields){sent.push({type,...fields});if(type==='speech.chunk.ready'){chunks.push(fields);setImmediate(()=>session.ackChunk(fields.index));}},stream:async function*(){yield '[[e=happy i=.6 g=-]] Hello. [[e=sad i=.8 g=-]] Goodbye.';},tts:{synthesize:async()=>({audioId:'fixture',durationSeconds:1,mouthCues:[],words:[]}),cancel(){}}});
 await session.turn(id,'Hey',[]);await new Promise(r=>setTimeout(r,15));
 assert.equal(chunks.length,2);assert.equal(chunks[0].sentenceCues[0].e,'happy');assert.equal(chunks[1].sentenceCues[0].e,'sad');assert(chunks.every(c=>c.sentenceCues[0].offset===0));assert(!JSON.stringify(chunks).includes('[['));
 const starts=sent.filter(e=>e.type==='sentence.start');assert.equal(starts[0].offset,0);assert(starts[1].offset>0);
 console.log('Face phrase cues: turn offsets, trimmed per-phrase offsets, sentence identity, scheduler metadata and clean text passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
