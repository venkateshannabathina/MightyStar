import { AlphaHitMask } from "./AlphaHitMask";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Materials/Textures/Loaders/tgaTextureLoader";
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import "@babylonjs/loaders/glTF";
import "babylon-mmd/esm/Loader/mmdOutlineRenderer";
import "babylon-mmd/esm/Loader/Shaders/textureAlphaChecker.fragment";
import "babylon-mmd/esm/Loader/Shaders/textureAlphaChecker.vertex";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Skeleton } from "@babylonjs/core/Bones/skeleton";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdModelMetadata } from "babylon-mmd/esm/Loader/mmdModelMetadata";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { RegisterDxBmpTextureLoader } from "babylon-mmd/esm/Loader/registerDxBmpTextureLoader";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { IdleMotion } from "../../model-viewer-clean/src/scene/idleMotion";
import type { SkeletonIdleOptions } from "../../model-viewer-clean/src/scene/idleMotion";
import { afterBuildSingleMaterialDefault } from "../../model-viewer-clean/src/sceneBuilder.materials";
import { CharacterLighting } from "./CharacterLighting";
import { EditorEnvironment } from "./EditorEnvironment";
import { AppearanceEditor } from "./AppearanceEditor";
import { FaceMotion } from "./FaceMotion";
import { CharacterPhysics } from "./CharacterPhysics";
import { frameCharacter, characterCameraAlpha, characterCameraBeta } from "./CharacterFraming";
import { BonePoseEditor } from "./BonePoseEditor";
import type { PoseJoint } from "./BonePoseEditor";
import { degreesFromQuaternion } from "./PoseEditorMath";

