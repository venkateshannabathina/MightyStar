'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const workers=new Map();
class TunerWorker {
 constructor(resources){this.resources=resources;this.pending=new Map();this.starting=null;this.child=null;}
 ready(){
  if(this.starting)return this.starting;
  this.starting=new Promise((resolve,reject)=>{
   const child=spawn(path.join(this.resources,'audio-tuner'),['--worker'],{stdio:['pipe','pipe','ignore']});this.child=child;let buffer='';
   const timer=setTimeout(()=>{reject(Error('Voice tuning could not start.'));child.kill();},15000);
   child.stdout.setEncoding('utf8');child.stdout.on('data',text=>{buffer+=text;if(buffer.length>65536){child.kill();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const message=JSON.parse(line);if(message.ready){clearTimeout(timer);resolve();}else{const job=this.pending.get(message.id);if(job){this.pending.delete(message.id);clearTimeout(job.timer);message.ok?job.resolve():job.reject(Error('Voice tuning failed. Reset tuning and try again.'));}}}catch{child.kill();}}});
   const failed=()=>{clearTimeout(timer);reject(Error('Voice tuning stopped. Try again.'));for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(Error('Voice tuning stopped.'));}this.pending.clear();if(this.child===child){this.child=null;this.starting=null;}};
   child.on('error',failed);child.on('exit',failed);child.stdin.on('error',failed);
  });return this.starting;
 }
 async run(command,signal){await this.ready();signal.throwIfAborted();if(this.pending.size>=8)throw Error('Too many voice previews. Try again.');return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.child?.kill(),15000);this.pending.set(command.id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify(command)+'\n');});}
 close(){this.child?.stdin.end();}
}
function worker(resources){if(!workers.has(resources))workers.set(resources,new TunerWorker(resources));return workers.get(resources);}
function warmTuner(resources){worker(resources).ready().catch(()=>{});}
function closeTuners(){for(const tuner of workers.values())tuner.close();workers.clear();}
function tuning(options={}) {
 const bound=(v,f,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
 return {speed:bound(options.speed,1,.75,1.25),pitch:bound(options.tone,0,-3,3),gain:bound(options.gain,1,.5,1.25)};
}
async function tuneAudio(bytes,options,{resources,audioRoot,signal}) {
 const t=tuning(options);if(t.speed===1&&t.pitch===0&&t.gain===1)return bytes;
 const id=require('node:crypto').randomUUID(),input=path.join(audioRoot,id+'-raw.wav'),output=path.join(audioRoot,id+'-tuned.wav');
 try {
  signal.throwIfAborted();await fs.promises.writeFile(input,bytes,{mode:0o600});
  await worker(resources).run({id,input,output,speed:t.speed,tone:t.pitch,gain:t.gain},signal);
  signal.throwIfAborted();
  const tuned=await fs.promises.readFile(output);
  // AVAudioFile may include extra RIFF chunks; normalize to the transport's PCM WAV.
  let pcm;
  for(let p=12;p+8<=tuned.length;){const n=tuned.readUInt32LE(p+4);if(tuned.toString('ascii',p,p+4)==='data'){pcm=tuned.subarray(p+8,p+8+n);break;}p+=8+n+(n%2);}
  if(!pcm?.length)throw Error('Voice tuning produced no audio.');
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  return Buffer.concat([header,pcm]);
 } finally {await Promise.all([input,output].map(file=>fs.promises.unlink(file).catch(()=>{})));}
}
module.exports={tuning,tuneAudio,warmTuner,closeTuners};
