import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { RotationGizmo } from "@babylonjs/core/Gizmos/rotationGizmo";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateLineSystem } from "@babylonjs/core/Meshes/Builders/linesBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { correctionAfterWorldDrag } from "./PoseEditorMath";

export interface PoseJoint {
    source: string;
    name: string;
    /** Scene-space matrix, including the character root's scale/reflection. */
    world: () => Matrix;
}
export interface PoseEditorCallbacks {
    selected: (source: string) => void;
    begin: () => void;
    correction: (source: string) => Quaternion;
    changed: (source: string, rotation: Quaternion, final: boolean) => void;
    ended: () => void;
}
const parentSources: Record<string, string> = {
    Spine:"Hips", Spine1:"Spine", Spine2:"Spine1", Neck:"Spine2", Head:"Neck",
    LeftShoulder:"Spine2", RightShoulder:"Spine2", LeftArm:"LeftShoulder", RightArm:"RightShoulder",
    LeftForeArm:"LeftArm", RightForeArm:"RightArm", LeftHand:"LeftForeArm", RightHand:"RightForeArm",
    LeftUpLeg:"Hips", RightUpLeg:"Hips", LeftLeg:"LeftUpLeg", RightLeg:"RightUpLeg",
    LeftFoot:"LeftLeg", RightFoot:"RightLeg", LeftToeBase:"LeftFoot", RightToeBase:"RightFoot"
};
for (const side of ["Left","Right"]) for (const finger of ["Thumb","Index","Middle","Ring","Pinky"]) {
    for (let i=1; i<=3; i++) parentSources[`${side}Hand${finger}${i}`] = i === 1 ? `${side}Hand` : `${side}Hand${finger}${i-1}`;
}

/** Foreground skeleton picking and real 3D rotation rings, active only in Pose mode. */
export class BonePoseEditor {
    private readonly layer: UtilityLayerRenderer;
    private readonly gizmo: RotationGizmo;
    private readonly proxy: TransformNode;
    private readonly green: StandardMaterial;
    private readonly gold: StandardMaterial;
    private readonly hoverMaterial: StandardMaterial;
    private hovered = "";
    private showFingers = false;
    private snap = false;
    private readonly beforeRender: Observer<Scene> | null;
    private readonly dots = new Map<string, Mesh>();
    private joints = new Map<string, PoseJoint>();
    private edges: [string,string][] = [];
    private lines?: LinesMesh;
    private active = false;
    private bonesVisible = true;
    private source = "Spine2";
    private dragging = false;
    private startWorld = Matrix.Identity();
    private startProxy = Quaternion.Identity();
    private startCorrection = Quaternion.Identity();
    private lastCorrection = Quaternion.Identity();
    private readonly label: HTMLDivElement | undefined;