type Appearance = { key: string; name: string; directory: string; file: string };
const canvas = document.querySelector("canvas")!;
const status = document.getElementById("status")!;
const engine = new Engine(canvas, true, { alpha: true, stencil: true, premultipliedAlpha: false, audioEngine: false }, true);
// Preserve crisp detail on Retina displays; hit testing uses a separate canvas.
engine.setHardwareScalingLevel(1 / Math.min(2, window.devicePixelRatio || 1));
SdefInjector.OverrideEngineCreateEffect(engine);
RegisterDxBmpTextureLoader();
const scene = new Scene(engine);
scene.clearColor = new Color4(0, 0, 0, 0);
const camera = new ArcRotateCamera("portrait", characterCameraAlpha, characterCameraBeta, 24, new Vector3(0, 12, 0), scene);
camera.minZ = 0.1;
camera.maxZ = 1000;
const lighting = new CharacterLighting(scene);
const editorEnvironment = new EditorEnvironment(scene);
const materials = new MmdStandardMaterialBuilder();
materials.afterBuildSingleMaterial = afterBuildSingleMaterialDefault;
const physics = new CharacterPhysics(scene,state=>{
    if (disposed) return;
    if (state.status === "error") animationTuning = {...animationTuning,physicsEnabled:false};
    const value = {event:"physics",key:latest?.key,physics:state,animationTuning};
    (window as any).webkit?.messageHandlers?.animationTuning?.postMessage(value);
    window.parent.postMessage({type:"mighty-pose-edit",...value},"*");
});
const runtime = new MmdRuntime(scene,physics);
const idle = new IdleMotion({attention:false});
const appearanceEditor = new AppearanceEditor();
const faceMotion = new FaceMotion();
let faceCharacterId = "";
function bindFace():void {
    const info=appearanceEditor.inspect();
    faceMotion.bind(faceCharacterId,activeKey,info.expressions,info.expressionLibrary,performance.now());
}
let editorSettings: unknown;
function publishEditorParts(): void {
    (window as any).webkit?.messageHandlers?.animationTuning?.postMessage({event:"editorParts",key:activeKey,...appearanceEditor.inspect()});
}
function setEditorSettings(value:unknown): void { editorSettings=value; appearanceEditor.apply(value); faceMotion.setLibrary(appearanceEditor.inspect().expressionLibrary); }
let current: AssetContainer | undefined;
let model: MmdModel | undefined;
let skeleton: Skeleton | undefined;
let skeletonOptions: SkeletonIdleOptions = {};
let bones: readonly MmdModelMetadata.Bone[] = [];
let request = 0;
let activeKey = "";
let height = 18;
let disposed = false;
type AnimationTuning = {physicsEnabled?:boolean;jiggleEnabled?:boolean;version:number;enabled:boolean;speed:number;strength:number;bones:Record<string,[number,number,number]>};
let motionPlaying = true;
let animationSpeed = 1;
let tuningDirty = false;
let animationTuning: AnimationTuning = {version:1,enabled:true,speed:1,strength:1,bones:{}};
let poseEditing = false;
let poseBonesVisible = true;
let resumeAfterPoseDrag = true;
let lastPoseChange = 0;
function setAnimationTuning(value: unknown): void {
    const data = value && typeof value === "object" ? value as Partial<AnimationTuning> : {};
    const finite = (n:unknown, fallback:number, lo:number, hi:number):number => typeof n === "number" && Number.isFinite(n) ? Math.max(lo,Math.min(hi,n)) : fallback;
    const rotations: Record<string,[number,number,number]> = {};
    if (data.bones && typeof data.bones === "object" && !Array.isArray(data.bones)) {
        for (const [source,values] of Object.entries(data.bones).slice(0,80)) {
            if (!Array.isArray(values) || values.length !== 3 || !values.every(v=>typeof v === "number" && Number.isFinite(v))) continue;
            Object.defineProperty(rotations,source,{value:values.map(v=>finite(v,0,-180,180)),enumerable:true});
        }
    }
    animationTuning = {version:1,physicsEnabled:data.physicsEnabled===true,jiggleEnabled:data.jiggleEnabled!==false,enabled:data.enabled!==false,speed:finite(data.speed,1,.25,2),strength:finite(data.strength,1,0,1),bones:rotations};
    idle.setBoneTuning(animationTuning);
    animationSpeed = animationTuning.speed; tuningDirty = true;
    physics.setJiggle(animationTuning.jiggleEnabled!==false);
    void physics.setEnabled(animationTuning.physicsEnabled===true);
}
function poseEditMessage(event: string, source?: string): void {
    const value = {event,source,key:latest?.key,animationTuning,playing:motionPlaying};
    (window as any).webkit?.messageHandlers?.animationTuning?.postMessage(value);
    window.parent.postMessage({type:"mighty-pose-edit",...value},"*");
}
let framing = "full";
let editorInset = 0;
let editorLeftInset = 0;
let latest: Appearance | undefined;
let backendToken = "";
let desktopInteraction = false;
let lastPlayerPointerNotice = 0;
const hitMask = new AlphaHitMask();
let maskFailed = false;
const poseEditor = new BonePoseEditor(scene, canvas, {
    selected: source => poseEditMessage("selected",source),
    begin: () => {
        resumeAfterPoseDrag = motionPlaying; motionPlaying = false; pointer = null;
        physics.setEditing(true);
        poseEditMessage("begin");
        // Bake only the visible correction, so editing at partial strength or in
        // bypass never snaps the pose when a drag starts.
        const amount = animationTuning.enabled ? animationTuning.strength : 0;
        const baked = Object.fromEntries(Object.entries(animationTuning.bones).map(([source,angles])=>{
            const q = Quaternion.FromEulerAngles(...angles.map(v=>v*Math.PI/180) as [number,number,number]);
            return [source,degreesFromQuaternion(Quaternion.Slerp(Quaternion.Identity(),q,amount))];
        }));
        setAnimationTuning({...animationTuning,enabled:true,strength:1,bones:baked});
        lastPoseChange = 0;
    },
    correction: source => Quaternion.FromEulerAngles(...(animationTuning.bones[source] ?? [0,0,0]).map(v=>v*Math.PI/180) as [number,number,number]),
    changed: (source,rotation,final) => {
        setAnimationTuning({...animationTuning,bones:{...animationTuning.bones,[source]:degreesFromQuaternion(rotation)}});
        const now = performance.now();
        if (final || now-lastPoseChange > 33) { poseEditMessage("change",source); lastPoseChange = now; }
    },
    ended: () => { physics.setEditing(false); motionPlaying = resumeAfterPoseDrag; poseEditMessage("end"); }
});
function syncPoseEditor(): void { poseEditor.setEnabled(poseEditing && framing === "selection" && !desktopInteraction,poseBonesVisible); }
function bindPoseEditor(): void {
    const definitions = idle.getTunableBones();
    const joints: PoseJoint[] = [];
    const activeModel = model;
    if (activeModel) {
        const mesh = activeModel.mesh;
        for (const definition of definitions) {
            const bone = activeModel.runtimeBones.find(b=>b.name===definition.name);
            if (bone) joints.push({...definition,world:()=>bone.getWorldMatrixToRef(Matrix.Identity()).multiply(mesh.computeWorldMatrix(true))});
        }
    } else if (skeleton && current) {
        const mesh = current.meshes.find(m=>m.skeleton===skeleton && m.getTotalVertices()>0);
        for (const definition of definitions) {
            const bone = skeleton.bones.find(b=>b.name===definition.name);
            if (!bone || !mesh) continue;
            const node = bone.getTransformNode();
            const rig = skeleton;
            joints.push({...definition,world:()=>{ if (node) return node.computeWorldMatrix(true).clone(); rig.computeAbsoluteMatrices(true); return bone.getAbsoluteTransform().multiply(mesh.computeWorldMatrix(true)); }});
        }
    }
    poseEditor.bind(joints); syncPoseEditor();
}
Object.defineProperty(window,"mightyAppearanceEditor",{value:()=>appearanceEditor.inspect()});
Object.defineProperty(window,"mightyAnimationTuning",{value:()=>({bones:idle.getTunableBones(),playing:motionPlaying,speed:animationSpeed,animationTuning,physics:physics.inspect(),pose:poseEditor.inspect()})});


