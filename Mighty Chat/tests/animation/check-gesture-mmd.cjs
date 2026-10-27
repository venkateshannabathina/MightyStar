'use strict';
require('../../../model-viewer-clean/tools/register-mmd.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load,viewer}=require('./load-production.cjs'),{IdleMotion}=load(path.resolve(__dirname,'../../../model-viewer-clean/src/scene/idleMotion.ts')),{GestureController}=load(path.resolve(__dirname,'../../Renderer/gestures/GestureController.ts')),{GESTURE_TAGS,upperBodyInfluence}=require('../../Shared/GestureRules.cjs');
const clips=require('../../Renderer/assets/gestures.json').clips;
(async()=>{
 const {NullEngine}=viewer('@babylonjs/core/Engines/nullEngine.js'),{Scene}=viewer('@babylonjs/core/scene.js'),{LoadAssetContainerAsync}=viewer('@babylonjs/core/Loading/sceneLoader.js'),{Vector3}=viewer('@babylonjs/core/Maths/math.vector.js');viewer('babylon-mmd/esm/Loader/pmxLoader.js');const {MmdRuntime}=viewer('babylon-mmd/esm/Runtime/mmdRuntime.js'),{CharacterCache}=require('../../Backend/assets/CharacterCache.cjs');
 const engine=new NullEngine(),scene=new Scene(engine),runtime=new MmdRuntime(scene),bytes=fs.readFileSync(new CharacterCache().file('ww/chars/Lynae/Lynae/Lynae.pmx'));
 const open=async()=>{const c=await LoadAssetContainerAsync('data:;base64,'+bytes.toString('base64'),scene,{pluginExtension:'.pmx',pluginOptions:{mmdmodel:{materialBuilder:null,buildMorph:false,buildSkeleton:true,useSdef:false}}});const bones=c.rootNodes[0].metadata.bones;return {model:runtime.createMmdModel(c.rootNodes[0],{buildPhysics:false}),bones};};
 const skeleton=await open(),baseline=await open(),driver=new IdleMotion({random:()=>.4}),base=new IdleMotion({random:()=>.4});driver.configureGestures(clips,upperBodyInfluence);
 const apply=(d,s,dt)=>{d.apply(s.model,dt,s.bones);s.model.beforePhysics(null);s.model.afterPhysics();};
 const lower=s=>s.model.runtimeBones.filter(b=>/^(下半身|センター|[左右](足|ひざ|足首|つま先))$/.test(b.name)).flatMap(b=>{const point=Vector3.Zero();b.getWorldTranslationToRef(point);return [...b.linkedBone.position.asArray(),...b.linkedBone.rotationQuaternion.asArray(),...point.asArray()];});
 let now=0;const controller=new GestureController(driver,clips,()=>.5,()=>now);
 let maxLowerDelta=0,frames=0;const results=[];
 for(const style of ['male','female','dwarf2']){driver.setStyle(style);base.setStyle(style);apply(driver,skeleton,0);apply(base,baseline,0);assert(driver.getGestureBinding().enabled);
 for(const [index,tag]of GESTURE_TAGS.entries()){
  now+=9;const identity={sessionId:'rig',characterId:'c',generation:frames+1,turnId:style+tag.id},utteranceId=identity.turnId;
  controller.event({type:'text.submit',identity});controller.setPerformance({identity,utteranceId,characterId:'c',mouthCues:[],sentenceCues:[{index:0,e:'neutral',i:0,g:tag.id,offset:0}]});controller.setSnapshot({utteranceId,characterId:'c',sequence:1,state:'speaking',positionSeconds:.1,playbackRate:1});
  let upperMoved=0;
  for(let frame=0,limit=Math.ceil(((clips.find(c=>c.id===controller.inspect().active.id).frameCount-1)/clips.find(c=>c.id===controller.inspect().active.id).fps/controller.inspect().active.speed+.3)*60);frame<limit;frame++){controller.update(1/60);apply(driver,skeleton,1/60);apply(base,baseline,1/60);const expected=lower(baseline),actual=lower(skeleton);maxLowerDelta=Math.max(maxLowerDelta,...actual.map((v,i)=>Math.abs(v-expected[i])));assert(actual.every(Number.isFinite));for(const b of skeleton.model.runtimeBones){const q=b.linkedBone.rotationQuaternion;assert(Math.abs(q.length()-1)<1e-5);const other=baseline.model.runtimeBones.find(a=>a.name===b.name);if(/^(頭|[左右](手首|腕))$/.test(b.name))upperMoved=Math.max(upperMoved,1-Math.abs(q.x*other.linkedBone.rotationQuaternion.x+q.y*other.linkedBone.rotationQuaternion.y+q.z*other.linkedBone.rotationQuaternion.z+q.w*other.linkedBone.rotationQuaternion.w));}frames++;now+=1/60;}
  assert(upperMoved>.001,tag.id+' must move the bound upper body.');results.push({style,tag:tag.id,upperMoved});controller.event({type:'cancel'});for(let n=0;n<15;n++){controller.update(1/60);apply(driver,skeleton,1/60);apply(base,baseline,1/60);}
 }}
 assert(maxLowerDelta<1e-6,'Gesture changed hip/leg/foot local or world pose: '+maxLowerDelta);
 fs.mkdirSync(path.resolve(__dirname,'../../docs/wp6-evidence'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../docs/wp6-evidence/retarget-mmd.json'),JSON.stringify({scope:'Actual Lynae MMD runtime (runtime rig), three selected idle styles, 12 gesture tags; paired identical-clock baseline. Hip/leg/foot local and world coordinates compared.',frames,maxLowerDelta,results},null,2)+'\n');scene.dispose();engine.dispose();console.log('MMD retarget: 12 tags × three idles, finite normalized poses, unchanged lower-body world/local transforms; max delta '+maxLowerDelta);
})().catch(e=>{console.error(e);process.exitCode=1});
