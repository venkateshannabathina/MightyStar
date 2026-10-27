'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const workspace=path.resolve(__dirname,'../../..'),viewer=path.join(workspace,'model-viewer-clean');
const req=require('node:module').createRequire(path.join(viewer,'package.json'));
require(path.join(viewer,'tools/register-mmd.cjs'));
const ts=req('typescript'),url=name=>pathToFileURL(req.resolve(name+'.js')).href;
const encode=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
async function main(){
 const {NullEngine}=await import(url('@babylonjs/core/Engines/nullEngine')),{Scene}=await import(url('@babylonjs/core/scene'));
 const {Matrix,Vector3,Quaternion}=await import(url('@babylonjs/core/Maths/math.vector'));
 const {Skeleton}=await import(url('@babylonjs/core/Bones/skeleton')),{Bone}=await import(url('@babylonjs/core/Bones/bone')),{Mesh}=await import(url('@babylonjs/core/Meshes/mesh'));
 const {MmdRuntime}=await import(url('babylon-mmd/esm/Runtime/mmdRuntime')),{PmxReader}=await import(url('babylon-mmd/esm/Loader/Parser/pmxReader'));
 const {HavokPlugin}=await import(url('@babylonjs/core/Physics/v2/Plugins/havokPlugin')),{MmdPhysics}=await import(url('babylon-mmd/esm/Runtime/Physics/mmdPhysics'));
 const physicsSource=fs.readFileSync(path.join(workspace,'Mighty Chat/Renderer/CharacterPhysics.ts'),'utf8').replace(/"(@babylonjs\/core\/[^"\n]+|babylon-mmd\/[^"\n]+)"/g,(_,name)=>JSON.stringify(url(name)));
 const {CharacterPhysics}=await import(encode(physicsSource));
 const Havok=req('@babylonjs/havok'),wasm=fs.readFileSync(path.join(path.dirname(req.resolve('@babylonjs/havok')),'HavokPhysics.wasm'));
 const instance=await Havok({wasmBinary:wasm});
 globalThis.__waistClips=Object.fromEntries(['male','female','dwarf2'].map(style=>{const file='browser-idle-'+style+'.json';return [file,JSON.parse(fs.readFileSync(path.join(viewer,'res/animations',file)))];}));
 const source=fs.readFileSync(path.join(viewer,'src/scene/idleMotion.ts'),'utf8')
  .replace(/import (\w+) from "\.\.\/\.\.\/res\/animations\/([^"]+)";/g,(_,name,file)=>`const ${name}=globalThis.__waistClips[${JSON.stringify(file)}];`)
  .replace('"./idleSequence"',JSON.stringify(encode(fs.readFileSync(path.join(viewer,'src/scene/idleSequence.ts'),'utf8'))))
  .replace('"./idleBehavior"',JSON.stringify(encode(fs.readFileSync(path.join(viewer,'src/scene/idleBehavior.ts'),'utf8'))))
  .replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(url('@babylonjs/core/Maths/math.vector')));
 const {IdleMotion}=await import(encode(source));
 for(const key of ['ww/chars/Lynae/Lynae/Lynae.pmx','ww/chars/Rover (Female)/Rover (Female)/Rover (Female).pmx']){
  const file=path.join(os.homedir(),'Library/Application Support/Mighty Chat/Character Assets',crypto.createHash('sha256').update(key).digest('hex')+'.asset');
  assert(fs.existsSync(file),'Real cached character is required: '+key);
  const bytes=fs.readFileSync(file),pmx=await PmxReader.ParseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  const engine=new NullEngine(),world=new Scene(engine),rig=new Skeleton(key,key,world),bones=[];
  const make=i=>{if(bones[i])return bones[i];const b=pmx.bones[i],parent=b.parentBoneIndex>=0?make(b.parentBoneIndex):null,p=Vector3.FromArray(b.position);if(parent)p.subtractInPlace(Vector3.FromArray(pmx.bones[b.parentBoneIndex].position));return bones[i]=new Bone(b.name,rig,parent,Matrix.Translation(p.x,p.y,p.z));};
  pmx.bones.forEach((_,i)=>make(i));rig.bones=bones;
  const mesh=new Mesh(key,world);mesh.metadata={isMmdModel:true,header:pmx.header,bones:pmx.bones,morphs:[],rigidBodies:pmx.rigidBodies,joints:pmx.joints,meshes:[mesh],materials:[],skeleton:rig};
  const physics=new CharacterPhysics(world,()=>{},async()=>{world.enablePhysics(new Vector3(0,-98,0),new HavokPlugin(true,instance));world.getPhysicsEngine().setSubTimeStep(0);return new MmdPhysics(world);});
  const runtime=new MmdRuntime(world,physics),model=runtime.createMmdModel(mesh,{buildPhysics:true,trimMetadata:false}),idle=new IdleMotion({attention:false});
  const hip=model.runtimeBones.find(b=>b.name==='下半身');let minUp=1;
  for(const style of ['male','female','dwarf2']){
   assert(idle.setStyle(style));
   for(let frame=0;frame<360;frame++){
    idle.apply(model,1/60,pmx.bones);model.beforePhysics(null);model.afterPhysics();
    const matrix=Matrix.FromArray(hip.worldMatrix),q=Quaternion.FromRotationMatrix(matrix),up=Vector3.Up().rotateByQuaternionToRef(q,Vector3.Zero());
    minUp=Math.min(minUp,up.y);assert(up.y>.7,`${key}: pelvis inverted in ${style}: upward alignment ${up.y}`);
    for(const b of model.runtimeBones)assert([...b.worldMatrix].every(Number.isFinite),'finite waist/accessory transforms');
   }
  }
  const initial=model.runtimeBones.map(b=>Array.from(b.worldMatrix));let maxDisplacement=0;
  await physics.setEnabled(true);assert.equal(physics.inspect().status,'on');
  for(let frame=0;frame<480;frame++)physics.advance(1/60,seconds=>{idle.apply(model,seconds,pmx.bones);model.beforePhysics(null);},()=>{
   model.afterPhysics();for(let i=0;i<model.runtimeBones.length;i++){
    const matrix=model.runtimeBones[i].worldMatrix,baseline=initial[i];assert([...matrix].every(Number.isFinite),'cloth transforms stay finite under real gravity');
    const displacement=Math.hypot(matrix[12]-baseline[12],matrix[13]-baseline[13],matrix[14]-baseline[14]);maxDisplacement=Math.max(maxDisplacement,displacement);
    assert(displacement<20,`${key}: unbounded cloth ${model.runtimeBones[i].name}: ${displacement}`);
   }
  });
  console.log(`PASS: real Havok gravity + ${pmx.rigidBodies.length} bodies / ${pmx.joints.length} joints; maximum accessory displacement ${maxDisplacement.toFixed(2)}`);
  console.log(`PASS: ${key}: all three idles keep the real pelvis upright (min up=${minUp.toFixed(3)}); ${bones.length} finite body/accessory transforms`);
  runtime.dispose(world);physics.dispose();world.dispose();engine.dispose();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