// Optional local QA inspection; normal character views do not enable this.
if (new URLSearchParams(location.search).has("inspect")) {
    Object.defineProperty(window, "mightyCompanionInspect", {value: () => ({
        morphWeights:model?Object.fromEntries(model.morph.morphs.map((m,i)=>[m.name,model!.morph.getMorphWeightFromIndex(i)])):undefined,
        key:activeKey,playing:motionPlaying,height,idle:idle.getState(),idlePreset:idle.getIdleState(),
        bones:skeleton?.bones.map(bone => ({name:bone.name,rotation:(bone.getTransformNode()?.rotationQuaternion ?? bone.getRotationQuaternion()).asArray(),position:bone.getTransformNode()?.position.asArray() ?? bone.position.asArray()})) ?? model?.runtimeBones.map(bone => ({name:bone.name,rotation:bone.linkedBone.rotationQuaternion.asArray(),position:bone.linkedBone.position.asArray()})),
        camera:{alpha:camera.alpha,beta:camera.beta,radius:camera.radius,fov:camera.fov,target:camera.target.asArray(),screenOffset:camera.targetScreenOffset.asArray()},
        meshCount:current?.meshes.length ?? 0,
        lighting:lighting.inspect(),
        editorEnvironment:editorEnvironment.inspect(),
        pose:poseEditor.inspect(),animationTuning,physics:physics.inspect(),face:faceMotion.inspect(),
        render:{fps:engine.getFps(),frameDeltaMs:engine.getDeltaTime(),renderWidth:engine.getRenderWidth(),renderHeight:engine.getRenderHeight(),webGLVersion:engine.webGLVersion}
    })});
}

