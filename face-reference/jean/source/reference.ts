import { AlphaHitMask } from "<workspace>/Mighty Chat/Renderer/AlphaHitMask";
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
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
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
import { IdleMotion } from "<workspace>/model-viewer-clean/src/scene/idleMotion";
import type { SkeletonIdleOptions } from "<workspace>/model-viewer-clean/src/scene/idleMotion";
import { afterBuildSingleMaterialDefault } from "<workspace>/model-viewer-clean/src/sceneBuilder.materials";
import { FaceRigAdapter } from "<workspace>/Mighty Chat/Renderer/face/FaceRigAdapter";
import { FaceMixer } from "<workspace>/Mighty Chat/Renderer/face/FaceMixer";
import type { PlaybackSnapshot, SpeechPerformance } from "<workspace>/Mighty Chat/Renderer/face/LipSyncController";
import { CharacterLighting } from "<workspace>/Mighty Chat/Renderer/CharacterLighting";
import { EditorEnvironment } from "<workspace>/Mighty Chat/Renderer/EditorEnvironment";

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
const camera = new ArcRotateCamera("portrait", -Math.PI / 2, Math.PI / 2, 24, new Vector3(0, 12, 0), scene);
camera.minZ = 0.1;
camera.maxZ = 1000;
const lighting = new CharacterLighting(scene);
const editorEnvironment = new EditorEnvironment(scene);
const materials = new MmdStandardMaterialBuilder();
materials.afterBuildSingleMaterial = afterBuildSingleMaterialDefault;
const runtime = new MmdRuntime(scene);
runtime.register(scene);
const idle = new IdleMotion();
let current: AssetContainer | undefined;
let model: MmdModel | undefined;
let skeleton: Skeleton | undefined;
let skeletonOptions: SkeletonIdleOptions = {};
let bones: readonly MmdModelMetadata.Bone[] = [];
let request = 0;
let activeKey = "";
let height = 18;
let disposed = false;
let motionPlaying = true;
let framing = "full";
let editorInset = 0;
let latest: Appearance | undefined;
let face: FaceMixer | undefined;
let backendToken = "";
let desktopInteraction = false;
let lastPlayerPointerNotice = 0;
const hitMask = new AlphaHitMask();
let maskFailed = false;

// Optional local QA inspection; normal character views do not enable this.
if (new URLSearchParams(location.search).has("inspect")) {
    Object.defineProperty(window, "mightyCompanionInspect", {value: () => ({
        key:activeKey,playing:motionPlaying,height,idle:idle.getState(),idlePreset:idle.getIdleState(),
        bones:skeleton?.bones.map(bone => ({name:bone.name,rotation:(bone.getTransformNode()?.rotationQuaternion ?? bone.getRotationQuaternion()).asArray(),position:bone.getTransformNode()?.position.asArray() ?? bone.position.asArray()})) ?? model?.runtimeBones.map(bone => ({name:bone.name,rotation:bone.linkedBone.rotationQuaternion.asArray(),position:bone.linkedBone.position.asArray()})),
        camera:{alpha:camera.alpha,beta:camera.beta,radius:camera.radius,target:camera.target.asArray()},
        meshCount:current?.meshes.length ?? 0,
        lighting:lighting.inspect(),
        editorEnvironment:editorEnvironment.inspect(),
        render:{fps:engine.getFps(),frameDeltaMs:engine.getDeltaTime(),renderWidth:engine.getRenderWidth(),renderHeight:engine.getRenderHeight(),webGLVersion:engine.webGLVersion}
    })});
}

