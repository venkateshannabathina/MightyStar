'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),ts=require('../../../model-viewer-clean/node_modules/typescript');
let now=0;
const context=vm.createContext({performance:{now:()=>now},Math,Map,Set,Number,Object,JSON});
const viewerRequire=require('node:module').createRequire(path.resolve(__dirname,'../../../model-viewer-clean/package.json'));
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);vm.runInContext('(function(require,module,exports){'+ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText+'})',context)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):viewerRequire(name),module,module.exports);return module.exports;}
const renderer=path.resolve(__dirname,'../../Renderer'),{LipSyncController}=load(path.join(renderer,'face/LipSyncController.ts')),{PerformanceDirector}=load(path.join(renderer,'performance/PerformanceDirector.ts'));
const performance={version:1,utteranceId:'u',characterId:'c',appearanceKey:'key',durationSeconds:1,quality:'audio-only',mouthCues:[],words:[],expression:{mood:'neutral',intensity:0}};
const snap=(sequence,energy,state='speaking')=>({utteranceId:'u',characterId:'c',sequence,positionSeconds:.2,playbackRate:1,state,energy});
const old=new LipSyncController();old.setPerformance(performance);old.setSnapshot(snap(1,.9));assert.equal(old.vowels.a,undefined,'Old renderers ignore the additive field.');
const lip=new LipSyncController(true);lip.setPerformance(performance);lip.setSnapshot(snap(1,.8));assert.equal(lip.vowels.a,.8*.82);assert.equal(lip.quality,'energy-envelope');
lip.setSnapshot(snap(0,0));assert(lip.vowels.a>0,'Stale samples ignored.');
lip.setSnapshot({...snap(2,1),utteranceId:'stale'});assert.equal(lip.energy,.8);
now=181;assert.equal(lip.energy,0,'An interrupted bridge must not hold an open jaw.');now=0;
for(const [energy,expected]of [[NaN,undefined],[Infinity,undefined],[-1,0],[2,1]]){lip.setSnapshot(snap(++now+10,energy));assert.equal(lip.energy,expected);}
for(const [index,state]of ['paused','ended','cancelled','error'].entries()){lip.setSnapshot(snap(100+index,.9,state));assert.equal(lip.vowels.a,0);}
lip.setPerformance({...performance,mouthCues:[{start:0,end:1,pose:'closed'}]});lip.setSnapshot(snap(1,.9));assert.equal(lip.vowels.a,undefined,'Lip closure wins over energy.');
lip.setPerformance({...performance,mouthCues:[{start:0,end:1,pose:'o'}]});lip.setSnapshot(snap(1,.5));assert.equal(lip.vowels.o,.78*.5);
const rig={morphNames:['あ','まばたき'],writeWeights(){return true},applyOffsets(){}};
for(const enabled of [false,true]){const director=new PerformanceDirector(rig,{},()=>.8,undefined,enabled);director.event({type:'text.submit'});director.setPerformance(performance);director.setSnapshot(snap(1,.9));for(let n=0;n<20;n++)director.update(.016);assert(enabled ? director.inspect().output.weights['あ']>.5 : !director.inspect().output.weights['あ']);director.setSnapshot(snap(2,0,'ended'));for(let n=0;n<30;n++)director.update(.016);assert(director.inspect().output.weights['あ']<.001);}
const {FaceMixer}=load(path.join(renderer,'face/FaceMixer.ts'));
for(const energyJaw of [false,true]){const weights={};const rig={set:(name,value)=>{weights[name]=value;return true},reset(){},morphNames:['あ'],writeWeights(){return true},applyOffsets(){}};const mixer=new FaceMixer(rig,undefined,{energyJaw});mixer.setPerformance(performance);mixer.setSnapshot(snap(1,.8));for(let n=0;n<30;n++)mixer.update(.016);assert(energyJaw ? weights.a>.6 : weights.a===0,'Energy flag must work independently of the expressive-face flag.');}
console.log('Energy renderer: additive v1 snapshots, default off, audio-only jaw, cue priority/scaling, silence, stale/invalid/missing samples, pause/end and Director output passed.');
