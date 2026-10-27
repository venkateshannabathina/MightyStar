import fs from 'node:fs';
import { NullEngine } from '../model-viewer-clean/node_modules/@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '../model-viewer-clean/node_modules/@babylonjs/core/scene.js';
import { SceneLoader } from '../model-viewer-clean/node_modules/@babylonjs/core/Loading/sceneLoader.js';
import { Vector3 } from '../model-viewer-clean/node_modules/@babylonjs/core/Maths/math.vector.js';
import '../model-viewer-clean/node_modules/@babylonjs/loaders/glTF/index.js';

const engine=new NullEngine();
const scene=new Scene(engine);
scene.useRightHandedSystem=false;
SceneLoader.OnPluginActivatedObservable.add(plugin => {plugin.skipMaterials=true;});
const data=fs.readFileSync(new URL('../Mighty Chat/Sources/Characters/hailey/hailey.glb',import.meta.url));
const result=await SceneLoader.ImportMeshAsync(null,'','data:;base64,'+data.toString('base64'),scene,null,'.glb');
scene.updateTransformMatrix(true);
result.skeletons.forEach(s=>s.computeAbsoluteMatrices(true));
const report={meshes:result.meshes.map(m=>({name:m.name,position:m.position.asArray(),scaling:m.scaling.asArray(),rotation:m.rotationQuaternion?.asArray(),parent:m.parent?.name,world:m.computeWorldMatrix(true).asArray()})),skeletons:[]};
for(const skeleton of result.skeletons){
 const list={name:skeleton.name,bones:[]};
 for(const bone of skeleton.bones){
  if(!['Bip001','Bip001-Head','Bip001-L-Hand','Bip001-R-Hand','Bip001-L-Foot','Bip001-R-Foot','Dummy_Root'].includes(bone.name))continue;
  const n=bone.getTransformNode();
  list.bones.push({name:bone.name,parent:bone.getParent()?.name,bindPosition:bone.getAbsoluteInverseBindMatrix().clone().invert().getTranslation().asArray(),absolutePosition:bone.getAbsoluteMatrix().getTranslation().asArray(),restPosition:bone.getRestMatrix().getTranslation().asArray(),node:n?{name:n.name,position:n.position.asArray(),rotation:n.rotationQuaternion?.asArray(),parent:n.parent?.name,worldPosition:n.computeWorldMatrix(true).getTranslation().asArray(),world:n.getWorldMatrix().asArray()}:null});
 }
 report.skeletons.push(list);
}
fs.writeFileSync(new URL('./babylon-loader-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.skeletons,null,2));
console.log('root',report.meshes[0]);
engine.dispose();
