export interface IdleClipTiming {
    readonly name: string;
    readonly fps: number;
    readonly frameCount: number;
}

export interface IdleSequenceOptions {
    readonly blendSeconds?: number;
    readonly holdSeconds?: number;
    // Kept for callers that previously configured hover. Hover is disabled.
    readonly hoverProbability?: number;
    readonly hoverCooldownSeconds?: number;
    readonly random?: () => number;
}

export interface IdlePhase {
    readonly clipIndex: number;
    readonly name: string;
    readonly time: number;
    readonly clipStart: number;
    readonly clipEnd: number;
    /** Legacy inspection field; full clips always start at zero. */
    readonly tailStart: number;
}

export interface IdleSequenceState {
    readonly primary: IdlePhase;
    readonly secondary?: IdlePhase;
    readonly blend: number;
    readonly reacting: boolean;
    readonly holding: boolean;
    readonly holdElapsed: number;
    readonly stage: "animation" | "hold" | "transition";
}

interface Transition {
    readonly from: number;
    readonly to: number;
    elapsed: number;
    readonly duration: number;
}

// Easing is applied only to transitions. The clip itself keeps authored speed.
const ease = (value: number): number => value * value * value * (value * (value * 6 - 15) + 10);

/** Play each complete clip, hold its endpoint, then blend into the next start. */
export class IdleSequence {
    private current = 0;
    private played = 0;
    private held = 0;
    private transition: Transition | undefined;
    private readonly blendSeconds: number;
    private readonly holdSeconds: number;

    public constructor(
        private readonly clips: readonly IdleClipTiming[],
        private readonly idleCount: number = clips.length,
        _reactionIndex: number = -1,
        options: IdleSequenceOptions = {}
    ) {
        if (clips.length === 0 || idleCount < 1 || idleCount > clips.length) throw new Error("At least one idle clip is required");
        this.blendSeconds = Math.max(0.05, options.blendSeconds ?? 0.65);
        this.holdSeconds = Math.max(0, options.holdSeconds ?? 3);
    }

    public reset(): void {
        this.current = 0;
        this.played = 0;
        this.held = 0;
        this.transition = undefined;
    }

    public setHovered(_hovered: boolean): boolean {
        return false;
    }

    public duration(index: number): number {
        const clip = this.clips[index];
        return Math.max(1 / Math.max(1, clip.fps), (clip.frameCount - 1) / Math.max(1, clip.fps));
    }

    public tailStart(_index: number): number {
        return 0;
    }

    private phase(index: number, played: number): IdlePhase {
        const duration = this.duration(index);
        return {
            clipIndex: index, name: this.clips[index].name,
            clipStart: 0, clipEnd: duration, tailStart: 0,
            time: Math.max(0, Math.min(duration, played))
        };
    }

    public advance(deltaSeconds: number): IdleSequenceState {
        let remaining = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
        // Split advances at every stage boundary, preserving long-frame timing.
        while (remaining > 0) {
            if (this.transition) {
                const transition = this.transition;
                const step = Math.min(remaining, transition.duration - transition.elapsed);
                transition.elapsed += step;
                remaining -= step;
                if (transition.elapsed + 1e-9 >= transition.duration) {
                    this.current = transition.to;
                    // Finish reaching the starting pose before playing the
                    // complete next animation at its original speed.
                    this.played = 0;
                    this.held = 0;
                    this.transition = undefined;
                }
                continue;
            }
            const duration = this.duration(this.current);
            if (this.played + 1e-9 < duration) {
                const step = Math.min(remaining, duration - this.played);
                this.played += step;
                remaining -= step;
                if (this.played + 1e-9 >= duration) this.played = duration;
                continue;
            }
            const step = Math.min(remaining, Math.max(0, this.holdSeconds - this.held));
            this.held += step;
            remaining -= step;
            if (this.held + 1e-9 >= this.holdSeconds) {
                const next = (this.current + 1) % this.idleCount;
                this.transition = { from: this.current, to: next, elapsed: 0, duration: this.blendSeconds };
            }
        }
        return this.getState();
    }

    public getState(): IdleSequenceState {
        const transition = this.transition;
        if (transition) {
            return {
                primary: this.phase(transition.from, this.duration(transition.from)),
                secondary: this.phase(transition.to, 0),
                blend: ease(Math.max(0, Math.min(1, transition.elapsed / transition.duration))),
                reacting: false, holding: false, holdElapsed: this.holdSeconds, stage: "transition"
            };
        }
        const holding = this.played + 1e-9 >= this.duration(this.current);
        return {
            primary: this.phase(this.current, this.played), blend: 0, reacting: false,
            holding, holdElapsed: this.held, stage: holding ? "hold" : "animation"
        };
    }
}
