import type { Bone } from "@babylonjs/core/Bones/bone";
import type { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { MmdModelMetadata } from "babylon-mmd/esm/Loader/mmdModelMetadata";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdWasmModel } from "babylon-mmd/esm/Runtime/Optimized/mmdWasmModel";

import maleIdle from "../../res/animations/browser-idle-male.json";
import femaleIdle from "../../res/animations/browser-idle-female.json";
import femaleIdle2 from "../../res/animations/browser-idle-dwarf2.json";
import { IDLE_STYLES, IdleAttention, SelectedIdleLoop } from "./idleBehavior";
import type { IdleBehaviorState, IdleStyle } from "./idleBehavior";
import { IdleSequence } from "./idleSequence";
import type { IdlePhase, IdleSequenceOptions, IdleSequenceState } from "./idleSequence";

export interface IdleClip {
    readonly name: string;
    readonly fps: number;
    readonly frameCount: number;
    readonly tracks: Readonly<Record<string, readonly number[][]>>;
    readonly restDirections: Readonly<Record<string, readonly number[]>>;
    readonly restPositions?: Readonly<Record<string, readonly number[]>>;
    readonly positions?: Readonly<Record<string, readonly number[][]>>;
}
export interface IdleMotionOptions extends IdleSequenceOptions {
    readonly attention?: boolean;
    readonly clips?: readonly IdleClip[];
    readonly reactionClip?: IdleClip;
}
export interface SkeletonIdleOptions {
    readonly rightHanded?: boolean;
    readonly armClearanceDegrees?: number;
    readonly groundContact?: boolean;
}

const aliases: Record<string, string[]> = {
    Hips: ["下半身", "LowerBody", "腰", "センター", "Center", "Bip001", "Pelvis"],
    Spine: ["上半身", "UpperBody", "upper_body", "Spine", "Bip001-Spine1"],
    Spine1: ["上半身2", "上半身２", "UpperBody2", "Chest", "Bip001-Spine2"],
    Spine2: ["上半身3", "上半身３", "UpperBody3", "UpperChest", "Bip001-Spine3"],
    Neck: ["首", "Neck", "Bip001-Neck"], Head: ["頭", "Head", "Bip001-Head"],
    LeftShoulder: ["左肩", "LeftShoulder", "left_shoulder", "Bip001-L-Clavicle"],
    LeftArm: ["左腕", "LeftArm", "left_arm", "Bip001-L-UpperArm"],
    LeftForeArm: ["左ひじ", "LeftElbow", "LeftForeArm", "left_forearm", "Bip001-L-Forearm"],
    LeftHand: ["左手首", "左手", "LeftWrist", "LeftHand", "left_hand", "Bip001-L-Hand"],
    RightShoulder: ["右肩", "RightShoulder", "right_shoulder", "Bip001-R-Clavicle"],
    RightArm: ["右腕", "RightArm", "right_arm", "Bip001-R-UpperArm"],
    RightForeArm: ["右ひじ", "RightElbow", "RightForeArm", "right_forearm", "Bip001-R-Forearm"],
    RightHand: ["右手首", "右手", "RightWrist", "RightHand", "right_hand", "Bip001-R-Hand"],
    LeftUpLeg: ["左足", "LeftLeg", "left_leg", "Bip001-L-Thigh"],
    LeftLeg: ["左ひざ", "LeftKnee", "left_knee", "Bip001-L-Calf"],
    LeftFoot: ["左足首", "LeftAnkle", "LeftFoot", "left_foot", "Bip001-L-Foot"],
    LeftToeBase: ["左つま先", "LeftToeBase", "left_toe", "Bip001-L-Toe0"],
    RightUpLeg: ["右足", "RightLeg", "right_leg", "Bip001-R-Thigh"],
    RightLeg: ["右ひざ", "RightKnee", "right_knee", "Bip001-R-Calf"],
    RightFoot: ["右足首", "RightAnkle", "RightFoot", "right_foot", "Bip001-R-Foot"],
    RightToeBase: ["右つま先", "RightToeBase", "right_toe", "Bip001-R-Toe0"]
};
const sourceChildren: Record<string, string> = { Hips: "Spine", Spine: "Spine1", Spine1: "Spine2", Spine2: "Neck", Neck: "Head" };
for (const [side, prefix, letter] of [["Left", "左", "L"], ["Right", "右", "R"]]) {
    for (const [parent, child] of [["Shoulder", "Arm"], ["Arm", "ForeArm"], ["ForeArm", "Hand"], ["Hand", "HandMiddle1"], ["UpLeg", "Leg"], ["Leg", "Foot"], ["Foot", "ToeBase"]]) sourceChildren[side + parent] = side + child;
    [["Thumb", "親指"], ["Index", "人指"], ["Middle", "中指"], ["Ring", "薬指"], ["Pinky", "小指"]].forEach(([finger, name], fingerIndex) => {
        for (let joint = 1; joint <= 3; joint++) {
            const digit = finger === "Thumb" ? joint - 1 : joint;
            const source = `${side}Hand${finger}${joint}`;
            const bipSuffix = `${fingerIndex}${joint === 1 ? "" : joint - 1}`;
            aliases[source] = [`${prefix}${name}${String.fromCharCode("０".charCodeAt(0) + digit)}`, `${prefix}${name}${digit}`, source, `Bip001-${letter}-Finger${bipSuffix}`];
            if (joint < 3) sourceChildren[source] = `${side}Hand${finger}${joint + 1}`;
        }
    });
}
type Model = MmdModel | MmdWasmModel;
interface Joint {
    readonly name: string; readonly index: number; readonly parent: number; source?: string;
    readonly readRotation: () => Quaternion;
    readonly writeRotation: (rotation: Quaternion) => void;
    readonly writePosition: (position: Vector3) => void;
    readonly rest: Quaternion; readonly restPosition: Vector3;
    readonly bindRotation: Quaternion; readonly bindPosition: Vector3;
    readonly initialWorld: Quaternion; readonly calibrations: Quaternion[];
    readonly worldPosition: Vector3;
    readonly local: Quaternion; readonly world: Quaternion; readonly append: Quaternion; visit: number;
    readonly appendParent: number; readonly appendRatio: number; readonly appendIsWorld: boolean;
}
interface ClipCalibration {
    readonly alignment: Quaternion; readonly inverseAlignment: Quaternion; readonly rootScale: number; readonly contactScale: number;
}
interface FootContact {
    readonly joint: Joint;
    readonly source: string;
    readonly bindHeight: number;
}
const normaliseName = (name: string): string => name.replace(/^mixamorig[:_]?/i, "").replace(/[\s_\-]/g, "").toLowerCase();
const smoothstep = (value: number): number => value * value * (3 - 2 * value);
const closedClips = new WeakMap<IdleClip, IdleClip>();

