'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const requireViewer = require('node:module').createRequire(path.resolve(__dirname,'../../../model-viewer-clean/package.json'));
const ts = requireViewer('typescript');
const app = path.resolve(__dirname,'../..');
const encode = value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');
const moduleURL = name=>pathToFileURL(requireViewer.resolve(name+'.js')).href;
const compile = text=>encode(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
async function main(){
 const mathSource = fs.readFileSync(path.join(app,'Renderer/PoseEditorMath.ts'),'utf8').replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(moduleURL('@babylonjs/core/Maths/math.vector')));
 const mathURL=compile(mathSource),{correctionAfterWorldDrag}=await import(mathURL);
 const {Matrix,Quaternion,Vector3}=await import(moduleURL('@babylonjs/core/Maths/math.vector'));
 const base=Quaternion.FromEulerAngles(.2,-.3,.4),offset=Quaternion.FromEulerAngles(.1,.12,-.09);
 for(const scale of [new Vector3(1,1,1),new Vector3(1,1,-1),new Vector3(-2,2,2)]){
  const parent=Matrix.Compose(scale,Quaternion.FromEulerAngles(-.1,.6,.2),new Vector3(2,3,1));
  const startLocal=base.multiply(offset),startWorld=Matrix.Compose(Vector3.One(),startLocal,new Vector3(.2,.8,.1)).multiply(parent);
  const proxy=Quaternion.Identity();startWorld.decompose(undefined,proxy);
  for(const worldAxis of [Vector3.Right(),Vector3.Up(),Vector3.Forward()]){
   const delta=Quaternion.RotationAxis(worldAxis,.37),end=delta.multiply(proxy);
   const corrected=correctionAfterWorldDrag(startWorld,proxy,end,offset);
   const finalWorld=Matrix.Compose(Vector3.One(),base.multiply(corrected),new Vector3(.2,.8,.1)).multiply(parent);
   for(const localAxis of [Vector3.Right(),Vector3.Up(),Vector3.Forward()]){
    const expected=Vector3.TransformNormal(localAxis,startWorld).normalize().rotateByQuaternionToRef(delta,Vector3.Zero());
    const actual=Vector3.TransformNormal(localAxis,finalWorld).normalize();
    assert.ok(Vector3.Dot(expected,actual)>1-1e-6,`ring direction must match rendered bone with determinant ${parent.determinant()}`);
   }
  }
 }
 console.log('PASS: rotation-ring world/local conversion, existing offsets, rotated parents, uniform scale and reflected GLB roots');
 const vm=require('node:vm'),renderer=fs.readFileSync(path.join(app,'Renderer/companion.ts'),'utf8');
 const section=(a,b)=>renderer.slice(renderer.indexOf(a),renderer.indexOf(b,renderer.indexOf(a)));
 const messages=[],applied=[];let callbacks;
 const context=vm.createContext({Quaternion,scene:{},canvas:{},pointer:{},latest:{key:'fixture'},performance:{now:()=>100},degreesFromQuaternion:(await import(mathURL)).degreesFromQuaternion,
  setEditorSettings(){},publishEditorParts(){},characterCameraAlpha:0,characterCameraBeta:1.27,
  physics:{setEnabled(){},setJiggle(){},setRunning(){},setEditing(){},inspect(){return {}; }},
  idle:{setBoneTuning:value=>applied.push(structuredClone(value))},
  BonePoseEditor:class {constructor(scene,canvas,handlers){callbacks=handlers;}setEnabled(){}inspect(){return {}; }},
  webkit:{messageHandlers:{animationTuning:{postMessage:value=>messages.push(structuredClone(value))}}},parent:{postMessage(){}},framing:'selection',desktopInteraction:false});
 context.window=context;
 const code=section('type AnimationTuning =','let framing =')+section('const poseEditor =','function bindPoseEditor()');
 vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 vm.runInContext('setAnimationTuning({strength:.35,bones:{Head:[20,8,-3]}})',context);
 const oldEffective=Quaternion.Slerp(Quaternion.Identity(),Quaternion.FromEulerAngles(20*Math.PI/180,8*Math.PI/180,-3*Math.PI/180),.35);
 callbacks.begin();
 assert.equal(messages.at(-1).event,'begin');assert.equal(messages.at(-1).playing,false,'a ring drag pauses playback');
 assert.ok(Math.abs(Quaternion.Dot(callbacks.correction('Head'),oldEffective))>1-1e-8,'begin bakes the visible partial-strength offset without a jump');
 const target=Quaternion.FromEulerAngles(.4,.2,-.1);callbacks.changed('Head',target,true);
 assert.equal(messages.at(-1).event,'change');assert.equal(messages.at(-1).animationTuning.strength,1);
 assert.ok(Math.abs(Quaternion.Dot(callbacks.correction('Head'),target))>1-1e-8,'ring edits update the same saved bone settings as precision controls');
 callbacks.ended();assert.equal(messages.at(-1).event,'end');assert.equal(messages.at(-1).playing,true,'drag release restores playback');
 vm.runInContext('motionPlaying=false;setAnimationTuning({enabled:false,bones:{Head:[40,0,0]}})',context);
 callbacks.begin();assert.ok(Math.abs(Quaternion.Dot(callbacks.correction('Head'),Quaternion.Identity()))>1-1e-8,'dragging a bypassed pose begins from its actual visible orientation');
 callbacks.ended();assert.equal(messages.at(-1).playing,false,'an already paused preview stays paused');
 console.log('PASS: production drag callbacks, native undo boundary, saved tuning, strength/bypass baking, and playback restoration');
 const {NullEngine}=await import(moduleURL('@babylonjs/core/Engines/nullEngine'));
 const {Scene}=await import(moduleURL('@babylonjs/core/scene'));
 const {ArcRotateCamera}=await import(moduleURL('@babylonjs/core/Cameras/arcRotateCamera'));
 const {TransformNode}=await import(moduleURL('@babylonjs/core/Meshes/transformNode'));
 const {PointerEventTypes,PointerInfo}=await import(moduleURL('@babylonjs/core/Events/pointerEvents'));
 let editorSource=fs.readFileSync(path.join(app,'Renderer/BonePoseEditor.ts'),'utf8')
   .replace(/"(@babylonjs\/core\/[^"\n]+)"/g,(_,name)=>JSON.stringify(moduleURL(name)))
   .replace('"./PoseEditorMath"',JSON.stringify(mathURL));
 const {BonePoseEditor}=await import(compile(editorSource));
 const engine=new NullEngine({renderWidth:960,renderHeight:720}),scene=new Scene(engine);
 new ArcRotateCamera('test',-Math.PI/2,Math.PI/2,4,new Vector3(0,1,0),scene);
 const canvas={clientWidth:960,clientHeight:720,style:{},getBoundingClientRect:()=>({left:0,top:0})};
 const events=[];
 const editor=new BonePoseEditor(scene,canvas,{selected:s=>events.push(['selected',s]),begin:()=>events.push(['begin']),correction:()=>Quaternion.Identity(),changed:(s,q,final)=>events.push(['changed',s,q.clone(),final]),ended:()=>events.push(['end'])});
 const root=new TransformNode('hips',scene),chest=new TransformNode('chest',scene),hand=new TransformNode('hand',scene);
 root.position.y=1;chest.parent=root;chest.position.y=.3;hand.parent=chest;hand.position.x=-.4;
 editor.bind([{source:'Hips',name:'hips',world:()=>root.computeWorldMatrix(true)},{source:'Spine2',name:'chest',world:()=>chest.computeWorldMatrix(true)},{source:'LeftHand',name:'hand',world:()=>hand.computeWorldMatrix(true)}]);
 editor.setEnabled(true);scene.render();scene.render();
 assert.equal(editor.inspect().joints.length,3);assert.equal(editor.inspect().selected,'Spine2');
 assert.ok(editor.inspect().joints.every(j=>j.world.every(Number.isFinite)&&j.screen.every(Number.isFinite)));
 assert.equal(editor.edges.length,2,'missing intermediate mapped joints connect to their nearest existing ancestor');
 const dot=editor.dots.get('LeftHand');
 editor.layer.utilityLayerScene.onPointerObservable.notifyObservers(new PointerInfo(PointerEventTypes.POINTERDOWN,{button:0},{pickedMesh:dot}));
 assert.equal(editor.inspect().selected,'LeftHand');assert.deepEqual(events.at(-1),['selected','LeftHand']);
 scene.render();
 const proxyStart=editor.proxy.rotationQuaternion.clone();
 editor.gizmo.onDragStartObservable.notifyObservers({});
 editor.proxy.rotationQuaternion=Quaternion.RotationAxis(Vector3.Up(),.2).multiply(proxyStart);
 editor.gizmo.onDragObservable.notifyObservers({});
 assert.equal(editor.inspect().dragging,true);assert.ok(events.some(e=>e[0]==='changed'));
 editor.gizmo.onDragEndObservable.notifyObservers({});
 assert.equal(editor.inspect().dragging,false);assert.equal(events.at(-1)[0],'end');assert.equal(events.at(-2)[3],true,'release sends the final rotation');
 const finger=new TransformNode('index finger',scene);finger.parent=hand;finger.position.x=-.1;
 editor.bind([...editor.joints.values(),{source:'LeftHandIndex1',name:'finger',world:()=>finger.computeWorldMatrix(true)}]);
 editor.setOptions({snap:false,showFingers:false});scene.render();
 assert.equal(editor.dots.get('LeftHandIndex1').isEnabled(),false,'body mode hides finger markers');
 editor.setOptions({snap:true,showFingers:true});
 assert.equal(editor.dots.get('LeftHandIndex1').isEnabled(),true,'hand-joints control reveals finger markers');
 assert.ok(Math.abs(editor.gizmo.snapDistance-5*Math.PI/180)<1e-10,'snap control changes the real rotation gizmo');
 assert.equal(editor.inspect().showFingers,true);
 assert.ok(editor.selectedPosition().asArray().every(Number.isFinite),'focus receives the selected joint world position');
 editor.setEnabled(false);assert.equal(editor.layer.shouldRender,false);assert.equal(editor.layer.pickingEnabled,false);
 assert.equal(editor.gizmo.attachedNode,null,'leaving Animation removes the rings');
 editor.setEnabled(true);scene.render();editor.clear();assert.equal(editor.dots.size,0);assert.equal(editor.inspect().joints.length,0);
 editor.dispose();scene.dispose();engine.dispose();
 console.log('PASS: real Babylon overlay construction, visible joints/edges, selection, ring-drag lifecycle, final edit, tab gating and cleanup');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
