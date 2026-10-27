'use strict';
// Exercise the production renderer's message and frame handlers without a server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../../model-viewer-clean/node_modules/typescript');
const source = fs.readFileSync(path.resolve(__dirname,'../../Renderer/companion.ts'),'utf8');
const section = (start,end) => {
  const a=source.indexOf(start), b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a);return source.slice(a,b);
};
const frames=[],tunings=[],loads=[],styles=[],listeners={};
let frame;
const context=vm.createContext({
  performance:{now:()=>16},appearanceEditor:{animateFace(){},isPreviewing(){return false;}},faceMotion:{sample(){return {};},event(){}},faceCharacterId:'',bindFace(){},
  model:{},skeleton:undefined,bones:[],skeletonOptions:{},desktopInteraction:false,framing:'selection',editorInset:0,backendToken:'',
  runtime:{beforePhysics(){},afterPhysics(){}},
  setEditorSettings(){},publishEditorParts(){},characterCameraAlpha:0,characterCameraBeta:1.27,
  physics:{advance:(delta,before,after)=>{before(Math.min(.1,delta));after();},setEnabled(){},setJiggle(){},setRunning(){},setEditing(){},inspect(){return {}; }},
  idle:{setBoneTuning:value=>tunings.push(value),getTunableBones:()=>[],setStyle:value=>styles.push(value),setHovered(){},setPointer(){},
    apply:(model,delta)=>frames.push(delta),applySkeleton:(skeleton,delta)=>frames.push(delta)},
  scene:{onBeforeAnimationsObservable:{add:callback=>{frame=callback;}}},
  engine:{getDeltaTime:()=>16},document:{hidden:false},
  editorEnvironment:{setEnabled(){}},fit(){},resetCamera(){},load:value=>loads.push(value),
  syncPoseEditor(){},poseEditor:{select(){},release(){}},
  parent:{},addEventListener:(type,callback)=>{listeners[type]=callback;}
});
context.window=context;
const code=section('let motionPlaying = true;','let framing =')+section('scene.onBeforeAnimationsObservable.add(', 'document.getElementById("retry")!');
vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
context.mightyAnimationTuning=vm.runInContext('()=>({playing:motionPlaying,speed:animationSpeed,animationTuning})',context);
const message=data=>listeners.message({source:context.parent,data});
const control=data=>message({type:'mighty-companion-control',...data});
frame();assert.equal(frames.at(-1),.016);
control({playing:false});const count=frames.length;frame();assert.equal(frames.length,count,'pause freezes the loop');
control({animationTuning:{speed:.5,bones:{Head:[10,0,0]}}});frame();
assert.equal(frames.at(-1),0,'paused tuning reevaluates the frozen pose');
frame();assert.equal(frames.length,count+1,'dirty state clears after one paused update');
assert.equal(context.mightyAnimationTuning().playing,false,'tuning preserves pause');
control({playing:true});frame();assert.equal(frames.at(-1),.008,'saved speed scales playback');
control({animationTuning:{speed:100}});frame();assert.equal(frames.at(-1),.032,'speed is bounded to 2×');
control({animationTuning:{speed:NaN}});frame();assert.equal(frames.at(-1),.016,'invalid speed uses normal playback');
control({playing:false,idleStyle:'dwarf2'});frame();assert.equal(frames.at(-1),0,'preset changes update a paused preview');
assert.equal(styles.at(-1),'dwarf2');
context.model=undefined;context.skeleton={};control({animationTuning:{speed:.75}});frame();
assert.equal(frames.at(-1),0,'fallback skeleton also reevaluates paused edits');
const before=tunings.length;
listeners.message({source:{},data:{type:'mighty-companion-control',animationTuning:{speed:2}}});
assert.equal(tunings.length,before,'unrelated windows cannot control the character');
const appearance={key:'new',name:'new',directory:'local/chars/hailey',file:'hailey.glb'};
message({type:'mighty-companion-load',appearance});
assert.equal(Object.keys(tunings.at(-1).bones).length,0,'switching to an untuned character clears old corrections');
assert.equal(context.mightyAnimationTuning().speed,1,'untuned character returns to normal speed');
assert.equal(loads.at(-1),appearance);
console.log('PASS: production tuning messages, paused refresh, no repeated writes, speed bounds, GLB/MMD dispatch, source guard and character isolation');