/** Match the test world's half-second seam without changing the source assets. */
function closeIdleClip(clip: IdleClip): IdleClip {
    const cached = closedClips.get(clip);
    if (cached) return cached;
    const span = Math.min(0.55 * clip.fps, (clip.frameCount - 1) * 0.2);
    const start = clip.frameCount - 1 - span;
    const close = (frames: readonly number[][], quaternion: boolean): number[][] => frames.map((values, index) => {
        if (index < start) return [...values];
        const weight = smoothstep(Math.max(0, Math.min(1, (index - start) / Math.max(1, span))));
        if (quaternion) return Quaternion.Slerp(Quaternion.FromArray(values), Quaternion.FromArray(frames[0]), weight).normalize().asArray();
        return values.map((value, axis) => value + (frames[0][axis] - value) * weight);
    });
    const result: IdleClip = {
        ...clip,
        tracks: Object.fromEntries(Object.entries(clip.tracks).map(([name, frames]) => [name, close(frames, true)])),
        positions: clip.positions ? Object.fromEntries(Object.entries(clip.positions).map(([name, frames]) => [name, close(frames, false)])) : undefined
    };
    closedClips.set(clip, result);
    return result;
}

/** Absolute source poses are calibrated against the actual target bind pose. */
export class IdleMotion {
    private model: Model | undefined;
    private skeleton: Skeleton | undefined;
    private joints: Joint[] = [];
    private readonly clips: readonly IdleClip[];
    private readonly sequence: IdleSequence | SelectedIdleLoop;
    private readonly attention: IdleAttention | undefined;
    private style: IdleStyle = "female";
    private tuningEnabled = true;
    private tuningStrength = 1;
    private readonly tuningOffsets = new Map<string, Quaternion>();

    /** Offsets are local to the animated joint, never edits to the bind pose. */
    public setBoneTuning(value: unknown): void {
        const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
        this.tuningEnabled = data.enabled !== false;
        this.tuningStrength = typeof data.strength === "number" && Number.isFinite(data.strength) ? Math.max(0, Math.min(1, data.strength)) : 1;
        this.tuningOffsets.clear();
        if (!data.bones || typeof data.bones !== "object" || Array.isArray(data.bones)) return;
        for (const [source, values] of Object.entries(data.bones)) {
            if (!Object.prototype.hasOwnProperty.call(aliases, source) || !Array.isArray(values) || values.length !== 3 || !values.every(v => typeof v === "number" && Number.isFinite(v))) continue;
            const [x, y, z] = values.map(v => Math.max(-180, Math.min(180, v)) * Math.PI / 180);
            this.tuningOffsets.set(source, Quaternion.FromEulerAngles(x, y, z));
        }
    }
    public getTunableBones(): {source: string; name: string}[] {
        return this.joints.filter(joint => joint.source).map(joint => ({source: joint.source!, name: joint.name}));
    }
    private applyBoneTuning(): void {
        if (!this.tuningEnabled || this.tuningStrength === 0 || this.tuningOffsets.size === 0) return;
        for (const joint of this.joints) {
            const correction = joint.source ? this.tuningOffsets.get(joint.source) : undefined;
            if (!correction) continue;
            Quaternion.SlerpToRef(this.identity, correction, this.tuningStrength, this.a);
            joint.local.multiplyToRef(this.a, this.rotation).normalize();
            joint.writeRotation(this.rotation);
        }
    }
    private readonly clipCalibrations: ClipCalibration[] = [];
    private readonly contacts: FootContact[] = [];
    private readonly groundUp = Vector3.Up();
    private groundContact = false;
    private rightHanded = false;
    private root: Joint | undefined;
    private entryElapsed = 0;
    private armClearance = 0;
    private ikStates: Uint8Array | undefined;
    private readonly a = Quaternion.Identity();
    private readonly b = Quaternion.Identity();
    private readonly rotation = Quaternion.Identity();
    private readonly secondRotation = Quaternion.Identity();
    private readonly identity = Quaternion.Identity();
    private readonly offset = Vector3.Zero();
    private readonly secondOffset = Vector3.Zero();
    private readonly position = Vector3.Zero();
    private readonly gazeUp = Vector3.Up();
    private readonly gazeRight = Vector3.Right();
    private readonly gazeRotation = Quaternion.Identity();
    private readonly gazePitch = Quaternion.Identity();
    private readonly gazeLocal = Quaternion.Identity();
    private gestureClips: readonly IdleClip[] = [];
    private gestureInfluence: (source:string)=>number = () => 0;
    private gesturePose?: {index:number;time:number;weight:number};
    private gestureSources:string[]=[];
    private gestureBound=false;
    private gestureBase:Quaternion[]=[];
    private previousGesturePose?: {index:number;time:number;weight:number};