function notify(state: string, detail = ""): void {
    window.parent.postMessage({ type: "mighty-companion-state", key: latest?.key, state, detail }, "*");
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
    // Selection frames the head through the hips, leaving room for the picker.
    const selectionAspect = aspect * (1 - Math.min(editorInset / Math.max(1, window.innerWidth), 0.55));
    const visibleHeight = framing === "selection" ? Math.max(height * 0.66, height * 0.50 / Math.max(0.1, selectionAspect)) : framing === "player" ? Math.max(height * 0.36, height * 0.27 / Math.max(0.1, aspect)) : framing === "portrait" ? Math.max(height * 0.52, height * 0.38 / Math.max(0.1, aspect)) : Math.max(height * 1.22, height * 0.72 / Math.max(0.1, aspect));
    camera.target.set(0, height * (framing === "player" ? 0.82 : framing === "portrait" ? 0.79 : framing === "selection" ? 0.72 : 0.5), 0);
    camera.radius = visibleHeight / (2 * Math.tan(camera.fov / 2));
    camera.targetScreenOffset.x = framing === "selection" ? -visibleHeight * aspect * Math.min(editorInset / Math.max(1, window.innerWidth), 0.55) / 2 : 0;
}
function clearModel(): void {
    face?.clear();
    face = undefined;
    idle.release();
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
        const mmd = /^(gi|hsr|zzz|ww|hna|nte)\/chars\//.test(appearance.directory) && /\.(pmx|bpmx)$/i.test(appearance.file);
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
                try { model = runtime.createMmdModel(mesh, { buildPhysics: false }); }
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
            const rig = new FaceRigAdapter(model);
            face = new FaceMixer(rig);
            window.parent.postMessage({ type: "mighty-companion-face", key: appearance.key, capabilities: rig.capabilities }, "*");
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
            window.parent.postMessage({type:"mighty-companion-face",key:appearance.key,capabilities:{speech:false,expression:false}},"*");
        } else height = Math.max(1, mesh.getHierarchyBoundingVectors(true).max.y);
        lighting.attach(container, {pbrCharacter:glb,appearanceKey:appearance.key,height});
        // MMD loader bounds include a large animation/culling margin below the
        // feet; those models are authored on y=0. GLBs retain their own origin.
        editorEnvironment.attach(container, height, glb ? mesh.getHierarchyBoundingVectors(true).min.y : 0);
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
    const delta = Math.min(0.1, engine.getDeltaTime() / 1000);
    if (motionPlaying && !document.hidden) {
        if (model) idle.apply(model, delta, bones);
        else if (skeleton) idle.applySkeleton(skeleton, delta, skeletonOptions);
    }
    // Reference capture owns all morph weights; automatic face animation is disabled here.
}, -1, true);
window.addEventListener("message", event => {
    if (event.source !== window.parent) return;
    if (event.data?.type === "mighty-companion-control") {
        if (typeof event.data.desktopInteraction === "boolean") {
            if (event.data.desktopInteraction && !desktopInteraction) { camera.alpha = -Math.PI / 2; camera.beta = Math.PI / 2; fit(); }
            desktopInteraction = event.data.desktopInteraction;
            editorEnvironment.setEnabled(framing === "selection" && !desktopInteraction);
        }
        if (typeof event.data.playing === "boolean") {
            motionPlaying = event.data.playing;
            if (!motionPlaying) { idle.setHovered(false); idle.setPointer(0, 0, false); }
        }
        if (typeof event.data.idleStyle === "string") idle.setStyle(event.data.idleStyle);
        const gazePointer = event.data.pointer;
        if (gazePointer && Number.isFinite(gazePointer.x) && Number.isFinite(gazePointer.y)) {
            idle.setPointer(gazePointer.x, gazePointer.y, motionPlaying && gazePointer.valid === true);
        }
        if (typeof event.data.hovered === "boolean") idle.setHovered(motionPlaying && event.data.hovered);
        if (Number.isFinite(event.data.editorInset)) editorInset = Math.max(0, Math.min(600, event.data.editorInset));
        if (["full", "portrait", "player", "selection"].includes(event.data.framing)) {
            framing = event.data.framing;
            editorEnvironment.setEnabled(framing === "selection" && !desktopInteraction);
            fit();
        }
        if (event.data.reset) { resetCamera(); }
        return;
    }
    if (event.data?.type === "mighty-companion-performance") {
        const value = event.data.performance as SpeechPerformance;
        if (value?.version === 1 && typeof value.utteranceId === "string" && value.appearanceKey === latest?.key && Array.isArray(value.mouthCues)) face?.setPerformance(value);
        return;
    }
    if (event.data?.type === "mighty-companion-playback") {
        const value = event.data.snapshot as PlaybackSnapshot;
        if (value && typeof value.utteranceId === "string" && Number.isFinite(value.positionSeconds)) face?.setSnapshot(value);
        return;
    }
    if (event.data?.type === "mighty-companion-face-reset") { face?.clear(); return; }
    if (event.data?.type !== "mighty-companion-load") return;
    if(typeof event.data.token === "string") backendToken = event.data.token;
    // Set the saved pose before binding the rig, including repeated loads of
    // the same appearance when switching between character profiles.
    idle.setStyle(typeof event.data.idleStyle === "string" ? event.data.idleStyle : "female");
    const value = event.data.appearance;
    if (value && [value.key, value.name, value.directory, value.file].every(item => typeof item === "string")) void load(value);
});
document.getElementById("retry")!.addEventListener("click", () => { if (latest) void load(latest); });
const resize = new ResizeObserver(fit);
resize.observe(document.documentElement);
window.addEventListener("pagehide", () => {
    disposed = true;
    request++;
    resize.disconnect();
    clearModel();
    runtime.dispose(scene);
    lighting.dispose();
    editorEnvironment.dispose();
    scene.dispose();
    engine.dispose();
}, { once: true });
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
window.addEventListener("blur", () => idle.setPointer(0, 0, false));
document.addEventListener("visibilitychange", () => { if (document.hidden) idle.setPointer(0, 0, false); });
canvas.addEventListener("pointermove", event => {
    // A canvas iframe can retain the parent's hover target when the pointer
    // crosses processes. Relay real canvas movement to release hover-only UI.
    if (desktopInteraction && framing === "player" && performance.now() - lastPlayerPointerNotice > 150) {
        lastPlayerPointerNotice = performance.now();
        window.parent.postMessage({type:"mighty-companion-canvas-pointer"},"*");
    }
    if (desktopInteraction || pointer || !motionPlaying) return;
    const rect = canvas.getBoundingClientRect();
    idle.setPointer((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1,
        1 - (event.clientY - rect.top) / Math.max(1, rect.height) * 2, event.buttons === 0);
});
canvas.addEventListener("pointerdown", event => { if(desktopInteraction || event.button !== 0) return; idle.setPointer(0, 0, false); pointer = {x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,pan:event.shiftKey}; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", event => {
    if (desktopInteraction || !pointer) return;
    const dx = event.clientX-pointer.x, dy = event.clientY-pointer.y;
    if(pointer.pan) { camera.target.x -= dx*height/Math.max(1,canvas.clientHeight); camera.target.y += dy*height/Math.max(1,canvas.clientHeight); }
    else { camera.alpha -= dx*0.008; camera.beta = Math.max(0.25,Math.min(Math.PI-0.25,camera.beta-dy*0.006)); }
    pointer.x = event.clientX; pointer.y = event.clientY;
});
canvas.addEventListener("pointerup", event => { if(pointer && Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)<4) window.parent.postMessage({type:"mighty-companion-menu"},"*"); pointer=null; });
canvas.addEventListener("pointercancel",()=>pointer=null);
canvas.addEventListener("wheel",event=>{if(desktopInteraction)return;event.preventDefault();camera.radius=Math.max(height*0.3,Math.min(height*5,camera.radius*Math.exp(event.deltaY*0.001)));},{passive:false});
function resetCamera(): void {
    const editor = framing === "selection" && !desktopInteraction;
    camera.alpha = editor ? -Math.PI / 2 + 0.24 : -Math.PI / 2;
    camera.beta = editor ? 1.27 : Math.PI / 2;
    fit();
}
canvas.addEventListener("dblclick",()=>{if(desktopInteraction)return;resetCamera();});

