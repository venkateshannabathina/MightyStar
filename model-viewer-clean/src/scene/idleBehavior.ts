import type { IdleClipTiming, IdlePhase, IdleSequenceState } from "./idleSequence";

export type IdleStyle = "male" | "female" | "dwarf2";
export const IDLE_STYLES: readonly IdleStyle[] = ["male", "female", "dwarf2"];
const ease = (t: number): number => t * t * (3 - 2 * t);
const clamp = (n: number): number => Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;

/** One continuously playing base pose; rapid requests queue the latest style. */
export class SelectedIdleLoop {
    private current = 1;
    private time = 0;
    private transition: { to: number; time: number; elapsed: number } | undefined;
    private requested = 1;

    public constructor(private readonly clips: readonly IdleClipTiming[], private readonly blendSeconds = 0.65) {}
    public reset(): void { this.current = this.requested; this.time = 0; this.transition = undefined; }
    public setHovered(_hovered: boolean): boolean { return false; }
    public select(index: number, immediately = false): void {
        this.requested = index;
        if (immediately) this.reset();
        else if (!this.transition && index !== this.current) this.transition = { to: index, time: 0, elapsed: 0 };
    }
    private duration(index: number): number { const clip = this.clips[index]; return Math.max(1 / clip.fps, (clip.frameCount - 1) / clip.fps); }
    private phase(index: number, time: number): IdlePhase { return { clipIndex: index, name: this.clips[index].name, time, clipStart: 0, clipEnd: this.duration(index), tailStart: 0 }; }
    public advance(delta: number): IdleSequenceState {
        const dt = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        this.time = (this.time + dt) % this.duration(this.current);
        if (this.transition) {
            this.transition.time = (this.transition.time + dt) % this.duration(this.transition.to);
            this.transition.elapsed += dt;
            if (this.transition.elapsed >= this.blendSeconds) {
                this.current = this.transition.to;
                this.time = this.transition.time;
                this.transition = undefined;
                if (this.requested !== this.current) this.transition = { to: this.requested, time: 0, elapsed: 0 };
            }
        }
        return this.getState();
    }
    public getState(): IdleSequenceState {
        return {
            primary: this.phase(this.current, this.time),
            ...(this.transition ? { secondary: this.phase(this.transition.to, this.transition.time) } : {}),
            blend: this.transition ? ease(Math.min(1, this.transition.elapsed / this.blendSeconds)) : 0,
            reacting: false, holding: false, holdElapsed: 0, stage: this.transition ? "transition" : "animation"
        };
    }
}

export interface IdleBehaviorState {
    readonly style: IdleStyle;
    readonly phase: "rest" | "glance";
    readonly mouseLook: boolean;
    readonly sensitivity: 0.35;
    readonly yaw: number;
    readonly pitch: number;
}

/** Idle attention stays bounded and varies its timing independently of the clip. */
export class IdleAttention {
    private style: IdleStyle = "female";
    private phase: "rest" | "glance" = "rest";
    private remaining = 2.5;
    private pointer = { x: 0, y: 0, valid: false, age: Infinity };
    private mouseLook = false;
    private targetYaw = 0;
    private targetPitch = 0;
    public yaw = 0;
    public pitch = 0;

    public constructor(private readonly random: () => number = Math.random) {}
    private between(a: number, b: number): number { return a + (b - a) * Math.max(0, Math.min(1, this.random())); }
    public setStyle(style: IdleStyle): void { this.style = style; this.rest(); }
    public reset(): void { this.yaw = 0; this.pitch = 0; this.pointer.valid = false; this.rest(); }
    private rest(): void { this.phase = "rest"; this.mouseLook = false; this.targetYaw = this.targetPitch = 0; this.remaining = this.between(1.8, 3.6); }
    public setPointer(x: number, y: number, valid = true): void {
        this.pointer = { x: clamp(x), y: clamp(y), valid: valid && Number.isFinite(x) && Number.isFinite(y), age: 0 };
    }
    public advance(dt: number): void {
        this.pointer.age += dt;
        this.remaining -= dt;
        if (this.remaining <= 0) {
            if (this.phase === "rest") {
                this.phase = "glance";
                this.remaining = this.between(1.4, 2.8);
                this.mouseLook = this.style === "male" && this.pointer.valid && this.pointer.age < 8 && this.random() < 0.75;
                this.targetYaw = this.between(-7, 7) * Math.PI / 180;
                this.targetPitch = this.between(-3, 3) * Math.PI / 180;
            } else {
                this.rest();
                this.remaining = this.style === "male" ? this.between(2.8, 5.5) : this.between(4, 8);
            }
        }
        if (this.mouseLook && (!this.pointer.valid || this.pointer.age >= 8)) { this.mouseLook = false; this.targetYaw = this.targetPitch = 0; }
        if (this.mouseLook) {
            this.targetYaw = -this.pointer.x * 42 * Math.PI / 180 * 0.35;
            this.targetPitch = -this.pointer.y * 25 * Math.PI / 180 * 0.35;
        }
        const weight = 1 - Math.exp(-3 * dt);
        this.yaw += (this.targetYaw - this.yaw) * weight;
        this.pitch += (this.targetPitch - this.pitch) * weight;
    }
    public getState(): IdleBehaviorState { return { style: this.style, phase: this.phase, mouseLook: this.mouseLook, sensitivity: 0.35, yaw: this.yaw, pitch: this.pitch }; }
}