    /** Configure before binding. No gesture assets or work are needed by legacy clients. */
    public configureGestures(clips: readonly IdleClip[], influence: (source:string)=>number): void {
        if(this.joints.length)throw new Error('Configure gestures before binding the rig.');
        this.gestureClips=clips;this.gestureInfluence=influence;this.gesturePose=undefined;
    }
    public getGestureBinding(): {enabled:boolean;sources:string[]} {
        return {enabled:this.gestureBound,sources:[...this.gestureSources]};
    }
    public setGesturePose(index:number,time:number,weight:number,previous?:{index:number;time:number;weight:number}): void {
        this.gesturePose=Number.isSafeInteger(index)&&index>=0&&index<this.gestureClips.length&&Number.isFinite(time)&&Number.isFinite(weight)&&weight>0&&this.gestureBound?{index,time:Math.max(0,time),weight:Math.min(1,weight)}:undefined;
        this.previousGesturePose=previous&&this.gestureClips[previous.index]&&previous.weight>0?previous:undefined;
    }

    public constructor(options: IdleMotionOptions = {}) {
        this.clips = options.clips ?? [maleIdle, femaleIdle, femaleIdle2].map(closeIdleClip);
        this.sequence = options.clips ? new IdleSequence(this.clips, this.clips.length, -1, options) : new SelectedIdleLoop(this.clips, options.blendSeconds);
        this.attention = options.clips || options.attention === false ? undefined : new IdleAttention(options.random);
    }
    public setHovered(hovered: boolean): boolean { return this.sequence.setHovered(hovered); }
    public getState(): IdleSequenceState { return this.sequence.getState(); }
    public setStyle(style: string): boolean {
        if (!(IDLE_STYLES as readonly string[]).includes(style) || !(this.sequence instanceof SelectedIdleLoop)) return false;
        if (style === this.style) return true;
        this.style = style as IdleStyle;
        this.sequence.select(IDLE_STYLES.indexOf(this.style), this.joints.length === 0);
        this.attention?.setStyle(this.style);
        return true;
    }
    public setPointer(x: number, y: number, valid = true): void { this.attention?.setPointer(x, y, valid); }
    public getIdleState(): IdleBehaviorState { return this.attention?.getState() ?? { style: this.style, phase: "rest", mouseLook: false, sensitivity: 0.35, yaw: 0, pitch: 0 }; }
    public reset(): void { this.release(); }

