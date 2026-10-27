'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {EdgeTTS}=require('../Backend/providers/EdgeTTS.cjs');
const {OPENINGS}=require('../Backend/call/VoiceOpenings.cjs');
(async()=>{
 const directory=path.resolve(__dirname,'../Sources/VoiceOpenings');fs.mkdirSync(directory,{recursive:true});
 const scratch=fs.mkdtempSync('/private/tmp/mighty-voice-openings-');
 const tts=new EdgeTTS({audioRoot:scratch,openingDirectory:null});const clips=[];
 const only=(process.env.MIGHTY_OPENING_IDS||'').split(',').filter(Boolean);
 const previous=fs.existsSync(path.join(directory,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')).clips:[];
 try {
  for(const opening of OPENINGS) {
   const old=previous.find(c=>c.id===opening.id && c.text===opening.text);
   if(only.length && !only.includes(opening.id) && old){clips.push({...old,intent:opening.intent});continue;}
   const result=await tts.synthesize({text:opening.text,voice:'en-US-AvaMultilingualNeural'});
   const file=`opening-${opening.id}.mp3`,bytes=fs.readFileSync(path.join(scratch,result.audioId+'.mp3'));
   fs.writeFileSync(path.join(directory,file),bytes);
   const {audioId,...timeline}=result;
   clips.push({...opening,file,sha256:createHash('sha256').update(bytes).digest('hex'),timeline});
   console.log(`Recorded contextual opening ${opening.id}/${OPENINGS.length}`);
  }
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({voice:'en-US-AvaMultilingualNeural',rate:'+0%',pitch:'+0Hz',clips},null,2)+'\n');
 } finally {tts.close();fs.rmSync(scratch,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
