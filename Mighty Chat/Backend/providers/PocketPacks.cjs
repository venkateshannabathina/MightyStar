'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const packs=require('./PocketPacks.json');
class PocketPacks {
 constructor({resources,cacheRoot,fetchImpl=fetch}){
  this.resources=resources;this.cacheRoot=cacheRoot||path.join(os.homedir(),'Library/Caches/MightyStar/PocketTTS-v4');
  this.fetch=fetchImpl;this.pending=new Map();this.progress=new Map();this.verified=new Set();this.controller=new AbortController();
 }
 target(file,root=this.cacheRoot){return path.join(root,'hub','models--'+file.repo.replaceAll('/','--'),'snapshots',file.revision,file.path);}
 has(file){try{return fs.statSync(this.target(file)).size===file.size||fs.statSync(this.target(file,path.join(this.resources,'hf-cache'))).size===file.size;}catch{
  try{return fs.statSync(this.target(file,path.join(this.resources,'hf-cache'))).size===file.size;}catch{return false;}
 }}
 status(){return Object.entries(packs).map(([language,pack])=>({language,installed:pack.files.every(file=>this.has(file)),...(this.progress.get(language)||{})}));}
 async file(file,language){
  const target=this.target(file);if(this.pending.has(target))return this.pending.get(target);
  const task=(async()=>{
   const valid=async location=>{try{if((await fs.promises.stat(location)).size!==file.size)return false;if(this.verified.has(location))return true;const hash=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(location))hash.update(bytes);if(hash.digest('hex')!==file.sha256)return false;this.verified.add(location);return true;}catch{return false;}};
   if(await valid(target))return;
   await fs.promises.mkdir(path.dirname(target),{recursive:true,mode:0o700});
   const bundled=this.target(file,path.join(this.resources,'hf-cache'));
   if(await valid(bundled)){await fs.promises.copyFile(bundled,target);this.verified.add(target);return;}
   const temp=target+'.'+crypto.randomUUID()+'.part';
   try{
    const url=`https://huggingface.co/${file.repo}/resolve/${file.revision}/${file.path}`;
    const response=await this.fetch(url,{signal:AbortSignal.any([this.controller.signal,AbortSignal.timeout(300000)])});
    if(!response.ok)throw Error(`Language download failed (HTTP ${response.status}). Try again.`);
    const handle=await fs.promises.open(temp,'wx',0o600),hash=crypto.createHash('sha256');let size=0;
    try{for await(const chunk of response.body){size+=chunk.length;if(size>file.size)throw Error('Invalid voice pack size.');hash.update(chunk);await handle.write(chunk);const state=this.progress.get(language);if(state)state.downloadedBytes+=chunk.length;}}
    finally{await handle.close();}
    if(size!==file.size||hash.digest('hex')!==file.sha256)throw Error('Voice pack verification failed. Try downloading again.');
    await fs.promises.rename(temp,target);
    this.verified.add(target);
   }finally{await fs.promises.unlink(temp).catch(()=>{});}
  })().finally(()=>this.pending.delete(target));this.pending.set(target,task);return task;
 }
 async ensure(language,voice){
  const pack=packs[language];if(!pack||!pack.voices[voice])throw Error('Choose an available Pocket language and voice.');
  const files=[...pack.files,pack.voices[voice]];
  const totalBytes=files.filter(file=>!this.has(file)).reduce((n,f)=>n+f.size,0);
  this.progress.set(language,{phase:'preparing',downloadedBytes:0,totalBytes});
  try{for(const file of files)await this.file(file,language);this.progress.set(language,{phase:'ready',downloadedBytes:totalBytes,totalBytes});}
  catch(error){this.progress.set(language,{phase:'error',error:error.message,totalBytes,downloadedBytes:this.progress.get(language)?.downloadedBytes||0});throw error;}
 }
 close(){this.controller.abort();}
}
module.exports={PocketPacks};