function notify(state: string, detail = ""): void {
    window.parent.postMessage({ type: "mighty-companion-state", key: latest?.key, state, detail }, "*");
    // The native editor receives readiness without polling or retaining itself.
    (window as any).webkit?.messageHandlers?.animationTuning?.postMessage({state,key:latest?.key,bones:idle.getTunableBones(),physics:physics.inspect()});
}
function showStatus(text: string, failed = false): void {
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle("failed", failed);
    const retry = document.getElementById("retry")!;
    retry.hidden = !failed;
    const rect = retry.getBoundingClientRect();
    window.parent.postMessage({type:"mighty-companion-retry-region",region:failed?{x:rect.x/innerWidth,y:rect.y/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight}:null},"*");
}
function fit(): void {
    engine.resize();
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    frameCharacter(camera,height,framing,aspect,editorInset,window.innerWidth,poseEditing,editorLeftInset);
}
function clearModel(): void {
    poseEditor.clear();
    appearanceEditor.clear();
    idle.release();
    physics.detach();
    if (model) runtime.destroyMmdModel(model);
    model = undefined;
    skeleton = undefined;
    skeletonOptions = {};
    editorEnvironment.detach();
    lighting.detach();
    current?.dispose();
    current = undefined;
    bones = [];
}
async function load(appearance: Appearance): Promise<void> {
    if (disposed || appearance.key === activeKey) return;
    latest = appearance;
    const ticket = ++request;
    activeKey = appearance.key;
    clearModel();
    showStatus("Preparing character…");
    notify("loading");
    try {
        const glb = /^local\/chars\/[a-z0-9_-]+$/.test(appearance.directory) && /\.glb$/i.test(appearance.file);
        const mmd = /^(zzz|ww)\/chars\//.test(appearance.directory) && /\.(pmx|bpmx)$/i.test(appearance.file);
        if ((!glb && !mmd) || appearance.directory.split("/").includes("..") || /[\\/]/.test(appearance.file)) throw new Error("This appearance is not supported.");
        if (!/^[A-Za-z0-9_-]{40,}$/.test(backendToken)) throw new Error("Character storage is starting.");
        const response = await fetch('/api/appearance/cache', {method:'POST', headers:{'Content-Type':'application/json','X-Mighty-Token':backendToken}, body:JSON.stringify({appearance})});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Download failed.");
        if (disposed || ticket !== request) return;
        showStatus("Opening character…");
        const url = location.origin + "/assets/" + backendToken + "/" + [...appearance.directory.split("/"), appearance.file].map(encodeURIComponent).join("/");
        const container = await LoadAssetContainerAsync(url, scene, glb ? {} : {
            pluginOptions: { mmdmodel: { materialBuilder: materials, loggingEnabled: false, buildSkeleton: true, buildMorph: true } }
        });
        if (disposed || ticket !== request) { container.dispose(); return; }
        current = container;
        const mesh = container.rootNodes[0] as MmdMesh;
        if (glb) {
            // Imported glTF characters face +Z; the companion camera looks from -Z.
            mesh.rotationQuaternion ??= Quaternion.Identity();
            mesh.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI).multiply(mesh.rotationQuaternion);
            container.animationGroups.forEach(group => group.stop());
            skeleton = container.meshes.find(item => item.skeleton && item.getTotalVertices() > 0)?.skeleton ?? undefined;
            if (!skeleton) throw new Error("The character has no usable skeleton.");
            skeletonOptions = {rightHanded:true,armClearanceDegrees:8};
        } else {
            bones = mesh.metadata.bones;
            if (mesh.metadata.skeleton) {
                try { model = runtime.createMmdModel(mesh, { buildPhysics: true, trimMetadata: false }); }
                catch (error) {
                    // A nonstandard MMD rig can still use the shared skeletal driver.
                    skeleton = mesh.skeleton ?? undefined;
                    skeletonOptions = {rightHanded:false,armClearanceDegrees:0};
                    if (!skeleton) throw error;
                    console.warn("Character runtime uses skeleton fallback:", error);
                }
            }
        }
        container.addAllToScene();
        if (model) {
            idle.apply(model, 0, bones);
            model.beforePhysics(null);
            model.afterPhysics();
            const head = model.runtimeBones.find(bone => ["頭", "Head", "head"].includes(bone.name));
            if (head) { const point = Vector3.Zero(); head.getWorldTranslationToRef(point); height = Math.max(1, point.y * 1.14); }
            else height = Math.max(1, mesh.getHierarchyBoundingVectors(true).max.y);
        } else if (skeleton) {
            idle.applySkeleton(skeleton, 0, skeletonOptions);
            container.meshes.forEach(item => item.computeWorldMatrix(true));
            height = Math.max(1, mesh.getHierarchyBoundingVectors(true).max.y);
        } else height = Math.max(1, mesh.getHierarchyBoundingVectors(true).max.y);
        lighting.attach(container, {pbrCharacter:glb,appearanceKey:appearance.key,height});
        // MMD loader bounds include a large animation/culling margin below the
        // feet; those models are authored on y=0. GLBs retain their own origin.
        editorEnvironment.attach(container, height, glb ? mesh.getHierarchyBoundingVectors(true).min.y : 0);
        appearanceEditor.bind(container,model,appearance.key);
        appearanceEditor.apply(editorSettings);
        bindFace();
        publishEditorParts();
        bindPoseEditor();
        void physics.setEnabled(animationTuning.physicsEnabled===true);
        fit();
        showStatus("");
        notify("ready");
    } catch (error) {
        if (disposed || ticket !== request) return;
        activeKey = "";
        clearModel();
        showStatus("Couldn’t open character. Try again.", true);
        notify("error");
        console.error("Companion appearance:", error);
    }
}
scene.onBeforeAnimationsObservable.add(() => {
    if (!model && !skeleton) return;
    appearanceEditor.animateFace(faceMotion.sample(performance.now(),document.hidden || !motionPlaying || appearanceEditor.isPreviewing()));
    physics.setRunning(motionPlaying && !document.hidden);
    physics.advance(document.hidden ? 0 : engine.getDeltaTime()/1000, delta => {
        if ((motionPlaying || tuningDirty) && !document.hidden) {
            const step = motionPlaying ? delta * animationSpeed : 0;
            if (model) idle.apply(model, step, bones);
            else if (skeleton) idle.applySkeleton(skeleton, step, skeletonOptions);
            tuningDirty = false;
        }
        runtime.beforePhysics(delta*1000);
    }, () => runtime.afterPhysics());
}, -1, true);
window.addEventListener("message", event => {
    if (event.source !== window.parent) return;
    const faceKind:Record<string,string>={"mighty-companion-performance":"performance","mighty-companion-playback":"playback","mighty-companion-phase":"phase"};
    if (faceKind[event.data?.type]) {faceMotion.event(faceKind[event.data.type],event.data.value,performance.now());return;}
    if (event.data?.type === "mighty-companion-control") {
        if (typeof event.data.desktopInteraction === "boolean") {
            if (event.data.desktopInteraction && !desktopInteraction) { camera.alpha = characterCameraAlpha; camera.beta = characterCameraBeta; fit(); }
            desktopInteraction = event.data.desktopInteraction;
            editorEnvironment.setEnabled((framing === "selection" || framing === "face") && !desktopInteraction);
        }
        if (typeof event.data.playing === "boolean") {
            resumeAfterPoseDrag = event.data.playing;
            poseEditor.release();
            motionPlaying = event.data.playing;
            if (!motionPlaying) { idle.setHovered(false); idle.setPointer(0, 0, false); }
        }
        if (typeof event.data.idleStyle === "string") { idle.setStyle(event.data.idleStyle); tuningDirty = true; }
        if (Object.prototype.hasOwnProperty.call(event.data, "animationTuning")) setAnimationTuning(event.data.animationTuning);
        if (Object.prototype.hasOwnProperty.call(event.data,"editorSettings")) setEditorSettings(event.data.editorSettings);
        if (Object.prototype.hasOwnProperty.call(event.data,"facePreview")) appearanceEditor.previewFace(event.data.facePreview);
        if (event.data.requestEditorParts) publishEditorParts();
        const gazePointer = event.data.pointer;
        if (gazePointer && Number.isFinite(gazePointer.x) && Number.isFinite(gazePointer.y)) {
            idle.setPointer(gazePointer.x, gazePointer.y, motionPlaying && gazePointer.valid === true);
        }
        if (typeof event.data.hovered === "boolean") idle.setHovered(motionPlaying && event.data.hovered);
        if (Number.isFinite(event.data.editorInset)) editorInset = Math.max(0, Math.min(600, event.data.editorInset));
        if (Number.isFinite(event.data.editorLeftInset)) editorLeftInset = Math.max(0,Math.min(300,event.data.editorLeftInset));
        if (["full", "portrait", "player", "selection", "face"].includes(event.data.framing)) {
            framing = event.data.framing;
            editorEnvironment.setEnabled((framing === "selection" || framing === "face") && !desktopInteraction);
            fit();
        }
        if (event.data.poseEditor && typeof event.data.poseEditor === "object") {
            const editor = event.data.poseEditor;
            if (typeof editor.enabled === "boolean" && poseEditing !== editor.enabled) { poseEditing = editor.enabled; fit(); }
            if (typeof editor.showBones === "boolean") poseBonesVisible = editor.showBones;
            syncPoseEditor();
            poseEditor.setOptions({snap:editor.snap===true,showFingers:editor.showFingers===true});
            if (typeof editor.selected === "string") poseEditor.select(editor.selected);
        } else syncPoseEditor();
        if (event.data.physicsRetry) void physics.setEnabled(true,true);
        if (event.data.focusJoint) {
            const point = poseEditor.selectedPosition();
            if (point) {
                camera.target.copyFrom(point); camera.radius = height*.55;
                const projection = camera.getProjectionMatrix(); projection.addAtIndex(9,-projection.m[9]);
            }
        }
        if (event.data.reset) { resetCamera(); }
        return;
    }
    if (event.data?.type !== "mighty-companion-load") return;
    const nextId=typeof event.data.characterId==="string"?event.data.characterId:"editor";
    if(nextId!==faceCharacterId){faceCharacterId=nextId;bindFace();}
    if (typeof event.data.token === "string") backendToken = event.data.token;
    // Set the saved pose before binding the rig, including repeated loads of
    // the same appearance when switching between character profiles.
    idle.setStyle(typeof event.data.idleStyle === "string" ? event.data.idleStyle : "female");
    setAnimationTuning(event.data.animationTuning);
    setEditorSettings(event.data.editorSettings);
    const value = event.data.appearance;
    if (value && [value.key, value.name, value.directory, value.file].every(item => typeof item === "string")) {
        void load(value);
    }
});
document.getElementById("retry")!.addEventListener("click", () => { if (latest) void load(latest); });
const resize = new ResizeObserver(fit);
resize.observe(document.documentElement);
window.addEventListener("pagehide", event => {
    // WebKit can retain this document in its page cache. Destroying its scene
    // here would restore an intact DOM containing a permanently empty canvas.
    if (event.persisted) return;
    disposed = true;
    request++;
    resize.disconnect();
    clearModel();
    poseEditor.dispose();
    runtime.dispose(scene);
    physics.dispose();
    lighting.dispose();
    editorEnvironment.dispose();
    scene.dispose();
    engine.dispose();
});
window.addEventListener("pageshow", event => { if(event.persisted&&!disposed)fit(); });
engine.runRenderLoop(() => {
    scene.render();
    if (desktopInteraction && !maskFailed) {
        try { hitMask.sample(canvas, performance.now()); }
        catch (error) { maskFailed = true; console.error("Companion hit mask:", error); notify("interaction-error"); }
    }
});
notify("booted");