window.addEventListener("keydown",event=>{if(event.key === "Escape")window.parent.postMessage({type:"mighty-companion-escape"},"*");});

canvas.addEventListener("contextmenu", event => {
    if (!desktopInteraction) return;
    event.preventDefault();
    window.parent.postMessage({type:"mighty-companion-menu",x:event.clientX / canvas.clientWidth,y:event.clientY / canvas.clientHeight}, "*");
});

Object.defineProperty(window, "faceReference", {value: {
 list: () => model?.morph.morphs.map((m, index) => ({index, name:m.name})),
 pose: (index: number, weight: number, angle = 0) => {
  if (!model) throw new Error("No MMD model");
  motionPlaying = false;
  for (let i=0;i<model.morph.morphs.length;i++) model.morph.setMorphWeightFromIndex(i, i===index?weight:0);
  camera.alpha = -Math.PI/2 + angle; camera.beta = Math.PI/2;
  const head = model.runtimeBones.find(b => ["頭","Head","head"].includes(b.name));
  const p=Vector3.Zero(); if(head)head.getWorldTranslationToRef(p);
  camera.target.set(p.x,p.y+0.22,p.z);camera.radius=3.9;camera.targetScreenOffset.x=0;
  return {head:p.asArray(),camera:camera.target.asArray(),index,weight};
 }
}});
