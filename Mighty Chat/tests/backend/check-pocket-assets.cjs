'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {POCKET_VOICES,POCKET_PREVIEW_TEXT}=require('../../Backend/providers/PocketVoices.cjs');
const resources=path.resolve(__dirname,'../../Sources/PocketTTS');
const manifest=JSON.parse(fs.readFileSync(path.join(resources,'previews/manifest.json')));
assert.equal(manifest.text,POCKET_PREVIEW_TEXT);assert.deepEqual(manifest.voices.map(v=>v.id),POCKET_VOICES);
const hashes=new Set();
for(const voice of manifest.voices){
 const wav=fs.readFileSync(path.join(resources,'previews',voice.id+'.wav'));
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(4),wav.length-8);assert.equal(wav.readUInt32LE(40),wav.length-44);
 assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt16LE(34),16);
 assert.equal((wav.length-44)/48000,voice.durationSeconds);assert(voice.durationSeconds>1);
 const hash=crypto.createHash('sha256').update(wav).digest('hex');assert.equal(hash,voice.sha256);hashes.add(hash);
 const embedding=fs.readFileSync(path.join(resources,'hf-cache/hub/models--kyutai--pocket-tts-without-voice-cloning/snapshots/a3055dcb533cf2ec90458008a01e7cef550bae2a/languages/english/embeddings',voice.id+'.safetensors'));
 const n=Number(embedding.readBigUInt64LE(0));assert(n>0&&n<1000000);
 const header=JSON.parse(embedding.toString('utf8',8,8+n));assert.equal(8+n+Math.max(...Object.values(header).filter(v=>v?.data_offsets).map(v=>v.data_offsets[1])),embedding.length);
}
assert.equal(hashes.size,POCKET_VOICES.length,'each named voice must have its own generated recording');
console.log('27 Pocket voice states and distinct PCM previews validated against hashes, lengths and catalogue.');
const {PocketTTS}=require('../../Backend/providers/PocketTTS.cjs');
const previewRoot=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'mighty-pocket-previews-'));
const provider=new PocketTTS({audioRoot:previewRoot,resourceRoot:resources,fetchImpl:async()=>{throw Error('Preview attempted network');}});
provider.ready=async()=>{throw Error('Preview attempted model startup');};
(async()=>{
 try {
  for(const voice of POCKET_VOICES){const result=await provider.synthesize({voice,text:POCKET_PREVIEW_TEXT});assert(result.durationSeconds>1);assert(fs.existsSync(path.join(previewRoot,result.audioId+'.wav')));}
  assert.equal(provider.child,null);console.log('All 27 previews are served locally without starting the model or using network.');
 } finally {provider.close();fs.rmSync(previewRoot,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
