'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const workspace=path.resolve(__dirname,'../../..');
const req=require('node:module').createRequire(path.join(workspace,'model-viewer-clean/package.json'));
require(path.join(workspace,'model-viewer-clean/tools/register-mmd.cjs'));
const ts=req('typescript');
const url=name=>pathToFileURL(req.resolve(name+'.js')).href;
async function main(){
 let source=fs.readFileSync(path.join(workspace,'Mighty Chat/Renderer/CharacterPhysics.ts'),'utf8')
  .replace(/"(@babylonjs\/core\/[^"\n]+|babylon-mmd\/[^"\n]+)"/g,(_,name)=>JSON.stringify(url(name)));
 const {CharacterPhysics}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
 const events=[],scene={physicsEnabled:false,isDisposed:false,_advancePhysicsEngineStep:()=>events.push('step')};let builds=0,disposals=0,resets=0,committed;
 const args=[{},[{name:'Head'},{name:'左胸'}],[{name:'hair',physicsMode:1,boneIndex:0},{name:'左胸',physicsMode:1,boneIndex:1}],[],{},null];
 const builder={buildPhysics(){builds++;return {needDeoptimize:false,initialize(){resets++;},commitBodyStates(value){committed=[...value];},syncBodies(){events.push('bodies');},syncBones(){events.push('bones');},dispose(){disposals++;}};}};
 const physics=new CharacterPhysics(scene,state=>events.push(state),async()=>builder);
 const model=physics.buildPhysics(...args);
 assert.equal(physics.inspect().available,true);assert.equal(physics.inspect().jiggleAvailable,true);assert.equal(builds,0,'physics-off startup does not load bodies');
 assert.equal(model.needDeoptimize,true);
 await physics.setEnabled(true);assert.equal(builds,1);assert.equal(physics.inspect().status,'on');assert.equal(scene.physicsEnabled,false,'automatic scene stepping stays off');
 const stages=[];physics.advance(1/30,seconds=>{stages.push('before');assert.equal(seconds,1/120);},()=>stages.push('after'));
 assert.deepEqual(stages,['before','after','before','after','before','after','before','after'],'slow frames update animation and bones for every fixed solver step');
 assert.equal(events.filter(value=>value==='step').length,4);
 let boundedSteps=0;physics.advance(20,()=>boundedSteps++,()=>{});assert.equal(boundedSteps,12,'sleep or background gaps never cause unbounded catch-up');
 model.syncBodies();assert.equal(resets,1,'first simulation aligns to the current pose');
 await physics.setEnabled(true);assert.equal(builds,1,'repeated settings do not rebuild simulation');
 const states=new Uint8Array([1,1]);physics.setJiggle(false);model.commitBodyStates(states);
 assert.deepEqual(committed,[1,0],'jiggle toggle makes only authored soft-body joints kinematic');assert.deepEqual([...states],[1,1],'authored runtime states stay unchanged');
 physics.setJiggle(true);model.commitBodyStates(states);assert.deepEqual(committed,[1,1]);
 physics.setRunning(false);assert.equal(scene.physicsEnabled,false,'pause stops world stepping');
 physics.setRunning(true);physics.setEditing(true);assert.equal(scene.physicsEnabled,false);assert.equal(model.needDeoptimize,true,'bone editing bypasses simulation');
 physics.setEditing(false);model.syncBodies();assert.ok(resets>=2,'release realigns bodies before resuming');
 await physics.setEnabled(false);assert.equal(disposals,1);assert.equal(model.needDeoptimize,true);assert.equal(scene.physicsEnabled,false);
 await physics.setEnabled(true);assert.equal(builds,2);model.dispose();assert.equal(disposals,2);assert.equal(physics.inspect().available,false);
 physics.dispose();
 let resolve;
 const delayed=new CharacterPhysics({physicsEnabled:false,isDisposed:false},()=>{},()=>new Promise(done=>resolve=done));
 delayed.buildPhysics(...args);const pending=delayed.setEnabled(true);await delayed.setEnabled(false);resolve(builder);await pending;
 assert.equal(delayed.inspect().enabled,false);assert.equal(builds,2,'a cancelled load cannot attach stale physics');delayed.dispose();
 let attempts=0;
 const retrying=new CharacterPhysics({physicsEnabled:false,isDisposed:false},()=>{},async()=>{if(++attempts===1)throw Error('Fixture load error');return builder;});
 retrying.buildPhysics(...args);await retrying.setEnabled(true);assert.equal(retrying.inspect().status,'error');
 await retrying.setEnabled(false);assert.equal(attempts,1,'turning off a failed request never restarts it');
 await retrying.setEnabled(true);assert.equal(retrying.inspect().enabled,true,'a new explicit request can retry loading');retrying.dispose();
 console.log('PASS: physics/jiggle switches, masks, pause, edit suspension, resets, repeated updates, disposal and stale-load cancellation');

 // Run the real WASM solver and authored Evelyn rigid bodies, not a mock.
 const {NullEngine}=await import(url('@babylonjs/core/Engines/nullEngine'));
 const {Scene}=await import(url('@babylonjs/core/scene'));
 const {Matrix,Vector3}=await import(url('@babylonjs/core/Maths/math.vector'));
 const {Skeleton}=await import(url('@babylonjs/core/Bones/skeleton'));
 const {Bone}=await import(url('@babylonjs/core/Bones/bone'));
 const {Mesh}=await import(url('@babylonjs/core/Meshes/mesh'));
 const {MmdRuntime}=await import(url('babylon-mmd/esm/Runtime/mmdRuntime'));
 const {MmdPhysics}=await import(url('babylon-mmd/esm/Runtime/Physics/mmdPhysics'));
 const {HavokPlugin}=await import(url('@babylonjs/core/Physics/v2/Plugins/havokPlugin'));
 const {PmxReader}=await import(url('babylon-mmd/esm/Loader/Parser/pmxReader'));
 const key='zzz/chars/Evelyn Chevalier/Evelyn.pmx';
 const file=path.join(os.homedir(),'Library/Application Support/Mighty Chat/Character Assets',crypto.createHash('sha256').update(key).digest('hex')+'.asset');
 if(!fs.existsSync(file)){console.log('SKIP: real Evelyn physics check needs an already cached model; lifecycle checks passed');return;}
 const bytes=fs.readFileSync(file),pmx=await PmxReader.ParseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const engine=new NullEngine(),world=new Scene(engine);
 const Havok=req('@babylonjs/havok');
 const wasm=fs.readFileSync(path.join(path.dirname(req.resolve('@babylonjs/havok')),'HavokPhysics.wasm'));
 const instance=await Havok({wasmBinary:wasm});
 const live=new CharacterPhysics(world,()=>{},async()=>{
  world.enablePhysics(new Vector3(0,-98,0),new HavokPlugin(true,instance));
  world.getPhysicsEngine().setSubTimeStep(0);
  return new MmdPhysics(world);
 });
 const rig=new Skeleton('Evelyn','Evelyn',world),created=[];
 const make=index=>{if(created[index])return created[index];const data=pmx.bones[index],parent=data.parentBoneIndex>=0?make(data.parentBoneIndex):null,local=Vector3.FromArray(data.position);if(parent)local.subtractInPlace(Vector3.FromArray(pmx.bones[data.parentBoneIndex].position));return created[index]=new Bone(data.name,rig,parent,Matrix.Translation(local.x,local.y,local.z));};
 pmx.bones.forEach((_,i)=>make(i));rig.bones=created;
 const mesh=new Mesh('Evelyn',world);mesh.metadata={isMmdModel:true,header:pmx.header,bones:pmx.bones,morphs:[],rigidBodies:pmx.rigidBodies,joints:pmx.joints,meshes:[mesh],materials:[],skeleton:rig};
 const runtime=new MmdRuntime(world,live),character=runtime.createMmdModel(mesh,{trimMetadata:false});
 character.beforePhysics(null);character.afterPhysics();
 const encode = source => 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
 const idleRoot=path.join(workspace,'model-viewer-clean');
 globalThis.__physicsClips=Object.fromEntries(['male','female','dwarf2'].map(style=>{const file='browser-idle-'+style+'.json';return [file,JSON.parse(fs.readFileSync(path.join(idleRoot,'res/animations',file)))];}));
 const idleSource=fs.readFileSync(path.join(idleRoot,'src/scene/idleMotion.ts'),'utf8')
  .replace(/import (\w+) from "\.\.\/\.\.\/res\/animations\/([^"]+)";/g,(_,name,file)=>`const ${name}=globalThis.__physicsClips[${JSON.stringify(file)}];`)
  .replace('"./idleSequence"',JSON.stringify(encode(fs.readFileSync(path.join(idleRoot,'src/scene/idleSequence.ts'),'utf8'))))
  .replace('"./idleBehavior"',JSON.stringify(encode(fs.readFileSync(path.join(idleRoot,'src/scene/idleBehavior.ts'),'utf8'))))
  .replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(url('@babylonjs/core/Maths/math.vector')));
 const {IdleMotion}=await import(encode(idleSource));
 const idle=new IdleMotion({attention:false});idle.setStyle('female');idle.apply(character,0,pmx.bones);character.beforePhysics(null);character.afterPhysics();
 const initial=character.runtimeBones.map(b=>Array.from(b.worldMatrix));
 await live.setEnabled(true);assert.equal(live.inspect().jiggleBodies,10,'Evelyn has ten authored jiggle bodies');
 let maxDisplacement=0,playing=true,simulationSeconds=0;
 const tick=(ms=1000/60)=>live.advance(ms/1000,seconds=>{
  if(playing){idle.apply(character,seconds,pmx.bones);simulationSeconds+=seconds;}
  character.beforePhysics(null);
 },()=>{
  character.afterPhysics();
  character.runtimeBones.forEach((bone,index)=>{
   const a=bone.worldMatrix,b=initial[index];
   assert.ok([...a].every(Number.isFinite),'finite animated physics transforms');
   const distance=Math.hypot(a[12]-b[12],a[13]-b[13],a[14]-b[14]);
   maxDisplacement=Math.max(maxDisplacement,distance);
   assert.ok(distance<20,`unbounded ${bone.name}: ${distance} at ${ms}ms`);
  });
 });
 // Overlay throttling, editor cadence, and wake-up all use the production clock.
 for(const ms of [1000/60,1000/30,1000/10,250,1000/60])for(let i=0;i<120;i++)tick(ms);
 const beforeSleep=simulationSeconds;tick(20000);
 assert.ok(simulationSeconds-beforeSleep<=.100001,'wake-up advances at most 100ms');
 console.log(`PASS: ${(simulationSeconds).toFixed(1)}s of animated Evelyn at 60/30/10 FPS, stalled frames and wake-up; maximum bone displacement ${maxDisplacement.toFixed(2)} MMD units`);
 let moved=0;character.runtimeBones.forEach((bone,index)=>{
  assert.ok([...bone.worldMatrix].every(Number.isFinite),'Havok leaves finite bone transforms');
  if([...bone.worldMatrix].some((value,i)=>Math.abs(value-initial[index][i])>.0001))moved++;
 });
 assert.ok(moved>10,'actual physics moves secondary bones');
 playing=false;live.setRunning(false);const paused=character.runtimeBones.map(b=>Array.from(b.worldMatrix));for(let i=0;i<10;i++)tick();
 character.runtimeBones.forEach((bone,index)=>assert.ok([...bone.worldMatrix].every((v,i)=>Math.abs(v-paused[index][i])<1e-5),'paused physics stays frozen'));
 playing=true;live.setRunning(true);live.setJiggle(false);for(let i=0;i<15;i++)tick();assert.equal(live.inspect().jiggleEnabled,false);
 live.setJiggle(true);for(let i=0;i<15;i++)tick();assert.equal(live.inspect().jiggleEnabled,true);
 await live.setEnabled(false);tick();assert.equal(live.inspect().enabled,false);
 const chestIndices=character.runtimeBones.map((b,i)=>/胸/.test(b.name)?i:-1).filter(i=>i>=0);
 const scenario=async(delay,frameMs=1000/120)=>{
  await live.setEnabled(false);idle.release();character.beforePhysics(null);character.afterPhysics();
  idle.apply(character,0,pmx.bones);character.beforePhysics(null);character.afterPhysics();
  for(let frame=0;frame<Math.round(6000/frameMs);frame++){
   if(frame*frameMs>=delay && !live.inspect().enabled)await live.setEnabled(true);
   tick(frameMs);
  }
  return chestIndices.map(i=>Array.from(character.runtimeBones[i].worldMatrix));
 };
 const startup=await scenario(0),late=await scenario(1000),slow=await scenario(0,1000/30);
 let chestDifference=0;
 for(let i=0;i<startup.length;i++)chestDifference=Math.max(chestDifference,Math.hypot(...[12,13,14].map(j=>startup[i][j]-late[i][j])));
 assert.ok(chestDifference<.02,`saved startup and later editor enable settle to the same chest pose: ${chestDifference}`);
 let positionDifference=0,angleDifference=0;
 startup.forEach((matrix,i)=>{
  positionDifference=Math.max(positionDifference,Math.hypot(...[12,13,14].map(j=>matrix[j]-slow[i][j])));
  const trace=[0,1,2,4,5,6,8,9,10].reduce((sum,j)=>sum+matrix[j]*slow[i][j],0);
  angleDifference=Math.max(angleDifference,Math.acos(Math.max(-1,Math.min(1,(trace-1)/2))));
 });
 // Rebuilt Havok bodies can differ slightly in contact ordering; compare
 // geometric tolerances, rather than expecting bit-identical solver output.
 assert.ok(positionDifference<.01,`cadence changes chest position by only ${positionDifference} MMD units`);
 assert.ok(angleDifference<Math.PI/180,`cadence changes chest rotation by less than one degree: ${angleDifference}`);
 console.log('PASS: chest transforms agree across editor/overlay cadences; saved-start and later-toggle positions differ by less than .02 MMD units');
 runtime.dispose(world);live.dispose();world.dispose();engine.dispose();
 console.log(`PASS: real Havok WASM, Evelyn's authored collisions and springs, ${moved} moving bones, finite simulation, freeze, jiggle off/on and cleanup`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