    public constructor(private readonly scene: Scene, private readonly canvas: HTMLCanvasElement, private readonly callbacks: PoseEditorCallbacks) {
        this.layer = new UtilityLayerRenderer(scene, true);
        this.layer.utilityLayerScene.autoClearDepthAndStencil = true;
        this.layer.utilityLayerScene.autoClear = false;
        this.layer.shouldRender = false;
        this.layer.pickingEnabled = false;
        this.proxy = new TransformNode("pose rotation target", this.layer.utilityLayerScene);
        this.proxy.rotationQuaternion = Quaternion.Identity();
        this.green = new StandardMaterial("pose joints green", this.layer.utilityLayerScene);
        this.green.disableLighting = true; this.green.emissiveColor = Color3.FromHexString("#25f4a7");
        this.gold = new StandardMaterial("pose selected joint", this.layer.utilityLayerScene);
        this.gold.disableLighting = true; this.gold.emissiveColor = Color3.FromHexString("#ffd857");
        this.hoverMaterial = new StandardMaterial("pose hovered joint", this.layer.utilityLayerScene);
        this.hoverMaterial.disableLighting = true; this.hoverMaterial.emissiveColor = Color3.FromHexString("#b4ffdf");
        this.gizmo = new RotationGizmo(this.layer, 64, false, 1.5, undefined, {
            xOptions:{color:Color3.FromHexString("#ff4b5c")},
            yOptions:{color:Color3.FromHexString("#32ed9d")},
            zOptions:{color:Color3.FromHexString("#548cff")}
        });
        this.gizmo.scaleRatio = 0.7;
        this.gizmo.onDragStartObservable.add(() => this.begin());
        this.gizmo.onDragObservable.add(() => this.drag());
        this.gizmo.onDragEndObservable.add(() => this.end());
        this.layer.utilityLayerScene.onPointerObservable.add(info => {
            if (!this.active || this.dragging) return;
            const source = info.pickInfo?.pickedMesh?.metadata?.poseSource;
            if (info.type === PointerEventTypes.POINTERMOVE) {
                const hover = typeof source === "string" ? source : "";
                if (hover !== this.hovered) { this.hovered = hover; this.updateColours(); this.updateHint(); }
                this.canvas.style.cursor = hover ? "pointer" : this.gizmo.isHovered ? "grab" : "";
            }
            if (info.type === PointerEventTypes.POINTERDOWN && info.event.button === 0 && typeof source === "string") this.select(source, true);
        });
        this.beforeRender = scene.onBeforeRenderObservable.add(() => this.update());
        // NullEngine rig tests do not need DOM chrome.
        if (typeof document !== "undefined") {
            this.label = document.createElement("div");
            this.label.id = "pose-editor-hint"; this.label.hidden = true;
            this.label.style.cssText = "position:absolute;left:24px;bottom:26px;max-width:55%;padding:11px 16px;border-radius:12px;background:rgba(26,32,38,.88);color:#eafaf4;font:12px -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;line-height:1.6;backdrop-filter:blur(12px)";
            this.label.setAttribute("role","status"); document.body.append(this.label);
        }
    }
    public bind(joints: PoseJoint[]): void {
        this.clear(); this.joints = new Map(joints.filter(j=>Object.prototype.hasOwnProperty.call(parentSources,j.source) || j.source === "Hips").map(j=>[j.source,j]));
        for (const joint of this.joints.values()) {
            const dot = CreateSphere(`pose joint ${joint.source}`, {diameter:1,segments:8}, this.layer.utilityLayerScene);
            dot.material = this.green; dot.metadata = {poseSource:joint.source};
            dot.isPickable = true; dot.renderingGroupId = 1; dot.alwaysSelectAsActiveMesh = true;
            this.dots.set(joint.source,dot);
            let parent = parentSources[joint.source];
            while (parent && !this.joints.has(parent)) parent = parentSources[parent];
            if (parent) this.edges.push([parent,joint.source]);
        }
        if (this.edges.length) {
            this.lines = CreateLineSystem("pose bone connections", {lines:this.edges.map(()=>[Vector3.Zero(),Vector3.Zero()]),updatable:true},this.layer.utilityLayerScene);
            this.lines.color = Color3.FromHexString("#25f4a7"); this.lines.alpha = 0.65; this.lines.isPickable = false;
            this.lines.alwaysSelectAsActiveMesh = true;
        }
        const requested = this.source;
        if (!this.joints.has(this.source)) this.source = this.joints.has("Spine2") ? "Spine2" : this.joints.keys().next().value ?? "";
        this.select(this.source,requested !== this.source); this.update();
    }
    public setEnabled(enabled: boolean, showBones = true): void {
        if (!enabled) this.release();
        this.active = enabled; this.bonesVisible = showBones;
        this.layer.shouldRender = enabled; this.layer.pickingEnabled = enabled;
        if (this.label) this.label.hidden = !enabled;
        this.select(this.source); this.update();
    }
    public select(source: string, notify = false): void {
        if (this.dragging) return;
        if (!this.joints.has(source)) {
            if (Object.prototype.hasOwnProperty.call(parentSources,source) || source === "Hips") this.source = source;
            return;
        }
        this.source = source;
        this.updateColours(); this.updateHint();
        this.gizmo.attachedNode = this.active ? this.proxy : null;
        if (notify) this.callbacks.selected(source);
    }
    public setOptions(options:{snap?:boolean;showFingers?:boolean}): void {
        this.snap = options.snap === true; this.showFingers = options.showFingers === true;
        this.gizmo.snapDistance = this.snap ? 5*Math.PI/180 : 0;
        this.updateHint(); this.update();
    }
    public selectedPosition(): Vector3 | undefined { return this.joints.get(this.source)?.world().getTranslation(); }
    private updateColours(): void {
        for (const [source,dot] of this.dots) dot.material = source === this.source ? this.gold : source === this.hovered ? this.hoverMaterial : this.green;
    }
    private updateHint(): void {
        if (!this.label) return;
        const pretty = (source:string):string => ({Hips:"Pelvis",Spine:"Lower spine",Spine1:"Middle spine",Spine2:"Chest"} as Record<string,string>)[source] ?? source.replace(/([a-z])([A-Z])/g,"$1 $2");
        this.label.textContent = this.dragging ? `${pretty(this.source)} · Rotating${this.snap ? " in 5° steps" : ""}` : this.hovered && this.hovered !== this.source ? `Select ${pretty(this.hovered)} · Click to show rotation rings` : `${pretty(this.source)} · Drag a ring to rotate${this.snap ? " · Snap 5°" : ""} · Space to play / pause`;
    }
    public ownsPointer(event: PointerEvent | MouseEvent): boolean {
        if (!this.active) return false;
        if (this.dragging) return true;
        const rect = this.canvas.getBoundingClientRect();
        const picked = this.layer.utilityLayerScene.pick(event.clientX-rect.left,event.clientY-rect.top);
        return picked?.hit === true;
    }
    public isDragging(): boolean { return this.dragging; }
    private begin(): void {
        const joint = this.joints.get(this.source);
        if (!this.active || !joint || this.dragging) { this.gizmo.releaseDrag(); return; }
        this.dragging = true;
        this.startWorld.copyFrom(joint.world());
        this.startProxy.copyFrom(this.proxy.rotationQuaternion!);
        this.callbacks.begin();
        this.startCorrection.copyFrom(this.callbacks.correction(this.source));
        this.lastCorrection.copyFrom(this.startCorrection);
        this.canvas.style.cursor = "grabbing"; this.updateHint();
    }
    private drag(): void {
        if (!this.dragging) return;
        this.lastCorrection.copyFrom(correctionAfterWorldDrag(this.startWorld,this.startProxy,this.proxy.rotationQuaternion!,this.startCorrection));
        this.callbacks.changed(this.source,this.lastCorrection,false);
    }
    private end(): void {
        if (!this.dragging) return;
        this.drag();
        this.dragging = false;
        this.callbacks.changed(this.source,this.lastCorrection,true);
        this.callbacks.ended(); this.canvas.style.cursor = ""; this.updateHint();
    }
    public release(): void { this.gizmo.releaseDrag(); this.end(); }
    private update(): void {
        if (!this.active) return;
        const positions = new Map<string,Vector3>();
        const camera = this.scene.activeCamera;
        if (!camera) return;
        for (const [source,joint] of this.joints) {
            const world = joint.world(), position = world.getTranslation(); positions.set(source,position);
            const dot = this.dots.get(source)!;
            dot.position.copyFrom(position);
            const pixels = source === this.source ? 12 : /Hand.+\d$/.test(source) ? 6 : 9;
            const worldPerPixel = 2 * Vector3.Distance(camera.globalPosition,position) * Math.tan(camera.fov/2) / Math.max(1,this.canvas.clientHeight);
            dot.scaling.setAll(worldPerPixel*pixels);
            dot.setEnabled(source === this.source || (this.bonesVisible && (this.showFingers || !/Hand.+\d$/.test(source))));
            if (source === this.source && !this.dragging) {
                world.decompose(undefined,this.proxy.rotationQuaternion!,this.proxy.position);
                this.proxy.rotationQuaternion!.normalize(); this.proxy.computeWorldMatrix(true);
            }
        }
        if (this.lines) {
            this.lines.setEnabled(this.bonesVisible);
            const visible = (source:string):boolean => source === this.source || this.showFingers || !/Hand.+\d$/.test(source);
            CreateLineSystem("pose bone connections",{lines:this.edges.map(([a,b])=>visible(a)&&visible(b)?[positions.get(a)!,positions.get(b)!]:[Vector3.Zero(),Vector3.Zero()]),instance:this.lines},this.layer.utilityLayerScene);
        }
        const target = this.joints.size && this.active ? this.proxy : null;
        if (this.gizmo.attachedNode !== target) this.gizmo.attachedNode = target;
    }
    public inspect(): Record<string, unknown> {
        const view = this.scene.getTransformMatrix(), engine = this.scene.getEngine();
        const viewport = this.scene.activeCamera?.viewport.toGlobal(this.canvas.clientWidth,this.canvas.clientHeight);
        return {enabled:this.active,selected:this.source,dragging:this.dragging,snap:this.snap,showFingers:this.showFingers,joints:[...this.joints.values()].map(joint=>{
            const world = joint.world().getTranslation();
            const screen = viewport ? Vector3.Project(world,Matrix.Identity(),view,viewport) : Vector3.Zero();
            return {source:joint.source,name:joint.name,world:world.asArray(),screen:screen.asArray()};
        }),renderWidth:engine.getRenderWidth()};
    }
    public clear(): void {
        this.release(); this.gizmo.attachedNode = null;
        for (const dot of this.dots.values()) dot.dispose();
        this.dots.clear(); this.joints.clear(); this.edges = []; this.lines?.dispose(); this.lines = undefined;
    }
    public dispose(): void {
        this.clear(); this.scene.onBeforeRenderObservable.remove(this.beforeRender);
        this.gizmo.dispose(); this.proxy.dispose(); this.green.dispose(); this.gold.dispose(); this.hoverMaterial.dispose(); this.layer.dispose(); this.label?.remove();
    }
}
