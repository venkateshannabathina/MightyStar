'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {OPENINGS,OpeningTextGate,VoiceOpeningChunker,normalize}=require('../../Backend/call/VoiceOpenings.cjs');
const {VoiceOpeningCache}=require('../../Backend/providers/VoiceOpeningCache.cjs');
const {ConversationSession}=require('../../Backend/call/ConversationSession.cjs');
(async()=>{
 const directory=process.argv[2] || path.resolve(__dirname,'../../Sources/VoiceOpenings');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-opening-check-'));
 try {
  const cache=new VoiceOpeningCache({audioRoot:root,directory}),choices=cache.choices({});
  assert.equal(choices.length,18,'all recordings must validate');
  assert.equal(cache.choices({voice:'en-US-GuyNeural'}).length,0);
  assert.equal(cache.choices({rate:'+10%'}).length,0);assert.equal(cache.choices({pitch:'+2Hz'}).length,0);
  assert.equal(cache.choices({provider:'openai'}).length,0);
  const opening=OPENINGS.find(c=>c.id==='07'), body='The audio request starts a new connection each time.';
  for(let split=1;split<opening.text.length+3;split++) {
   const gate=new OpeningTextGate(choices),chunker=new VoiceOpeningChunker(choices);
   const source=opening.text+' '+opening.text+' '+body;let cleaned='',phrases=[];
   for(let i=0;i<source.length;i+=split) {const visible=gate.push(source.slice(i,i+split));cleaned+=visible;phrases.push(...chunker.push(visible,0));}
   const tail=gate.push('',true);cleaned+=tail;phrases.push(...chunker.push(tail,0,true));
   assert.equal(cleaned,opening.text+' '+body,'exact echoed opening removed consistently from text and speech');
   assert.deepEqual(phrases.map(p=>p.index),[0,1]);
   assert.equal(phrases[0].text,opening.text,'one coherent recorded utterance, not separate stitched sentences');
   assert.equal(phrases[1].text,body,'body continues rather than repeating an acknowledgement');
  }
  for(const raw of ["  "+opening.text,opening.text.replace(/'/g,'’'),opening.text.slice(0,-1)+':']) {
   const gate=new OpeningTextGate(choices),chunker=new VoiceOpeningChunker(choices);let result='',parts=[];
   for(const token of raw+' '+body) {const visible=gate.push(token);result+=visible;parts.push(...chunker.push(visible,0));}
   const tail=gate.push('',true);result+=tail;parts.push(...chunker.push(tail,0,true));
   assert.equal(result,raw+' '+body);assert.equal(parts.length,2);assert.equal(normalize(parts[0].text),normalize(opening.text));
  }
  const bounded=new OpeningTextGate(choices);assert.equal(bounded.push(' '.repeat(513)),' '.repeat(513),'a whitespace stream cannot remain hidden in the opening buffer');
  for(const unknown of ['Four.','I disagree with that claim.','I hear a noise upstairs.','I have no idea which one you mean.',' I am not feeling sad.','I']) {
   const gate=new OpeningTextGate(choices);let result='';for(const c of unknown)result+=gate.push(c);result+=gate.push('',true);assert.equal(result,unknown,'uncached or partial text is never lost');
  }
  const result=await cache.synthesize({text:opening.text,voice:'en-US-AvaMultilingualNeural'});
  assert(result.cachedOpening && fs.existsSync(path.join(root,result.audioId+'.mp3')));
  assert.equal(cache.synthesize({text:'I disagree.',voice:'en-US-AvaMultilingualNeural'}),null);
  assert.equal(cache.synthesize({text:opening.text,voice:'en-US-GuyNeural'}),null);
  const events=[],jobs=[];let prompt;
  const session=new ConversationSession({character:{name:'Mira',profile:{ttsProvider:'edge'}},apiKey:'test',send(type,id,fields){events.push({type,fields});},
   tts:{openingChoices:speech=>cache.choices(speech),synthesize(options){jobs.push(options.text);return cache.synthesize(options)||Promise.resolve({audioId:'body',durationSeconds:2,words:[]});},cancel(){}},
   stream:async function*({messages}){prompt=messages[0].content;const full=opening.text+' '+opening.text+' '+body;for(const c of full)yield c;}});
  await session.turn({sessionId:'s',characterId:'c',turnId:'t',generation:0},'Your last answer missed the point. Explain the audio delay.',[]);
  await new Promise(r=>setImmediate(r));
  assert.match(prompt,/only when it fits the user's actual meaning/);assert.match(prompt,/Never chain openings/);assert.match(prompt,/answer directly with no opening/);
  assert.equal(events.find(e=>e.type==='response.complete').fields.text,opening.text+' '+body);
  assert.equal(events.filter(e=>e.type==='assistant.delta').map(e=>e.fields.text).join(''),opening.text+' '+body);
  assert(events.some(e=>e.type==='speech.chunk.ready' && e.fields.cachedOpening && e.fields.text===opening.text));
  assert.deepEqual(jobs,[opening.text,body]);
  session.ackChunk(0);session.ackChunk(1);session.close();
  const previousFlag=process.env.MIGHTY_STREAM_CHAT;process.env.MIGHTY_STREAM_CHAT='1';
  try {
   const taggedEvents=[],taggedJobs=[];
   const tagged=new ConversationSession({character:{name:'Mira',profile:{ttsProvider:'edge'}},apiKey:'fixture',send(type,id,fields){taggedEvents.push({type,fields});},
    tts:{openingChoices:speech=>cache.choices(speech),synthesize(options){taggedJobs.push(options.text);return cache.synthesize(options)||Promise.resolve({audioId:'tagged-body',words:[],durationSeconds:2});},cancel(){}},
    stream:async function*({messages}){assert.match(messages[0].content,/keep them/);const source='[[e=neutral i=.2 g=-]] '+opening.text.replace(/\. /g,'. [[e=neutral i=.2 g=-]] ')+' [[e=neutral i=.2 g=-]] '+body;for(const c of source)yield c;}});
   await tagged.turn({sessionId:'s',characterId:'c',turnId:'tagged',generation:0},'That answer missed the question.',[]);
   await new Promise(r=>setImmediate(r));
   assert.equal(normalize(taggedEvents.find(e=>e.type==='response.complete').fields.text).trim(),normalize(opening.text+' '+body));
   assert.equal(taggedJobs.length,2);assert.equal(normalize(taggedJobs[0]),normalize(opening.text));
   assert(taggedEvents.some(e=>e.type==='speech.chunk.ready'&&e.fields.cachedOpening));assert(taggedJobs.every(x=>!x.includes('[[')));
   tagged.close();
  } finally {if(previousFlag===undefined)delete process.env.MIGHTY_STREAM_CHAT;else process.env.MIGHTY_STREAM_CHAT=previousFlag;}
  console.log('PASS: contextual opening availability, exact voice matching, fragmented prefixes, unknown/partial passthrough, duplicate suppression in text/speech, coherent opening/body handoff and both tagged/untagged reply modes.');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
