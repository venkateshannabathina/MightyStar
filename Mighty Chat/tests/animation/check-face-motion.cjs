'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..'),ts=require('../../../model-viewer-clean/node_modules/typescript');
const cache=new Map();
function load(name){if(cache.has(name))return cache.get(name);const exports={},source=fs.readFileSync(path.join(root,'Renderer',name+'.ts'),'utf8');cache.set(name,exports);const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('exports','require',code)(exports,p=>p.startsWith('./')?load(p.slice(2)):require(p));return exports;}
const {FaceMotion}=load('FaceMotion'),{buildFaceTimeline,sampleMouth}=load('FaceTimeline'),{defaultFaceLibrary,faceKeyGroup}=load('FacialExpressions');
const names=['あ','い','う','え','お','まばたき','怒り','悲しい','口角上げ','びっくり','browInnerUp','eyeWideLeft','eyeBlinkLeft','eyeBlinkRight','にやり','笑い','上L','上R'];
const keys=names.map((name,i)=>({id:'morph:'+i,stableId:name,name,englishName:'',group:faceKeyGroup(name,['怒り','悲しい','上L','上R'].includes(name)?1:name==='笑い'?2:name==='にやり'?3:undefined)}));
const library=defaultFaceLibrary(keys,'test'),controller=()=>{const f=new FaceMotion(()=>.5);f.bind('one','look',keys,library,0);return f;};
const perf=(id='a',extra={})=>({characterId:'one',appearanceKey:'look',utteranceId:id,words:[{text:'hello',start:.05,end:.5},{text:'mom',start:.75,end:1.1}],expression:{mood:'angry',intensity:.9},...extra});
const tick=(id='a',extra={})=>({characterId:'one',utteranceId:id,sequence:1,positionSeconds:.2,playbackRate:1,state:'speaking',energy:.8,...extra});
const finite=w=>Object.values(w).every(x=>Number.isFinite(x)&&x>=0&&x<=1);
// Word timing, unsupported language, exact provider priority and gaps.
const timeline=buildFaceTimeline(perf());assert.equal(timeline.quality,'word-estimate');assert(timeline.cues.length>2);
assert.deepEqual(sampleMouth(timeline.cues,.63),{});assert.equal(buildFaceTimeline({words:[{text:'漢字',start:0,end:1}]}).quality,'energy-only');
assert(buildFaceTimeline({words:[{text:'こんにちは',start:0,end:1}]}).cues.length>1);
const native=buildFaceTimeline({mouthCues:[{start:0,end:.3,pose:'a'}],words:[{start:0,end:1,text:'you'}]});assert.equal(native.quality,'provider-visemes');assert.equal(native.cues.length,1);
assert.equal(buildFaceTimeline({mouthCues:[{start:NaN,end:1,pose:'a'},{start:2,end:1,pose:'a'}]}).quality,'energy-only');
// No ready/prebuffer mouth motion; playback, silence and pause own it.
const face=controller();assert(face.event('performance',perf(),0));assert.equal(face.sample(50)['あ'],0);
assert(face.event('playback',tick(),50));let output=face.sample(100);assert(Object.values(output).some(n=>n>0));assert(output['怒り']>0,'upper face emotion remains active with speech');
face.event('playback',tick('a',{sequence:2,energy:0}),100);for(let n=0;n<15;n++)output=face.sample(110+n*16);assert((output['あ']||0)<.02,'silence closes even a timed vowel');
face.event('playback',tick('a',{sequence:3,state:'paused'}),400);for(let n=0;n<20;n++)output=face.sample(400+n*16);assert(keys.filter(k=>k.group==='Mouth'&&!k.name.includes('口角')).every(k=>(output[k.stableId]||0)<.02));
// Sequence, character, appearance, generation and ended-utterance fences.
assert(!face.event('playback',tick('a',{sequence:2}),800));assert(!face.event('playback',{...tick(),characterId:'two'},800));assert(!face.event('performance',{...perf('b'),appearanceKey:'other'},800));
face.event('playback',tick('a',{sequence:4,state:'ended'}),800);assert(!face.event('performance',perf(),900));assert(!face.event('playback',tick('a',{sequence:5}),900));
face.event('phase',{characterId:'one',type:'text.submit',identity:{sessionId:'s',generation:3}},900);
assert(!face.event('performance',perf('late',{identity:{sessionId:'s',generation:2}}),1000));
face.event('phase',{characterId:'one',type:'thinking',identity:{sessionId:'new-session',generation:0}},1100);
assert(!face.event('phase',{characterId:'one',type:'cancel',identity:{sessionId:'s',generation:4}},1200),'old sessions cannot cancel a new session');
// Audio-only voices react directly to RMS without fabricating phoneme alignment.
const rms=controller();rms.event('performance',perf('rms',{words:[],mouthCues:[]}),0);rms.event('playback',tick('rms'),0);let open=rms.sample(60);assert(open['あ']>.1);assert.equal(rms.inspect().quality,'energy-only');
for(let n=1;n<=30;n++)open=rms.sample(60+n*16);assert(open['あ']<.01,'stale clock fail-safe closes mouth');
// Sudden opposing vowels cannot exceed the MMD mouth budget after smoothing.
const bounded=controller();bounded.event('performance',perf('budget',{mouthCues:[{start:0,end:1,pose:'a'},{start:1,end:2,pose:'o'}]}),0);
for(let n=1;n<=150;n++){const time=n*16;bounded.event('playback',tick('budget',{sequence:n,positionSeconds:n/75}),time);const w=bounded.sample(time);assert(finite(w));assert((w['あ']||0)+(w['お']||0)<=.850001);}
// Blinking and small idle brow variations; no speech is needed.
const idle=controller();let blinkPeak=0,microPeak=0;
for(let n=1;n<=600;n++){const w=idle.sample(n*16);blinkPeak=Math.max(blinkPeak,w['まばたき']||0);microPeak=Math.max(microPeak,...keys.filter(k=>k.group==='Eyebrows').map(k=>w[k.stableId]||0));assert(finite(w));}
assert(blinkPeak>.5);assert(microPeak>0&&microPeak<.1);
// Preview/body-pause suspension restores Neutral but retains the live clock,
// so leaving an editor can resume the same ongoing audio without restarting it.
const stopped=bounded.sample(2600,true);assert(Object.values(stopped).every(v=>v===0));assert.equal(bounded.inspect().utteranceId,'budget');
bounded.event('playback',tick('budget',{sequence:200,positionSeconds:.2}),2700);assert(bounded.sample(2750)['あ']>.1);
bounded.event('playback',tick('budget',{sequence:201,state:'cancelled'}),2800);assert.equal(bounded.inspect().utteranceId,null);
// Visible compliment reaction, upper-face warmth, no speech/vowel collision.
const positive=controller(),expression={mood:'happy',intensity:.7,ambient:{mood:'neutral',intensity:.2},reactionId:'kind-remark',durationSeconds:1};
positive.event('phase',{characterId:'one',type:'response.complete',expression},0);
let pleased;for(let n=1;n<=30;n++)pleased=positive.sample(n*16);
assert(pleased['にやり']>.35,'compliments produce a readable closed-lip smile');assert(pleased['笑い']>.3,'smile reaches the eyes');
positive.event('performance',perf('positive',{expression,mouthCues:[{start:0,end:3,pose:'a'}]}),500);
for(let n=1;n<=30;n++){positive.event('playback',tick('positive',{sequence:n,positionSeconds:.3}),500+n*16);pleased=positive.sample(500+n*16);}
assert(pleased['にやり']>.07&&pleased['あ']>.1,'smile corners and lip sync coexist');
assert(keys.filter(k=>k.group==='Mouth'&&!['にやり','口角上げ'].includes(k.name)).reduce((sum,k)=>sum+(pleased[k.stableId]||0),0)<=.850001);
positive.event('playback',tick('positive',{sequence:100,state:'ended'}),1100);
for(let n=1;n<=150;n++)positive.sample(1100+n*16);
assert.equal(positive.inspect().mood,'neutral','reaction settles to the actual ambient mood');
// Additive eyebrow micro-motion stays visible on top of an existing brow pose.
const brows=controller();brows.event('phase',{characterId:'one',type:'response.complete',expression:{mood:'angry',intensity:.8}},0);
let peakBrow=0;for(let n=1;n<=400;n++){const w=brows.sample(n*16);if(n>100)peakBrow=Math.max(peakBrow,w['怒り']||0);}
assert(peakBrow>.51,'micro detail is not swallowed by the base angry eyebrow weight');
// Per-frame deterministic cost benchmark, excluding module load and model rendering.
const bench=controller(),start=performance.now();for(let i=0;i<20000;i++)bench.sample(i*16);const ms=performance.now()-start;
console.log(`PASS: native/word/RMS timelines, speech ownership, silence, gaps, stale clocks, pause/cancel, identity fences, normalized vowels, upper emotion, blink and idle microexpressions; ${(ms/20000).toFixed(4)} ms/sample (${keys.length} keys)`);