// Direct manipulation stays inside the renderer; desktop positioning belongs to the host.
let pointer: {x:number;y:number;startX:number;startY:number;pan:boolean} | null = null;
canvas.style.touchAction = "none";
canvas.addEventListener("pointerleave", () => {
    idle.setHovered(false);
   
    if (!desktopInteraction) idle.setPointer(0, 0, false);
});
window.addEventListener("blur", () => { idle.setPointer(0, 0, false); poseEditor.release(); pointer=null; });
document.addEventListener("visibilitychange", () => { if (document.hidden) { idle.setPointer(0, 0, false); } });
canvas.addEventListener("pointermove", event => {
    // A canvas iframe can retain the parent's hover target when the pointer
    // crosses processes. Relay real canvas movement to release hover-only UI.
    if (desktopInteraction && framing === "player" && performance.now() - lastPlayerPointerNotice > 150) {
        lastPlayerPointerNotice = performance.now();
        window.parent.postMessage({type:"mighty-companion-canvas-pointer"},"*");
    }
    const rect = canvas.getBoundingClientRect();
    if (desktopInteraction || pointer || !motionPlaying) return;
    idle.setPointer((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1,
        1 - (event.clientY - rect.top) / Math.max(1, rect.height) * 2, event.buttons === 0);
});
canvas.addEventListener("pointerdown", event => { if(desktopInteraction || ![0,1,2].includes(event.button) || (event.button===0 && poseEditor.ownsPointer(event))) return; idle.setPointer(0, 0, false); pointer = {x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,pan:event.shiftKey||event.altKey||event.button!==0}; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", event => {
    if (desktopInteraction || !pointer || poseEditor.isDragging()) return;
    const dx = event.clientX-pointer.x, dy = event.clientY-pointer.y;
    if(pointer.pan) {
        const units=2*camera.radius*Math.tan(camera.fov/2)/Math.max(1,canvas.clientHeight);
        const inverse=camera.getViewMatrix().clone().invert();
        camera.target.addInPlace(Vector3.TransformNormal(new Vector3(-dx*units,dy*units,0),inverse));
    }
    else { camera.alpha -= dx*0.008; camera.beta = Math.max(0.25,Math.min(Math.PI-0.25,camera.beta-dy*0.006)); }
    pointer.x = event.clientX; pointer.y = event.clientY;
});
canvas.addEventListener("pointerup", event => { if(pointer && !pointer.pan && Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)<4) window.parent.postMessage({type:"mighty-companion-menu"},"*"); pointer=null; });
canvas.addEventListener("pointercancel",()=>pointer=null);
canvas.addEventListener("wheel",event=>{
    if(desktopInteraction || poseEditor.isDragging())return;
    event.preventDefault();
    camera.radius=Math.max(height*0.3,Math.min(height*5,camera.radius*Math.exp(event.deltaY*0.001)));
},{passive:false});
function resetCamera(): void {
    camera.alpha = characterCameraAlpha;
    camera.beta = characterCameraBeta;
    fit();
}
canvas.addEventListener("dblclick",event=>{if(desktopInteraction || poseEditor.ownsPointer(event))return;resetCamera();});

window.addEventListener("keydown",event=>{
    if (event.code === "Space" && poseEditing && !event.repeat) { event.preventDefault(); resumeAfterPoseDrag = !motionPlaying; poseEditor.release(); motionPlaying = resumeAfterPoseDrag; poseEditMessage("playback"); }
    if(event.key === "Escape")window.parent.postMessage({type:"mighty-companion-escape"},"*");});

canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
    if (!desktopInteraction) return;
    window.parent.postMessage({type:"mighty-companion-menu",x:event.clientX / canvas.clientWidth,y:event.clientY / canvas.clientHeight}, "*");
});
