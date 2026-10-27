'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {tuneAudio,tuning,closeTuners}=require('../../Backend/providers/PocketAudioTuning.cjs');
(async()=>{
 const audioRoot=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-tune-check-')),resources=path.resolve(__dirname,'../../Sources/PocketTTS');
 const original=Buffer.alloc(44+96000);original.write('RIFF');original.writeUInt32LE(original.length-8,4);original.write('WAVEfmt ',8);original.writeUInt32LE(16,16);original.writeUInt16LE(1,20);original.writeUInt16LE(1,22);original.writeUInt32LE(24000,24);original.writeUInt32LE(48000,28);original.writeUInt16LE(2,32);original.writeUInt16LE(16,34);original.write('data',36);original.writeUInt32LE(96000,40);
 for(let i=0;i<48000;i++)original.writeInt16LE(Math.round(Math.sin(2*Math.PI*220*i/24000)*12000),44+2*i);
 const context={audioRoot,resources,signal:new AbortController().signal};
 try{
  assert.equal(await tuneAudio(original,{},context),original,'natural controls must bypass processing');
  const result=[];
  for(const options of [{speed:1.25},{tone:2},{gain:.5}]){
   const start=performance.now(),wav=await tuneAudio(original,options,context);let crossings=0,power=0;
   for(let i=12001;i<24000;i++){const a=wav.readInt16LE(44+i*2),b=wav.readInt16LE(44+(i-1)*2);if(a>=0&&b<0)crossings++;power+=(a/32768)**2;}
   const hz=crossings*2,rms=Math.sqrt(power/11999),seconds=(wav.length-44)/48000;
   assert(Math.abs(hz-(options.tone?247:220))<8,'speed and pitch must tune independently');
   if(options.gain)assert(rms<.15&&rms>.08,'volume control must actually change audio');
   if(options.speed)assert(seconds<1.95&&seconds>1.55,'faster speech should shorten the recording');
   result.push({options,hz,rms,seconds,processingMs:Math.round(performance.now()-start)});
  }
  assert.deepEqual(tuning({speed:99,tone:-99,gain:99}),{speed:1.25,pitch:-3,gain:1.25});
  assert.equal(fs.readdirSync(audioRoot).length,0,'temporary audio must be cleaned');
  console.log('PASS: independent speed/pitch, actual gain, natural bypass, bounds and temporary cleanup. '+JSON.stringify(result));
 }finally{closeTuners();fs.rmSync(audioRoot,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
