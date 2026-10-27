'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {streamGroq}=require('../../Backend/providers/GroqLLM.cjs');
const {taggedPrompt}=require('../../Backend/call/TaggedPrompt.cjs');
const {TagParser}=require('../../Backend/call/TagParser.cjs');
const {EdgeTTS}=require('../../Backend/providers/EdgeTTS.cjs');
(async()=>{
 const output=process.argv[2];const audioRoot=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-wp2-audio-'));const tts=new EdgeTTS({audioRoot});
 try{
  const character={name:'Mira',profile:{compiledPersonaCard:'Mira is a witty, affectionate friend who can disagree. She speaks briefly and directly.'}};
  const inputs=['I got the job! But now I have to move away.','You missed me, admit it.','My joke was terrible.','I lost my notebook, but someone just returned it.','I am having a rough day. Stay with me a minute.'];
  const rows=[];
  for(const mode of ['chat','call'])for(let n=0;n<inputs.length;n++){
   const parser=new TagParser();let text='';const started=performance.now();let firstDeltaMs;
   const consume=events=>{for(const e of events)if(e.type==='assistant.delta'){firstDeltaMs??=performance.now()-started;text+=e.text;}};
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
   try{for await(const token of streamGroq({apiKey:process.env.GROQ_API_KEY,provider:'groq',model:'openai/gpt-oss-20b',messages:[{role:'system',content:taggedPrompt(character,mode)},{role:'user',content:inputs[n]}],signal:controller.signal}))consume(parser.push(token));consume(parser.push('',true));}finally{clearTimeout(timer);}
   if(!text.trim()||text.includes('[['))throw Error('Invalid clean reply.');
   let edgeAudio=false;
   if(n===0){const audio=await tts.synthesize({text:text.trim(),voice:'en-US-AvaMultilingualNeural',rate:'+0%',pitch:'+0Hz'});if(!fs.statSync(path.join(audioRoot,audio.audioId+'.mp3')).size)throw Error('No real audio.');edgeAudio=true;}
   rows.push({mode,case:n+1,...parser.stats,firstCleanDeltaMs:Math.round(firstDeltaMs),replyCompleteMs:Math.round(performance.now()-started),edgeAudio});
   console.log(`Measured ${mode} case ${n+1}: ${parser.stats.explicit}/${parser.stats.sentences} explicit sentence directives.`);
  }
  const total=rows.reduce((a,r)=>({sentences:a.sentences+r.sentences,explicit:a.explicit+r.explicit,fallback:a.fallback+r.fallback}),{sentences:0,explicit:0,fallback:0});
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({date:new Date().toISOString(),provider:'groq',model:'openai/gpt-oss-20b',voice:'Edge en-US-AvaMultilingualNeural',turns:rows.length,...total,explicitRate:total.explicit/total.sentences,rows,note:'Synthetic inputs. No reply content or credentials retained. ReplyComplete includes Edge generation on case 1; timings are diagnostic, not a latency benchmark.'},null,2)+'\n');
 }finally{tts.close();fs.rmSync(audioRoot,{recursive:true,force:true});}
})().catch(()=>{console.error('Live compliance check failed; no content or credentials logged.');process.exitCode=1});