    private makeJoint(name: string, index: number, parent: number, bindMatrix: Matrix, rest: Quaternion, restPosition: Vector3,
        readRotation: () => Quaternion, writeRotation: (rotation: Quaternion) => void, writePosition: (position: Vector3) => void,
        metadata?: MmdModelMetadata.Bone): Joint {
        const bindRotation = Quaternion.Identity(), bindPosition = Vector3.Zero();
        bindMatrix.decompose(undefined, bindRotation, bindPosition);
        const append = metadata && (metadata.flag & 0x100) !== 0 ? metadata.appendTransform : undefined;
        return {
            name, index, parent, rest, restPosition, readRotation, writeRotation, writePosition, bindRotation, bindPosition,
            initialWorld: Quaternion.Identity(), calibrations: [], worldPosition: Vector3.Zero(), local: rest.clone(), world: Quaternion.Identity(), append: Quaternion.Identity(), visit: 0,
            appendParent: append?.parentIndex ?? -1, appendRatio: append?.ratio ?? 0, appendIsWorld: metadata ? (metadata.flag & 0x80) !== 0 : false
        };
    }
    private bind(model: Model, bones: readonly MmdModelMetadata.Bone[]): void {
        this.release();
        this.model = model;
        this.joints = model.runtimeBones.map((bone, index) => this.makeJoint(
            bone.name, index, bone.parentBone ? model.runtimeBones.indexOf(bone.parentBone) : -1,
            Matrix.Invert(bone.linkedBone.getAbsoluteInverseBindMatrix()), bone.linkedBone.rotationQuaternion.clone(), bone.linkedBone.position.clone(),
            () => bone.linkedBone.rotationQuaternion,
            rotation => {
                bone.linkedBone.rotationQuaternion.copyFrom(rotation);
                if ("boneAnimationStates" in model) rotation.toArray(model.boneAnimationStates, index * 12 + 4);
            },
            position => {
                bone.linkedBone.position.copyFrom(position);
                if ("boneAnimationStates" in model) position.toArray(model.boneAnimationStates, index * 12);
            }, bones[index]
        ));
        this.root = ["センター", "Center", "center", "全ての親"].map(name => this.joints.find(joint => joint.name === name)).find(Boolean);
        this.finishBinding();
        this.ikStates = model.ikSolverStates.slice();
        for (const bone of model.runtimeBones) {
            if (bone.ikSolverIndex >= 0 && /足|つま先|leg|foot|toe/i.test(bone.name)) model.ikSolverStates[bone.ikSolverIndex] = 0;
        }
    }
    public apply(model: Model, deltaSeconds: number, bones: readonly MmdModelMetadata.Bone[]): void {
        if (this.model !== model) this.bind(model, bones);
        this.update(deltaSeconds);
    }

