'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../../../model-viewer-clean/node_modules/typescript');
const viewerRequire=require('node:module').createRequire(path.resolve(__dirname,'../../../model-viewer-clean/package.json'));
let clock=0;
const context=vm.createContext({performance:{now:()=>clock},Math,Map,Set,Number,Object,JSON,crypto:require('node:crypto').webcrypto,TextEncoder,fetch:async()=>({ok:false})});
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInContext('(function(require,module,exports){'+code+'})',context)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):viewerRequire(name),module,module.exports);return module.exports;}
const root=path.resolve(__dirname,'../../Renderer');
const {PerformanceDirector}=load(path.join(root,'performance/PerformanceDirector.ts'));
const {BoneOffsetLayer}=load(path.join(root,'performance/BoneOffsetLayer.ts'));
const {FaceRigAdapter}=load(path.join(root,'face/FaceRigAdapter.ts'));
const {Quaternion}=viewerRequire('@babylonjs/core/Maths/math.vector');
const names=require('./fixtures/inventory.json').models[0].morphs.map(m=>m.name),writes=[];
const rig={morphNames:names,writeWeights:w=>{writes.push(w);return Object.values(w).some(v=>v>.01);},applyOffsets(){}};
const director=new PerformanceDirector(rig,{},()=>.8),identity={sessionId:'s',characterId:'c',generation:1,turnId:'one'};
const event=(type,fields={})=>director.event({type,identity,...fields});
const inspect=()=>director.inspect();
event('input.begin');director.update(.016);assert.equal(inspect().phase,'listening');event('input.commit');director.update(.016);assert.equal(inspect().phase,'thinking');
const perf={version:1,utteranceId:'u',characterId:'c',appearanceKey:'key',durationSeconds:4,quality:'word-boundaries',text:'Hello. Goodbye.',words:[{start:0,end:1,text:'Hello.'},{start:2,end:3,text:'Goodbye.'}],mouthCues:[{start:0,end:3,pose:'a'}],expression:{mood:'neutral',intensity:0},identity,sentenceCues:[{index:0,e:'happy',i:.6,g:'talking',offset:0},{index:1,e:'sad',i:.9,g:'-',offset:7}]};
director.setPerformance(perf);event('response.complete');assert.equal(inspect().phase,'thinking');director.update(.05);assert.equal(inspect().output.channels.a,0,'No silent speaking before playback.');
const snapshot=(sequence,time,state='speaking')=>({utteranceId:'u',characterId:'c',sequence,positionSeconds:time,playbackRate:1,state});
director.setSnapshot(snapshot(1,0));assert.equal(inspect().phase,'thinking');director.setSnapshot(snapshot(2,.1));director.update(.016);assert.equal(inspect().phase,'speaking');assert.equal(inspect().emotion,'happy');assert.equal(inspect().gestures.length,1);assert(inspect().output.channels.a>0);
director.setSnapshot(snapshot(3,2.1));director.update(.016);assert.equal(inspect().emotion,'sad');director.setSnapshot(snapshot(2,.1));assert.equal(inspect().emotion,'sad','Stale snapshots cannot rewind sentence intent.');
director.setSnapshot({...snapshot(4,0,'ended'),utteranceId:'stale'});assert.equal(inspect().audioDone,false);
director.setSnapshot(snapshot(4,3,'ended'));for(let n=0;n<7;n++)director.update(.1);assert.equal(inspect().phase,'speaking');director.update(.1);director.update(.001);assert.equal(inspect().phase,'idle');
event('input.begin',{identity:{...identity,generation:2,turnId:'two'}});director.update(.016);assert.equal(inspect().phase,'listening');event('response.complete');assert.equal(inspect().responseDone,false,'Stale completion ignored.');
director.event({type:'cancel'});assert.equal(inspect().phase,'idle');director.setPerformance(perf);assert.equal(inspect().terminal,true);assert.equal(inspect().phase,'idle');
const newId={...identity,generation:3,turnId:'three'};director.event({type:'text.submit',identity:newId});director.setPerformance({...perf,identity:newId,utteranceId:'new',words:[],quality:'audio-only'});director.setSnapshot({...snapshot(1,.1),utteranceId:'new'});assert.equal(inspect().emotion,'happy','Unknown audio-only alignment must not apply every sentence at time zero.');
const bodyOnly=new PerformanceDirector({morphNames:[],writeWeights:()=>false,applyOffsets(){}}, {},()=>.5);bodyOnly.event({type:'input.begin'});assert.deepEqual(Object.keys(bodyOnly.update(.016).weights),[]);
// Restore and reapply offsets against changing and paused fresh bases, never accumulation.
let head=Quaternion.Identity(),eye=Quaternion.Identity();const binding=(name,get,set)=>({name,read:get,write:q=>set(q.clone())});
const layer=new BoneOffsetLayer([binding('頭',()=>head,q=>head=q),binding('両目',()=>eye,q=>eye=q)]);
const output={weights:{},channels:{},head:{nod:.5,tilt:7},gaze:{x:-.8,y:-.7}};
layer.apply(output);const firstHead=head.clone(),firstEye=eye.clone();assert(firstHead.toEulerAngles().x<0,'MMD nod pitches down.');assert(firstEye.toEulerAngles().y>0&&firstEye.toEulerAngles().x>0,'Thinking gaze maps screen-up-left onto the MMD -Z frame.');
for(let i=0;i<1000;i++){layer.beginFrame();layer.apply(output);assert(head.equalsWithEpsilon(firstHead,1e-10));assert(eye.equalsWithEpsilon(firstEye,1e-10));}
layer.beginFrame();const fresh=Quaternion.RotationYawPitchRoll(.3,.1,.2);head=fresh.clone();layer.apply(output);assert(!head.equalsWithEpsilon(firstHead,1e-4));layer.dispose();assert(head.equalsWithEpsilon(fresh,1e-10));assert(eye.equalsWithEpsilon(Quaternion.Identity(),1e-10));
assert.equal(new BoneOffsetLayer([]).inspect().eyes.length,0);
const model={morph:{morphs:[{name:'上'},{name:'あ'}],setMorphWeightFromIndex:(index,value)=>{assert(index<2);assert(Number.isFinite(value));}},runtimeBones:[]};const adapter=new FaceRigAdapter(model);assert(adapter.writeWeights({'上':.5,'missing':1}));assert(!adapter.writeWeights({'あ':.5}));
(async()=>{
 let requested='';context.fetch=async url=>{requested=url;return{ok:true,text:async()=>JSON.stringify({gains:{browUp:Infinity},aliases:{browAngry:['EB_Angry_01']},disable:['tongue']})};};
 assert.deepEqual(Object.keys(await FaceRigAdapter.loadCalibration('../bad',false)),[]);assert.equal(requested,'');const calibration=await FaceRigAdapter.loadCalibration('../bad',true);assert.match(requested,/^\.\/calibration\/[a-f0-9]{64}\.json$/);assert.equal(calibration.disable[0],'tongue');assert(!('browUp'in calibration.gains));
 console.log('Director: phases, no silent speech, actual-clock sentence changes, queued-only gestures, release, stale turns/snapshots, cancellation, audio-only fallback, missing rigs, calibration paths and 1,000 non-accumulating bone frames passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
