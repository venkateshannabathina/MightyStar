'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID,createHash}=require('node:crypto');
const {normalize,OPENINGS}=require('../call/VoiceOpenings.cjs');
class VoiceOpeningCache {
 constructor({audioRoot,directory}={}) {
  this.audioRoot=audioRoot;this.entries=[];
  if(directory===null)return;
  const source=path.resolve(__dirname,'../../Sources/VoiceOpenings');
  this.directory=directory || (fs.existsSync(source)?source:path.resolve(__dirname,'../../Resources/VoiceOpenings'));
  try {
   const manifest=JSON.parse(fs.readFileSync(path.join(this.directory,'manifest.json'),'utf8'));
   if(manifest.voice!=='en-US-AvaMultilingualNeural' || manifest.rate!=='+0%' || manifest.pitch!=='+0Hz' || !Array.isArray(manifest.clips))return;
   for(const c of manifest.clips.slice(0,24)) {
    const opening=OPENINGS.find(x=>x.id===c.id && x.text===c.text);
    if(!opening || !/^opening-\d{2}\.mp3$/.test(c.file) || !c.timeline || !Array.isArray(c.timeline.words))continue;
    const file=path.join(this.directory,c.file),bytes=fs.readFileSync(file);
    if(bytes.length<100 || bytes.length>100000 || createHash('sha256').update(bytes).digest('hex')!==c.sha256)continue;
    this.entries.push({...opening,file,timeline:c.timeline});
   }
  } catch { this.entries=[]; } // A missing/corrupt bank falls back to the normal provider.
 }
 eligible({provider='edge',voice='en-US-AvaMultilingualNeural',rate='+0%',pitch='+0Hz'}={}) {
  return provider==='edge' && voice==='en-US-AvaMultilingualNeural' && rate==='+0%' && pitch==='+0Hz';
 }
 choices(options) {return this.eligible(options)?this.entries.map(({id,intent,text})=>({id,intent,text})):[];}
 synthesize(options) {
  if(!this.eligible(options))return null;
  const entry=this.entries.find(c=>normalize(c.text)===normalize(options.text?.trim()||''));
  if(!entry)return null;
  const audioId=randomUUID(),output=path.join(this.audioRoot,audioId+'.mp3'),metadata=path.join(this.audioRoot,audioId+'.json');
  try {
   fs.copyFileSync(entry.file,output);fs.writeFileSync(metadata,JSON.stringify(entry.timeline));
   const cleanup=setTimeout(()=>{fs.unlink(output,()=>{});fs.unlink(metadata,()=>{});},10*60*1000);cleanup.unref();
   options.onFirstByte?.();
   return Promise.resolve({audioId,...entry.timeline,cachedOpening:true});
  } catch {fs.unlink(output,()=>{});fs.unlink(metadata,()=>{});return null;}
 }
}
module.exports={VoiceOpeningCache};