    /** Imported animation groups must be stopped before using the shared driver. */
    public applySkeleton(skeleton: Skeleton, deltaSeconds: number, options: SkeletonIdleOptions = {}): void {
        if (this.skeleton !== skeleton) this.bindSkeleton(skeleton, options);
        this.update(deltaSeconds);
    }
    private bindSkeleton(skeleton: Skeleton, options: SkeletonIdleOptions): void {
        this.release();
        this.skeleton = skeleton;
        const node = skeleton.bones.find(bone => !bone.getParent())?.getTransformNode();
        this.rightHanded = options.rightHanded ?? (skeleton.getScene().useRightHandedSystem || (node?.computeWorldMatrix(true).determinant() ?? 1) < 0);
        this.armClearance = options.armClearanceDegrees ?? (skeleton.bones.some(bone => normaliseName(bone.name) === "bip001") ? 8 : 0);
        this.groundContact = options.groundContact ?? true;
        const outside = node?.parent;
        if (outside) Vector3.TransformNormalToRef(Vector3.Up(), Matrix.Invert(outside.computeWorldMatrix(true)), this.groundUp);
        else this.groundUp.copyFrom(Vector3.Up());
        this.groundUp.normalize();
        // glTF inverse binds include the mesh's outside parent transform. Bone
        // rotations are written in the skeleton parent's frame, so calibrate
        // against the cumulative local rest matrices in that same frame.
        const matrices = new Map<Bone, Matrix>();
        const restMatrix = (bone: Bone): Matrix => {
            const cached = matrices.get(bone);
            if (cached) return cached;
            const matrix = bone.getRestMatrix().clone();
            const parent = bone.getParent();
            if (parent) matrix.multiplyToRef(restMatrix(parent), matrix);
            matrices.set(bone, matrix);
            return matrix;
        };
        this.joints = skeleton.bones.map((bone, index) => this.makeSkeletonJoint(bone, index, skeleton, restMatrix(bone)));
        this.finishBinding();
    }
    private makeSkeletonJoint(bone: Bone, index: number, skeleton: Skeleton, bindMatrix: Matrix): Joint {
        const node = bone.getTransformNode();
        const rest = node ? node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation) : bone.getRotationQuaternion();
        return this.makeJoint(
            bone.name, index, bone.getParent() ? skeleton.bones.indexOf(bone.getParent()!) : -1,
            bindMatrix, rest, node ? node.position.clone() : bone.position.clone(),
            () => node ? node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation) : bone.getRotationQuaternion(),
            rotation => {
                if (node) { node.rotationQuaternion ??= Quaternion.Identity(); node.rotationQuaternion.copyFrom(rotation); }
                else bone.setRotationQuaternion(rotation);
            },
            position => { if (node) node.position.copyFrom(position); else bone.setPosition(position); }
        );
    }
    private sourceVector(values: readonly number[]): Vector3 { return new Vector3(values[0], values[1], this.rightHanded ? -values[2] : values[2]); }
    private bodyFrame(positions: ReadonlyMap<string, Vector3>): Quaternion {
        const left = positions.get("LeftUpLeg"), right = positions.get("RightUpLeg");
        const hips = positions.get("Hips"), neck = positions.get("Neck");
        if (!left || !right) return Quaternion.Identity();
        const y = hips && neck ? neck.subtract(hips).normalize() : Vector3.Up();
        const z = Vector3.Cross(left.subtract(right), y).normalize();
        const x = Vector3.Cross(y, z).normalize();
        if (x.lengthSquared() < 0.5 || z.lengthSquared() < 0.5) return Quaternion.Identity();
        const matrix = Matrix.Identity();
        Matrix.FromXYZAxesToRef(x, y, z, matrix);
        return Quaternion.FromRotationMatrix(matrix);
    }
    private palmFrame(positions: ReadonlyMap<string, Vector3>, side: string): Quaternion | undefined {
        const hand = positions.get(`${side}Hand`), middle = positions.get(`${side}HandMiddle1`);
        const index = positions.get(`${side}HandIndex1`), pinky = positions.get(`${side}HandPinky1`);
        if (!hand || !middle || !index || !pinky) return undefined;
        const y = middle.subtract(hand).normalize(), z = Vector3.Cross(index.subtract(pinky), y).normalize();
        if (y.lengthSquared() < 0.5 || z.lengthSquared() < 0.5) return undefined;
        const matrix = Matrix.Identity();
        Matrix.FromXYZAxesToRef(Vector3.Cross(y, z).normalize(), y, z, matrix);
        return Quaternion.FromRotationMatrix(matrix);
    }
    private finishBinding(): void {
        const names = new Map(this.joints.map(joint => [normaliseName(joint.name), joint]));
        const sources = new Map<string, Joint>();
        for (const [source, namesForBone] of Object.entries(aliases)) {
            const bone = [...namesForBone, source].map(name => names.get(normaliseName(name))).find(Boolean);
            if (bone && ![...sources.values()].includes(bone)) { sources.set(source, bone); bone.source = source; }
        }
        const depth = (joint: Joint): number => joint.parent >= 0 ? depth(this.joints[joint.parent]) + 1 : 0;
        const spine = [...new Set([sources.get("Spine"), sources.get("Spine1"), sources.get("Spine2")].filter((bone): bone is Joint => !!bone))].sort((a, b) => depth(a) - depth(b));
        for (const source of ["Spine", "Spine1", "Spine2"]) sources.delete(source);
        spine.forEach((joint, index) => {
            const source = index === spine.length - 1 ? "Spine2" : index === 0 ? "Spine" : "Spine1";
            joint.source = source; sources.set(source, joint);
        });
        this.root ??= sources.get("Hips");
        this.gestureSources=[...sources.keys()];
        this.gestureBound=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','Head'].every(source=>sources.has(source))&&this.gestureSources.some(source=>/^Spine/.test(source));
        const targetPositions = new Map([...sources].map(([name, bone]) => [name, bone.bindPosition]));
        const targetFrame = this.bodyFrame(targetPositions);
        Vector3.Up().rotateByQuaternionToRef(targetFrame, this.gazeUp);
        Vector3.Right().rotateByQuaternionToRef(targetFrame, this.gazeRight);
        const targetHeight = sources.get("Head")?.bindPosition.subtract(sources.get("Hips")?.bindPosition ?? Vector3.Zero()).length() ?? 0;
        const initialiseWorld = (joint: Joint): void => {
            if (joint.visit) return;
            joint.visit = 1;
            const parent = this.joints[joint.parent];
            if (parent) { initialiseWorld(parent); parent.initialWorld.multiplyToRef(joint.rest, joint.initialWorld); }
            else joint.initialWorld.copyFrom(joint.rest);
        };
        for (const joint of this.joints) initialiseWorld(joint);
        [...this.clips,...this.gestureClips].forEach((clip, clipIndex) => {
            const sourcePositions = new Map(Object.entries(clip.restPositions ?? {}).map(([name, position]) => [name, this.sourceVector(position)]));
            const alignment = sourcePositions.size ? targetFrame.multiply(this.bodyFrame(sourcePositions).conjugate()) : Quaternion.Identity();
            const alignedPositions = new Map([...sourcePositions].map(([name, position]) => [name, position.rotateByQuaternionToRef(alignment, Vector3.Zero())]));
            const sourceHeight = sourcePositions.get("Head")?.subtract(sourcePositions.get("Hips") ?? Vector3.Zero()).length() ?? 0;
            this.clipCalibrations.push({
                alignment, inverseAlignment: alignment.conjugate(),
                rootScale: targetHeight > 1e-5 && sourceHeight > 1e-5 ? targetHeight / sourceHeight : 0,
                contactScale: Math.max(1e-5, targetHeight / 0.575)
            });
            const corrections = new Map<string, Quaternion>();
            for (const joint of this.joints) {
                const correction = Quaternion.Identity(), source = joint.source;
                let childSource = source ? sourceChildren[source] : undefined;
                while (childSource && !sources.has(childSource)) childSource = sourceChildren[childSource];
                let child = childSource ? sources.get(childSource) : undefined;
                // MMD upper/lower body bones are siblings at almost the same
                // pelvis point. That tiny offset is not a hip-to-spine axis:
                // on Lynae/Rover it points DOWN and flips the pelvis ~180°.
                // Use the stable torso axis when the mapped spine is outside
                // the hips hierarchy; keep ordinary Mixamo/glTF chains intact.
                if (source === "Hips" && child) {
                    let ancestor: Joint | undefined = child;
                    while (ancestor && ancestor !== joint) ancestor = this.joints[ancestor.parent];
                    if (!ancestor) child = sources.get("Neck") ?? sources.get("Spine2") ?? child;
                }
                if (!child && source?.includes("Hand") && /3$/.test(source)) child = this.joints.find(candidate => candidate.parent === joint.index && /先|tip|end/i.test(candidate.name));
                const direction = source ? clip.restDirections[source] : undefined;
                if (direction && child) {
                    const targetDirection = child.bindPosition.subtract(joint.bindPosition).normalize();
                    const sourceDirection = this.sourceVector(direction).rotateByQuaternionToRef(alignment, Vector3.Zero()).normalize();
                    if (targetDirection.lengthSquared() > 0.5 && sourceDirection.lengthSquared() > 0.5) Quaternion.FromUnitVectorsToRef(targetDirection, sourceDirection, correction);
                }
                if (source?.endsWith("Hand")) {
                    const side = source.startsWith("Left") ? "Left" : "Right";
                    const targetPalm = this.palmFrame(targetPositions, side), sourcePalm = this.palmFrame(alignedPositions, side);
                    if (targetPalm && sourcePalm) sourcePalm.multiplyToRef(targetPalm.conjugate(), correction);
                }
                if (source) corrections.set(source, correction);
                joint.calibrations[clipIndex] = correction.multiply(joint.bindRotation);
            }
            for (const joint of this.joints) {
                if (!joint.source?.includes("Hand") || !/3$/.test(joint.source) || this.joints.some(child => child.parent === joint.index)) continue;
                const parentCorrection = corrections.get(joint.source.replace(/3$/, "2"));
                if (parentCorrection) joint.calibrations[clipIndex] = parentCorrection.multiply(joint.bindRotation);
            }
        });
        if (this.groundContact) {
            for (const source of ["LeftToeBase", "RightToeBase"]) {
                const joint = sources.get(source);
                if (joint) this.contacts.push({ joint, source, bindHeight: Vector3.Dot(joint.bindPosition, this.groundUp) });
            }
        }
    }
    private sampleRotation(joint: Joint, phase: IdlePhase, result: Quaternion): boolean {
        const clip = phase.clipIndex<this.clips.length?this.clips[phase.clipIndex]:this.gestureClips[phase.clipIndex-this.clips.length], frames = joint.source ? clip.tracks[joint.source] : undefined;
        if (!frames?.length) return false;
        const frame = Math.max(0, Math.min(phase.time * clip.fps, frames.length - 1)), first = Math.floor(frame), next = Math.min(first + 1, frames.length - 1);
        Quaternion.FromArrayToRef(frames[first], 0, this.a); Quaternion.FromArrayToRef(frames[next], 0, this.b);
        Quaternion.SlerpToRef(this.a, this.b, frame - first, result);
        if (this.rightHanded) { result.x *= -1; result.y *= -1; }
        const calibration = this.clipCalibrations[phase.clipIndex];
        calibration.alignment.multiplyToRef(result, result); result.multiplyInPlace(calibration.inverseAlignment);
        result.multiplyInPlace(joint.calibrations[phase.clipIndex]);
        // Apply the shoulder clearance to the whole arm chain. Correcting only
        // the upper arm would make the forearm's absolute pose cancel the turn.
        if (this.armClearance && joint.source && /^(Left|Right)(Arm|ForeArm|Hand)/.test(joint.source)) {
            const forward = Vector3.Forward().rotateByQuaternionToRef(calibration.alignment, Vector3.Zero());
            Quaternion.RotationAxisToRef(forward, this.armClearance * Math.PI / 180 * (joint.source.startsWith("Left") ? 1 : -1), this.a);
            this.a.multiplyToRef(result, result);
        }
        result.normalize(); return true;
    }
    private sampleRoot(phase: IdlePhase, result: Vector3): void {
        result.setAll(0);
        const clip = this.clips[phase.clipIndex], frames = clip.positions?.Hips, rest = clip.restPositions?.Hips;
        if (!frames?.length || !rest) return;
        const frame = Math.max(0, Math.min(phase.time * clip.fps, frames.length - 1)), first = Math.floor(frame), next = Math.min(first + 1, frames.length - 1), amount = frame - first;
        result.set(frames[first][0] + (frames[next][0] - frames[first][0]) * amount - rest[0], frames[first][1] + (frames[next][1] - frames[first][1]) * amount - rest[1], (frames[first][2] + (frames[next][2] - frames[first][2]) * amount - rest[2]) * (this.rightHanded ? -1 : 1));
        const calibration = this.clipCalibrations[phase.clipIndex];
        result.rotateByQuaternionToRef(calibration.alignment, result).scaleInPlace(calibration.rootScale);
    }
    private contactSample(contact: FootContact, phase: IdlePhase): { height: number; weight: number } {
        const clip = this.clips[phase.clipIndex], frames = clip.positions?.[contact.source], rest = clip.restPositions?.[contact.source];
        if (!frames?.length || !rest) return { height: 0, weight: 0 };
        const f = Math.max(0, Math.min(phase.time * clip.fps, frames.length - 1));
        const first = Math.floor(f), next = Math.min(first + 1, frames.length - 1), amount = f - first;
        const calibration = this.clipCalibrations[phase.clipIndex], scale = calibration.rootScale;
        // Imported idle poses have different bind-to-floor offsets. Their first
        // frames are already planted, so preserve only the authored lift from
        // that baseline rather than pushing the target feet below its floor.
        const baseline = this.attention ? frames[0][1] : rest[1];
        const height = (frames[first][1] + (frames[next][1] - frames[first][1]) * amount - baseline) * scale;
        const previous = Math.max(0, first - 1), following = Math.min(frames.length - 1, next + 1);
        const speed = following > previous ? Math.hypot(frames[following][0] - frames[previous][0], frames[following][2] - frames[previous][2]) * scale * clip.fps / (following - previous) : 0;
        // Release contact smoothly for authored lifts or a moving step. The
        // original toe height remains in the target, including heel rocking.
        const lift = 1 - smoothstep(Math.max(0, Math.min(1, (height / calibration.contactScale - 0.012) / 0.045)));
        const moving = 1 - smoothstep(Math.max(0, Math.min(1, (speed / calibration.contactScale - 0.04) / 0.2)));
        return { height, weight: lift * moving };
    }
    private compensateContact(state: IdleSequenceState, entryWeight: number): void {
        if (!this.root || this.contacts.length === 0) return;
        for (const joint of this.joints) joint.visit = 0;
        const position = (joint: Joint): void => {
            if (joint.visit) return;
            joint.visit = 1;
            const local = joint === this.root ? this.position : joint.restPosition;
            const parent = this.joints[joint.parent];
            if (parent) {
                position(parent);
                local.rotateByQuaternionToRef(parent.world, joint.worldPosition).addInPlace(parent.worldPosition);
            } else joint.worldPosition.copyFrom(local);
        };
        let error = 0, total = 0;
        for (const contact of this.contacts) {
            position(contact.joint);
            const first = this.contactSample(contact, state.primary);
            const second = state.secondary ? this.contactSample(contact, state.secondary) : first;
            const weight = first.weight + (second.weight - first.weight) * state.blend;
            const goal = contact.bindHeight + (first.height + (second.height - first.height) * state.blend) * entryWeight;
            error += (goal - Vector3.Dot(contact.joint.worldPosition, this.groundUp)) * weight;
            total += weight;
        }
        if (total < 1e-6) return;
        const correction = error / total * Math.min(1, total);
        this.groundUp.scaleToRef(correction, this.offset);
        const parent = this.joints[this.root.parent];
        if (parent) this.offset.rotateByQuaternionToRef(parent.world.conjugate(), this.offset);
        this.position.addInPlace(this.offset);
    }
    private update(deltaSeconds: number): void {
        const delta = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.1)) : 0;
        this.entryElapsed += delta;
        // The companion's first visible frame is already the selected idle.
        // Legacy custom-clip clients retain their gradual entry behavior.
        const state = this.sequence.advance(delta), entryWeight = this.attention ? 1 : smoothstep(Math.min(1, this.entryElapsed / 0.75));
        for (const joint of this.joints) joint.visit = 0;
        for (const joint of this.joints) this.solve(joint, state, entryWeight);
        for (const joint of this.joints) { if (joint.source) joint.writeRotation(joint.local); }
        if (this.root) {
            this.sampleRoot(state.primary, this.offset);
            if (state.secondary) { this.sampleRoot(state.secondary, this.secondOffset); Vector3.LerpToRef(this.offset, this.secondOffset, state.blend, this.offset); }
            this.offset.scaleInPlace(entryWeight);
            const parent = this.joints[this.root.parent];
            if (parent) this.offset.rotateByQuaternionToRef(parent.world.conjugate(), this.offset);
            this.root.restPosition.addToRef(this.offset, this.position);
            this.compensateContact(state, entryWeight);
            this.root.writePosition(this.position);
        }
        if (this.attention) {
            this.attention.advance(delta);
            this.applyAttention();
        }
        this.applyGesture();
        this.applyBoneTuning();
    }
    private applyGesture(): void {
        if(this.previousGesturePose)this.applyGesturePose(this.previousGesturePose);
        if(this.gesturePose)this.applyGesturePose(this.gesturePose);
    }
    private applyGesturePose(pose:{index:number;time:number;weight:number}): void {
        if(this.gestureBase.length!==this.joints.length)this.gestureBase=this.joints.map(()=>Quaternion.Identity());
        const base=this.gestureBase;for(const joint of this.joints)base[joint.index].copyFrom(joint.local);
        const clip=this.gestureClips[pose.index];
        const state:IdleSequenceState={primary:{clipIndex:this.clips.length+pose.index,name:clip.name,time:pose.time,clipStart:0,clipEnd:(clip.frameCount-1)/clip.fps,tailStart:0},blend:0,reacting:false,holding:false,holdElapsed:0,stage:'animation'};
        for(const joint of this.joints)joint.visit=0;
        for(const joint of this.joints)this.solve(joint,state,1);
        // Blend calibrated LOCAL rotations, as AnimationLab does. In particular,
        // neither source hips/root motion nor leg poses can replace the base idle.
        for(const joint of this.joints){
            const amount=joint.source?this.gestureInfluence(joint.source)*pose.weight:0;
            Quaternion.SlerpToRef(base[joint.index],joint.local,amount,joint.local).normalize();
            if(amount>0)joint.writeRotation(joint.local);
        }
    }
    private applyAttention(): void {
        if (!this.attention) return;
        for (const joint of this.joints) joint.visit = 0;
        const apply = (joint: Joint): void => {
            if (joint.visit) return;
            joint.visit = 1;
            const parent = this.joints[joint.parent];
            if (parent) apply(parent);
            const share = joint.source === "Spine2" ? 0.12 : joint.source === "Neck" ? 0.28 : joint.source === "Head" ? 0.6 : 0;
            if (share) {
                // The imported glTF and MMD body frames have opposite facing
                // axes. Convert screen-space attention to the target frame.
                Quaternion.RotationAxisToRef(this.gazeUp, this.attention!.yaw * share * (this.rightHanded ? -1 : 1), this.gazeRotation);
                Quaternion.RotationAxisToRef(this.gazeRight, this.attention!.pitch * share * (this.rightHanded ? 1 : -1), this.gazePitch);
                this.gazeRotation.multiplyInPlace(this.gazePitch);
                if (parent) {
                    parent.world.conjugateToRef(this.gazeLocal).multiplyToRef(this.gazeRotation, this.gazeLocal);
                    this.gazeLocal.multiplyInPlace(parent.world);
                } else this.gazeLocal.copyFrom(this.gazeRotation);
                this.gazeLocal.multiplyToRef(joint.local, joint.local).normalize();
                joint.writeRotation(joint.local);
            }
            joint.local.multiplyToRef(joint.append, joint.world);
            if (parent) parent.world.multiplyToRef(joint.world, joint.world);
        };
        // Rebuild from this frame's authored pose, never from last frame's gaze.
        for (const joint of this.joints) apply(joint);
    }
    private solve(joint: Joint, state: IdleSequenceState, entryWeight: number): void {
        if (joint.visit !== 0) return;
        joint.visit = 1;
        const parent = this.joints[joint.parent];
        if (parent) this.solve(parent, state, entryWeight);
        const appendParent = this.joints[joint.appendParent];
        joint.append.copyFrom(this.identity);
        if (appendParent && appendParent.visit !== 1) {
            this.solve(appendParent, state, entryWeight);
            const inherited = joint.appendIsWorld ? appendParent.world : appendParent.local.multiply(appendParent.append);
            Quaternion.SlerpToRef(this.identity, inherited, joint.appendRatio, joint.append);
        }
        const animated = this.sampleRotation(joint, state.primary, this.rotation);
        const secondaryAnimated = state.secondary ? this.sampleRotation(joint, state.secondary, this.secondRotation) : false;
        if (!animated && !secondaryAnimated) {
            joint.local.copyFrom(joint.source ? joint.rest : joint.readRotation()); joint.local.multiplyToRef(joint.append, joint.world);
            if (parent) parent.world.multiplyToRef(joint.world, joint.world);
        } else {
            if (!animated) {
                joint.rest.multiplyToRef(joint.append, this.rotation);
                if (parent) parent.world.multiplyToRef(this.rotation, this.rotation);
            }
            if (state.secondary) {
                if (!secondaryAnimated) {
                    joint.rest.multiplyToRef(joint.append, this.secondRotation);
                    if (parent) parent.world.multiplyToRef(this.secondRotation, this.secondRotation);
                }
                Quaternion.SlerpToRef(this.rotation, this.secondRotation, state.blend, this.rotation);
            }
            Quaternion.SlerpToRef(joint.initialWorld, this.rotation, entryWeight, joint.world);
            if (parent) parent.world.conjugateToRef(joint.local).multiplyToRef(joint.world, joint.local);
            else joint.local.copyFrom(joint.world);
            joint.local.multiplyInPlace(joint.append.conjugate()).normalize();
        }
        joint.visit = 2;
    }
    public release(): void {
        this.gesturePose=undefined;this.previousGesturePose=undefined;this.gestureSources=[];this.gestureBound=false;this.gestureBase=[];
        for (const joint of this.joints) { if (joint.source) joint.writeRotation(joint.rest); }
        this.root?.writePosition(this.root.restPosition);
        if (this.model && this.ikStates) this.model.ikSolverStates.set(this.ikStates);
        this.model = undefined; this.skeleton = undefined; this.joints = []; this.root = undefined; this.ikStates = undefined;
        this.clipCalibrations.length = 0; this.contacts.length = 0; this.groundContact = false;
        this.rightHanded = false; this.armClearance = 0; this.entryElapsed = 0;
        this.sequence.reset();
        this.attention?.reset();
    }
}
