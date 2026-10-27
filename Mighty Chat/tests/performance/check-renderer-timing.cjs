'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('../../../model-viewer-clean/node_modules/typescript');
const root = path.resolve(__dirname,'../../Renderer');
let now = 100, calls = [], overlay;
const context = vm.createContext({performance:{now:()=>now++}, Number, Object, JSON,
  document:{getElementById:()=>overlay, createElement:()=>({style:{}}), body:{appendChild:item=>overlay=item}},
  fetch:async (url, options) => {
    calls.push({url,body:options.body ? JSON.parse(options.body):undefined,headers:options.headers});
    return {ok:true,json:async()=>({receivedMs:1100,sentMs:1100}),text:async()=>JSON.stringify({sessionId:'s',generation:1,turnId:'t',timestamps:{input_commit:1100,playback_start:1200}})};
  }});
function load(file) {
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInContext('(function(require,module,exports){'+code+'})',context)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(require.resolve(name,{paths:[path.resolve(__dirname,'../../../model-viewer-clean')]})),module,module.exports);
  return module.exports;
}
(async () => {
  const { PerformanceTiming } = load(path.join(root,'PerformanceTiming.ts'));
  const perf = new PerformanceTiming(()=>'token');
  perf.expressionApplied(); perf.refresh(); assert.equal(calls.length,0);
  const identity = {sessionId:'s',characterId:'c',generation:1,turnId:'t'};
  perf.context({identity,phase:'listening'}); perf.expressionApplied();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.filter(c=>c.url.endsWith('sample')).length,0,'no invented listening motion');
  perf.context({identity,phase:'speaking'}); perf.expressionApplied(); perf.expressionApplied();
  await new Promise(resolve=>setImmediate(resolve));
  let samples = calls.filter(c=>c.url.endsWith('sample'));
  assert.equal(samples.length,1); assert(Number.isFinite(samples[0].body.offsetMs));
  assert.deepEqual(Object.keys(samples[0].body.timestamps),['face_first_expression']);
  assert.equal(samples[0].headers['X-Mighty-Token'],'token');
  now=1000; perf.refresh(); await new Promise(resolve=>setImmediate(resolve));
  assert(overlay.textContent.includes('playback_start: 100.0'));
  assert(overlay.textContent.includes('face_listen_onset: unavailable'));
  perf.suspend(); perf.expressionApplied(); assert.equal(calls.filter(c=>c.url.endsWith('sample')).length,1);
  // Verify the hook only fires after a mapped, nonzero non-vowel/non-blink write.
  const rigModule = load(path.join(root,'face/FaceRigAdapter.ts'));
  const writes=[];
  const rig = new rigModule.FaceRigAdapter({morph:{morphs:[{name:'smile'}], setMorphWeightFromIndex:(i,n)=>writes.push([i,n])}});
  assert.equal(rig.set('a',1),false); assert.equal(rig.set('smile',0.4),true); assert.deepEqual(writes,[[0,0.4]]);
  const { FaceMixer } = load(path.join(root,'face/FaceMixer.ts'));
  let observed=0;
  const bound = new rigModule.FaceRigAdapter({morph:{morphs:[{name:'あ'},{name:'にやり'},{name:'笑い'},{name:'まばたき'}],setMorphWeightFromIndex:()=>{}}});
  const mixer = new FaceMixer(bound,()=>observed++);
  const performanceData = {version:1,utteranceId:'u',characterId:'c',appearanceKey:'k',durationSeconds:2,quality:'audio-only',mouthCues:[],expression:{mood:'neutral',intensity:0}};
  mixer.setPerformance(performanceData);
  mixer.setSnapshot({utteranceId:'u',characterId:'c',sequence:1,positionSeconds:0,playbackRate:1,state:'speaking'});
  mixer.update(0.1); assert.equal(observed,0,'neutral output is not an expression onset');
  mixer.setPerformance({...performanceData,expression:{mood:'happy',intensity:0.6}});
  mixer.update(0.1); assert(observed>0,'mapped expression writes trigger the observer');
  observed=0;
  const sparse = new FaceMixer(new rigModule.FaceRigAdapter({morph:{morphs:[{name:'あ'}],setMorphWeightFromIndex:()=>{}}}),()=>observed++);
  sparse.setPerformance({...performanceData,expression:{mood:'happy',intensity:0.6}});
  sparse.update(0.1); assert.equal(observed,0,'unmapped expression attempts are not observations');
  const originalFetch=context.fetch;
  let clockAvailable=false, attempts=0;
  context.fetch=async (...args)=>{attempts++; if(!clockAvailable) return {ok:false,json:async()=>({})}; return originalFetch(...args);};
  const retry = new PerformanceTiming(()=>'token');
  retry.context({identity,phase:'listening'}); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(attempts,1);
  clockAvailable=true;
  retry.context({identity,phase:'speaking'}); await new Promise(resolve=>setImmediate(resolve));
  assert(attempts>=6,'clock sync retries after the token/backend becomes available');
  context.fetch=originalFetch;
  console.log('Renderer timing: default-off, clock, once-only applied-expression hook, absent listening, overlay and reset passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
