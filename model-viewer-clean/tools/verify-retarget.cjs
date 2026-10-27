require('./register-mmd.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const {pathToFileURL}=require('node:url');
(async()=>{
 const clip=JSON.parse(fs.readFileSync('res/animations/idle-mixamo.json'));
 let source=fs.readFileSync('src/scene/idleMotion.ts','utf8').replace('import clip from "../../res/animations/idle-mixamo.json";',`const clip=${JSON.stringify(clip)};`).replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(pathToFileURL(require.resolve('@babylonjs/core/Maths/math.vector.js')).href));
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 const {IdleMotion}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 const {PmxReader}=await import('babylon-mmd/esm/Loader/Parser/pmxReader.js');
 const {NullEngine}=await import('@babylonjs/core/Engines/nullEngine.js');
 const {Scene}=await import('@babylonjs/core/scene.js');
 const {Mesh}=await import('@babylonjs/core/Meshes/mesh.js');
 const {Skeleton}=await import('@babylonjs/core/Bones/skeleton.js');
 const {Bone}=await import('@babylonjs/core/Bones/bone.js');
 const {Matrix,Vector3,Quaternion}=await import('@babylonjs/core/Maths/math.vector.js');
 const {MmdRuntime}=await import('babylon-mmd/esm/Runtime/mmdRuntime.js');
 const data=fs.readFileSync(process.argv[2]||'/private/tmp/hutao-idle-test.pmx');
 const pmx=await PmxReader.ParseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
 const engine=new NullEngine();const scene=new Scene(engine);const skeleton=new Skeleton('test','test',scene);
 const created=[];
 function make(i){if(created[i])return created[i];const b=pmx.bones[i];const parent=b.parentBoneIndex>=0?make(b.parentBoneIndex):null;const pos=Vector3.FromArray(b.position);if(parent)pos.subtractInPlace(Vector3.FromArray(pmx.bones[b.parentBoneIndex].position));return created[i]=new Bone(b.name,skeleton,parent,Matrix.Translation(pos.x,pos.y,pos.z));}
 pmx.bones.forEach((_,i)=>make(i));skeleton.bones=created;
 const mesh=new Mesh('test',scene);mesh.metadata={isMmdModel:true,header:pmx.header,bones:pmx.bones,morphs:[],rigidBodies:[],joints:[],meshes:[mesh],materials:[],skeleton};
 const runtime=new MmdRuntime(scene);const model=runtime.createMmdModel(mesh);
 const driver=new IdleMotion();const initialIk=model.ikSolverStates.slice();
 const position=name=>{const v=Vector3.Zero();model.runtimeBones.find(b=>b.name===name).getWorldTranslationToRef(v);return v;};
 const chains=[['LeftArm','LeftForeArm','左腕','左ひじ'],['LeftForeArm','LeftHand','左ひじ','左手首'],['RightArm','RightForeArm','右腕','右ひじ'],['RightForeArm','RightHand','右ひじ','右手首'],['LeftHand','LeftHandMiddle1','左手首','左中指１'],['RightHand','RightHandMiddle1','右手首','右中指１']];
 let worst=1;
 for(let frame=0;frame<2880;frame++) {
  driver.apply(model,frame===0?0:1/30,pmx.bones);model.beforePhysics(null);model.afterPhysics();
  const sourceFrame=frame%288;
  for(const [a,b,ta,tb] of chains){
   if(sourceFrame>=276) continue;
   const expected=Vector3.FromArray(clip.positions[b][sourceFrame]).subtract(Vector3.FromArray(clip.positions[a][sourceFrame])).normalize();
   const actual=position(tb).subtract(position(ta)).normalize();
   const dot=Vector3.Dot(expected,actual);worst=Math.min(worst,dot);
   assert.ok(dot>0.999,`${ta} frame ${frame}: source alignment ${dot}`);
  }
  for(const bone of model.runtimeBones) {
   for(const value of bone.worldMatrix) assert.ok(Number.isFinite(value), `Non-finite transform on ${bone.name}`);
   assert.ok(Math.abs(Math.hypot(...bone.linkedBone.rotationQuaternion.asArray())-1)<1e-4, `Non-unit quaternion on ${bone.name}`);
  }
  assert.ok(position('頭').length()<25, 'Head drifted out of the character bounds');
  if(frame===0)console.log('Frame 0 positions',JSON.stringify(Object.fromEntries(['左腕','左ひじ','左手首','右手首','左足首','右足首','左つま先','右つま先'].map(n=>[n,position(n).asArray()]))));
 }
 driver.release();assert.deepEqual(model.ikSolverStates,initialIk);
 for(const b of model.runtimeBones) assert.ok(Math.abs(b.linkedBone.rotationQuaternion.w-1)<1e-6);
 console.log('PASS: actual PMX runtime, both upper arms/forearms/hands match FBX directions across ten complete loops; worst cosine',worst,'; original pose and IK restored');
 engine.dispose();
})().catch(e=>{console.error(e);process.exitCode=1;});
