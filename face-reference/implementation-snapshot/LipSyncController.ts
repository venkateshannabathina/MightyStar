export type MouthPose = "rest" | "closed" | "a" | "i" | "u" | "e" | "o" | "fv";
export type MouthCue = { start: number; end: number; pose: MouthPose };
export type SpeechPerformance = {
    version: number; utteranceId: string; characterId: string; appearanceKey: string;
    durationSeconds: number; quality: string; mouthCues: MouthCue[];
    expression: { mood: string; intensity: number };
};
export type PlaybackSnapshot = {
    utteranceId: string; characterId: string; sequence: number;
    positionSeconds: number; playbackRate: number; state: "ready" | "speaking" | "paused" | "ended" | "cancelled" | "error";
};

export class LipSyncController {
    private performance?: SpeechPerformance;
    private snapshot?: PlaybackSnapshot;
    private receivedAt = 0;

    setPerformance(value: SpeechPerformance): void {
        this.performance = value;
        this.snapshot = undefined;
    }
    setSnapshot(value: PlaybackSnapshot): void {
        if (!this.performance || value.utteranceId !== this.performance.utteranceId) return;
        if (this.snapshot && value.sequence <= this.snapshot.sequence) return;
        this.snapshot = value;
        this.receivedAt = performance.now();
    }
    clear(): void { this.performance = undefined; this.snapshot = undefined; }
    get expression(): SpeechPerformance["expression"] | undefined { return this.performance?.expression; }
    get pose(): MouthPose {
        if (!this.performance || !this.snapshot || this.snapshot.state !== "speaking") return "rest";
        const elapsed = Math.min(0.18, Math.max(0, (performance.now() - this.receivedAt) / 1000));
        const time = this.snapshot.positionSeconds + elapsed * this.snapshot.playbackRate;
        const cue = this.performance.mouthCues.find(item => time >= item.start && time < item.end);
        return cue?.pose ?? "rest";
    }
    get active(): boolean { return this.snapshot?.state === "speaking"; }
}
