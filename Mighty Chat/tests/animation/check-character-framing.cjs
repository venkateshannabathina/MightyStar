'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
const req=require('node:module').createRequire(path.join(root,'model-viewer-clean/package.json'));
const ts=req('typescript'),url=name=>pathToFileURL(req.resolve(name+'.js')).href;
async function main(){
 const source=fs.readFileSync(path.join(root,'Mighty Chat/Renderer/CharacterFraming.ts'),'utf8')
  .replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(url('@babylonjs/core/Maths/math.vector')));
 const {frameCharacter,characterCameraAlpha,characterCameraBeta}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
 const {NullEngine}=await import(url('@babylonjs/core/Engines/nullEngine'));
 const {Scene}=await import(url('@babylonjs/core/scene'));
 const {ArcRotateCamera}=await import(url('@babylonjs/core/Cameras/arcRotateCamera'));
 const {Vector3}=await import(url('@babylonjs/core/Maths/math.vector'));
 assert.ok(Math.abs(characterCameraAlpha+Math.PI/2)<1e-10&&Math.abs(characterCameraBeta-Math.PI/2)<1e-10,'default camera is a level, straight-on front view');
 const engine=new NullEngine(),scene=new Scene(engine);
 const camera=new ArcRotateCamera('character',characterCameraAlpha,characterCameraBeta,30,Vector3.Zero(),scene);
 // Different depths exercise perspective, not just a flat silhouette.
 const landmarks=[[-.6,19,-.4],[.6,19,-.4],[-1,16,-1.2],[1,16,-1.2],[-1.5,17,0],[1.5,17,0]].map(p=>Vector3.FromArray(p));
 let baseline;
 for(const [mode,width,height,editing,leftInset=0] of [['selection',1600,1000,false],['selection',1600,1000,true],['face',1280,720,false,216],['face',900,700,false,216],['player',900,900,false],['portrait',360,620,false],['full',360,900,false],['player',540,360,false]]){
  engine.getAspectRatio=()=>width/height;
  frameCharacter(camera,22,mode,width/height,392,width,editing,leftInset);
  const matrix=camera.getTransformationMatrix();
  const points=landmarks.map(point=>{const p=Vector3.TransformCoordinates(point,matrix);return [p.x*width,p.y*height];});
  const distance=(a,b)=>Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1]);
  const proportions=[distance(2,3)/distance(0,1),distance(4,5)/distance(0,1)];
  baseline??=proportions;
  proportions.forEach((ratio,i)=>assert.ok(Math.abs(ratio-baseline[i])<1e-5,`${mode} preserves chest/head and shoulder/head proportions: ${ratio} vs ${baseline[i]}`));
  const center=mode==='face'?.875:mode==='player'?.82:mode==='portrait'?.79:mode==='selection'&&!editing?.72:.5;
  const projected=Vector3.TransformCoordinates(new Vector3(0,22*center,0),matrix);
  assert.ok(Math.abs(projected.y)<1e-5,`${mode} centers the intended crop`);
  assert.ok(Math.abs(projected.x-(mode==='face'?Math.min(leftInset/width,.3)-Math.min(392/width,.55):mode==='selection'?-Math.min(392/width,.55):0))<1e-5,'editor leaves the inspector and expression list clear');
 }
 scene.dispose();engine.dispose();
 console.log('PASS: editor, overlay, portrait, player, narrow and wide viewports preserve 3D chest/head proportions and crop centers');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
