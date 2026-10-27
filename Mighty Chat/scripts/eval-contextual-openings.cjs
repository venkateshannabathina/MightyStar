'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {ConversationSession}=require('../Backend/call/ConversationSession.cjs');
const {VoiceOpeningCache}=require('../Backend/providers/VoiceOpeningCache.cjs');
const {normalize}=require('../Backend/call/VoiceOpenings.cjs');
const cases=[
 {label:'greeting',text:'hey',allowed:['01','02','03']},
 {label:'criticism',text:'That answer ignored my question. Just tell me what went wrong.',history:[{role:'user',content:'Why are voice replies slow?'},{role:'assistant',content:'Let us talk about the weather instead.'}],allowed:['07']},
 {label:'loneliness',text:"I had a terrible day and I'm feeling really alone.",allowed:['08','09','18']},
 {label:'success',text:'I got the promotion I worked so hard for!',allowed:['10','11']},
 {label:'opinion',text:'What do you think about me based on this chat?',allowed:['14','15']},
 {label:'explanation',text:'Explain why voice replies take longer than text.',allowed:['12','13']},
 {label:'ambiguous',text:'that one',allowed:['16','17']},
 {label:'quoted-emotion',text:"Don't comfort me; explain why the quote 'I feel sad' isn't always a request for help.",allowed:['12','13']},
 {label:'direct-number',text:"What's two plus two? Just the number.",allowed:[]},
 {label:'gratitude',text:'Thanks, that fixed the problem.',allowed:['04','05']},
];
(async()=>{
 if(!process.env.GROQ_API_KEY)throw Error('Saved Groq access unavailable');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-context-eval-')),cache=new VoiceOpeningCache({audioRoot:root});
 const choices=cache.choices({}),rows=[];
 if(choices.length!==18)throw Error('Opening bank unavailable');
 try {
  const start=Number(process.env.MIGHTY_CONTEXT_CASE_OFFSET)||0;
  for(let i=start;i<Math.min(cases.length,start+(Number(process.env.MIGHTY_CONTEXT_CASE_LIMIT)||cases.length));i++) {
   const test=cases[i],events=[];let session;
   const tts={openingChoices:speech=>cache.choices(speech),synthesize:options=>cache.synthesize(options)||Promise.resolve({audioId:'fixture-body',durationSeconds:1,words:[]}),cancel(){}};
   session=new ConversationSession({character:{name:'Mira',description:"A warm, straightforward friend. Answer in one or two short sentences and respond to the person's meaning."},apiKey:process.env.GROQ_API_KEY,model:'openai/gpt-oss-20b',provider:'groq',tts,
    send(type,id,fields){events.push({type,fields});if(type==='speech.chunk.ready')session.ackChunk(fields.index);}});
   await session.turn({sessionId:'context-eval',characterId:'synthetic',turnId:String(i),generation:0},test.text,test.history||[]);
   await new Promise(r=>setImmediate(r));
   const completed=events.find(e=>e.type==='response.complete'),error=events.find(e=>e.type==='response.error');
   if(!completed) {fs.writeFileSync(path.join(process.argv[2],'meaning-evaluation-failed.json'),JSON.stringify({rows,failure:{label:test.label,error:error?.fields.error||'empty result'}},null,2)+'\n');throw Error('Reply failed at synthetic case '+test.label+': '+(error?.fields.error||'empty result'));}
   const reply=completed.fields.text,opening=choices.find(c=>normalize(reply).startsWith(normalize(c.text)));
   const row={...test,reply,openingId:opening?.id||null,contextMatch:!opening||test.allowed.includes(opening.id),cachedSpeech:events.some(e=>e.type==='speech.chunk.ready'&&e.fields.cachedOpening),independentFillerEvents:events.some(e=>/filler|preface/.test(e.type))};
   rows.push(row);fs.writeFileSync(path.join(process.argv[2],`meaning-evaluation-${start}.json`),JSON.stringify({rows},null,2)+'\n');console.log(JSON.stringify(row));session.close();await new Promise(r=>setTimeout(r,2000));
  }
  fs.writeFileSync(path.join(process.argv[2],'meaning-evaluation.json'),JSON.stringify({scope:'Ten synthetic texts; live configured Groq GPT-OSS 20B; actual opening cache and reply pipeline, body speech stubbed; no saved conversations/microphone.',rows},null,2)+'\n');
  if(rows.some(r=>!r.contextMatch || r.independentFillerEvents))process.exitCode=1;
 } finally {fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
