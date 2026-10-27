'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadEngine,seeded}=require('./load-engine.cjs');
const {ExpressiveFace,createExpressiveFace,CH_LIST,PRESETS}=loadEngine();
const fixtures=require('./fixtures/inventory.json');
const emotionNames=['neutral','happy','amused','surprised','worried','sad','angry','skeptical','shy'];
const phases=['idle','listening','thinking','speaking'];
const bounded=value=>assert(Number.isFinite(value)&&value>=0&&value<=1,`Invalid weight ${value}`);
let checkedFrames=0;
for(const model of fixtures.models){
 const names=model.morphs.map(m=>m.name),known=new Set(names);
 const left=new ExpressiveFace(names,{}, {random:seeded(19)}),right=new ExpressiveFace(names,{}, {random:seeded(19)});
 for(let frame=0;frame<720;frame++){
  const emotion=emotionNames[Math.floor(frame/20)%emotionNames.length],phase=phases[Math.floor(frame/180)];
  if(frame%36===0){left.sentenceStart(emotion);right.sentenceStart(emotion);}
  const input={phase,emotion,intensity:frame%101/100,vowels:{a:Math.max(0,Math.sin(frame*.1)),i:frame%11/10,u:0,e:0,o:frame%7/6}};
  const a=left.update(1/60,input),b=right.update(1/60,input);assert.deepEqual(a,b,`Seeded output differs on ${model.id}/${frame}`);
  for(const [name,value]of Object.entries(a.weights)){assert(known.has(name),`Unknown morph ${name}`);bounded(value);}
  for(const value of Object.values(a.channels))bounded(value);
  assert(['wide','halfLid','smileEye','sharp','relax'].reduce((n,c)=>n+a.channels[c],0)<=1+1e-12);
  assert(Number.isFinite(a.head.nod)&&Number.isFinite(a.head.tilt));assert(Math.abs(a.gaze.x)<=1&&Math.abs(a.gaze.y)<=1);
  if(['13','36','37','44'].includes(model.id))assert.equal(Object.keys(a.weights).length,0,'Opaque rigs must remain unmapped.');
  checkedFrames++;
 }
}
assert.deepEqual(JSON.parse(JSON.stringify(PRESETS.sad)),{browWorry:.7,cornerDown:.5,frown:.3,halfLid:.3});
const names=fixtures.models[0].morphs.map(m=>m.name);
for(const value of [undefined,false,'0','false',1])assert.equal(createExpressiveFace(names,{MIGHTY_EXPR_V2:value}),null);
assert(createExpressiveFace(names,{MIGHTY_EXPR_V2:'1'}));assert(createExpressiveFace(names,{MIGHTY_EXPR_V2:true}));
const strong=new ExpressiveFace(['困る']),weak=new ExpressiveFace(['困る']);let strongOut,weakOut;
for(let f=0;f<120;f++){strongOut=strong.update(1/60,{phase:'speaking',emotion:'sad',intensity:1});weakOut=weak.update(1/60,{phase:'speaking',emotion:'sad',intensity:.75});}
assert(strongOut.channels.browWorry>weakOut.channels.browWorry*1.3,'No 0.75 intensity cap.');
const invalid=new ExpressiveFace(names,{browUp:NaN,halfLid:Infinity},{random:()=>NaN});
for(const dt of [-1,NaN,Infinity,0,1e6]){const out=invalid.update(dt,{phase:'speaking',emotion:'invalid',intensity:NaN,vowels:{a:NaN,i:Infinity,u:-10,e:9}});for(const v of Object.values(out.weights))bounded(v);}
const calibrated=new ExpressiveFace(['customBrow','上','困る'],{browUp:.5},{calibration:{aliases:{browUp:['missing','customBrow']},gains:{browUp:2,browWorry:NaN},disable:['browWorry']}});
assert.equal(calibrated.coverage().routes.browUp.names[0],'customBrow');assert(!calibrated.coverage().present.includes('browWorry'));
const disabled=new ExpressiveFace(['上'],{}, {calibration:{disable:['browUp']}});assert(!disabled.coverage().present.some(c=>['browUp','browUpL','browUpR'].includes(c)));
const fallback=new ExpressiveFace(['jawOpen']);let jaw;
for(let i=0;i<30;i++)jaw=fallback.update(1/60,{phase:'speaking',emotion:'neutral',intensity:0,vowels:{o:.5}});
assert(jaw.weights.jawOpen>.5);assert(!new ExpressiveFace(['jawOpen','あ']).coverage().present.includes('jaw'));
const aliasOnly=new ExpressiveFace(['EB_Angry_01','EB_Surprised_01','EL_Tired_01_OP','EL_Tired_01_CLO','Mouth_Smile','Eye_Wide','Brow_Up_L','moutha','vrc.v_oh']);
for(const channel of ['browAngry','browUp','halfLid','cornerUp','wide','browUpL','a','o'])assert(aliasOnly.coverage().present.includes(channel),channel);
const mouthVariant=new ExpressiveFace(['jawOpen_Sad_01_OP','jawOpen_Sad_01_CLO'],{}, {calibration:{aliases:{cornerDown:['jawOpen_Sad_01_OP']}}});assert(!mouthVariant.coverage().routes.cornerDown.closedNames,'Mouth OP/CLO variants must not follow eye blinks.');
const paired=new ExpressiveFace(['EL_Tired_01_OP','EL_Tired_01_CLO','まばたき'],{}, {random:()=>.5});let before;
for(let frame=0;frame<60;frame++)before=paired.update(1/60,{phase:'speaking',emotion:'skeptical',intensity:1});
assert(before.weights.EL_Tired_01_OP>0);assert.equal(before.weights.EL_Tired_01_CLO,0);
paired.sentenceStart();let peak,maximum=0;
for(let frame=0;frame<15;frame++){const out=paired.update(.01,{phase:'speaking',emotion:'skeptical',intensity:1});if(out.channels.blink>maximum){maximum=out.channels.blink;peak=out;}}
assert(maximum>.99);assert(peak.weights.EL_Tired_01_CLO>.4);assert(peak.weights.EL_Tired_01_OP<.01);assert.equal(peak.channels.blink,peak.weights['まばたき']);
const vowelsOn=new ExpressiveFace(['にやり','あ']),vowelsOff=new ExpressiveFace(['にやり','あ']);let on,off;
for(let f=0;f<120;f++){on=vowelsOn.update(1/60,{phase:'speaking',emotion:'amused',intensity:.9,vowels:{a:1}});off=vowelsOff.update(1/60,{phase:'speaking',emotion:'amused',intensity:.9});}
assert(Math.abs(on.channels.smirk/off.channels.smirk-.4)<1e-10,'Mouth expression attenuation is 1 - 0.6*jaw.');
const randomValues=[.5,.9,.1],winks=new ExpressiveFace(['winkRight'],{}, {random:()=>randomValues.shift()??.9});
winks.sentenceStart('amused');const wink=winks.update(.01,{phase:'speaking',emotion:'amused',intensity:1});
assert(Math.abs(wink.channels.winkR-Math.sin(Math.PI*.01/.4))<1e-12);assert.equal(wink.channels.winkR,wink.weights.winkRight);
for(let f=0;f<50;f++)winks.update(.01,{phase:'speaking',emotion:'amused',intensity:1});
assert.equal(winks.update(.01,{phase:'speaking',emotion:'amused',intensity:1}).weights.winkRight,0);
assert.equal(createExpressiveFace(names,{}, {},()=>{throw Error('Disabled flag initialized an engine.');}),null);
// No stale nonzero morphs: a calm frame still returns zero entries for all owned routes.
const release=new ExpressiveFace(['困る','口角下げ'],{}, {random:()=>.5});for(let f=0;f<120;f++)release.update(1/60,{phase:'speaking',emotion:'sad',intensity:1});let clear;
for(let f=0;f<600;f++)clear=release.update(1/60,{phase:'idle',emotion:'neutral',intensity:0});assert('困る'in clear.weights);assert(clear.weights['困る']<1e-10);
// Engine-only phase behavior, not WP0 transport onset measurements.
const listening=new ExpressiveFace(names,{}, {random:()=>.5});const onset=listening.update(1/60,{phase:'listening',emotion:'neutral',intensity:0});assert(onset.channels.browUp>0);
let listen;for(let f=0;f<120;f++)listen=listening.update(1/60,{phase:'listening',emotion:'happy',intensity:1});assert(listen.head.nod>0);assert(listen.channels.browHappy<.7*.61);
const invalidThinking=new ExpressiveFace(names,{}, {random:()=>.5});assert.equal(invalidThinking.update(.01,{phase:'speaking',emotion:'thinking',intensity:1}).channels.halfLid,0);
const thinking=new ExpressiveFace(names,{}, {random:()=>.5});let think;
for(let f=0;f<180;f++)think=thinking.update(1/60,{phase:'thinking',emotion:'neutral',intensity:0});assert(think.gaze.x<-.7&&think.gaze.y<-.6);assert(think.head.tilt>6.9);assert(think.channels.halfLid>.19);
let speakingWindows=0;
for(const id of ['01','07','24']){
 const model=fixtures.models.find(m=>m.id===id),face=new ExpressiveFace(model.morphs.map(m=>m.name),{}, {random:seeded(7)});
 const groups={brows:['browUp','browHappy','browWorry','browAngry','browUpL','browUpR'],eyes:['blink','halfLid','smileEye','wide','sharp'],mouth:['smirk','cornerUp','cornerDown','frown','a','o']};
 const windows=Object.fromEntries(Object.keys(groups).map(k=>[k,[]]));
 for(let f=0;f<1800;f++){
  const emotion=emotionNames[1+Math.floor(f/90)%8];if(f%90===0)face.sentenceStart(emotion);
  const out=face.update(1/60,{phase:'speaking',emotion,intensity:.9,vowels:{a:Math.max(0,Math.sin(f*.12))*.7,o:Math.max(0,Math.cos(f*.09))*.5}});
  for(const [group,channels]of Object.entries(groups)){
   // Actual mapped morph output, not logical channels on an absent rig.
   const mapped=new Set(channels.flatMap(c=>face.coverage().routes[c]?.names||[]));
   windows[group].push([...mapped].map(n=>out.weights[n]||0));
   if(windows[group].length===180){const rows=windows[group],variation=rows[0].some((_,i)=>Math.max(...rows.map(r=>r[i]))-Math.min(...rows.map(r=>r[i]))>.001);assert(variation,`${id}/${group} frozen in a three-second window`);windows[group]=[];speakingWindows++;}
  }
 }
}
const receipt={models:50,frames:checkedFrames,invalidWeights:0,unknownMorphWrites:0,deterministic:true,scriptedSpeakingSecondsPerRig:30,scriptedRigIds:['01','07','24'],varyingGroupWindows:speakingWindows,scope:'Standalone engine outputs only; no live renderer, visual calibration or event-to-face latency claim.'};
fs.mkdirSync(path.resolve(__dirname,'../../docs/wp3-evidence'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../docs/wp3-evidence/unit-checks.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(`ExpressiveFace: ${checkedFrames} frames across 50 rigs, no invalid/unknown weights, deterministic RNG, calibration/flags/aliases/blink/jaw/phase checks; ${speakingWindows} varying three-second group windows passed.`);
