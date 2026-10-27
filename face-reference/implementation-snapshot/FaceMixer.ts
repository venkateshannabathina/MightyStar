import { FaceRigAdapter, type FaceChannel } from "./FaceRigAdapter";
import { ExpressionController } from "./ExpressionController";
import { LipSyncController, type PlaybackSnapshot, type SpeechPerformance } from "./LipSyncController";

const mouthTargets: Record<string, Partial<Record<FaceChannel, number>>> = {
    rest: {}, closed: {}, a: { a: 0.82 }, i: { i: 0.62 }, u: { u: 0.7 }, e: { e: 0.68 }, o: { o: 0.78 }, fv: { i: 0.34 },
};
const channelSpeeds: readonly (readonly [FaceChannel, number])[] = [
    ["a", 18], ["i", 18], ["u", 18], ["e", 18], ["o", 18],
    ["blink", 8], ["smileEyes", 8], ["smile", 8], ["sad", 8], ["angry", 8], ["surprised", 8],
];

export class FaceMixer {
    private readonly lip = new LipSyncController();
    private readonly expression = new ExpressionController();
    private weights: Partial<Record<FaceChannel, number>> = {};

    constructor(private readonly rig: FaceRigAdapter) {}
    setPerformance(value: SpeechPerformance): void { this.lip.setPerformance(value); this.expression.set(value.expression); }
    setSnapshot(value: PlaybackSnapshot): void {
        this.lip.setSnapshot(value);
        if (["ended", "cancelled", "error"].includes(value.state)) this.expression.release();
    }
    clear(): void { this.lip.clear(); this.expression.release(); this.rig.reset(); this.weights = {}; }
    update(delta: number): void {
        this.expression.update(delta);
        const mouth = mouthTargets[this.lip.pose];
        const expressions = this.expression.weights;
        const speaking = this.lip.active;
        for (const [channel, speed] of channelSpeeds) {
            const previous = this.weights[channel] || 0;
            let desired = (expressions[channel] ?? mouth?.[channel]) || 0;
            if (channel === "smile" && speaking) desired *= 0.25;
            const next = previous + (desired - previous) * Math.min(1, delta * speed);
            this.weights[channel] = next;
            this.rig.set(channel, next);
        }
    }
}
