import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";

export type FaceChannel = "a" | "i" | "u" | "e" | "o" | "blink" | "smileEyes" | "smile" | "sad" | "angry" | "surprised";

const aliases: Record<FaceChannel, string[]> = {
    a: ["あ", "moutha", "vrc.v_aa", "aa", "a"],
    i: ["い", "mouthi", "vrc.v_ih", "ih", "i"],
    u: ["う", "mouthu", "vrc.v_ou", "ou", "u"],
    e: ["え", "mouthe", "vrc.v_e", "e"],
    o: ["お", "moutho", "vrc.v_oh", "oh", "o"],
    blink: ["まばたき", "両目閉じ", "blink", "eyesclose", "eyeclose"],
    smileEyes: ["笑い", "笑顔", "eyesmile", "happyeye", "smileeye"],
    smile: ["にやり", "微笑み", "mouthsmile", "smile"],
    sad: ["困る", "悲しい", "sad", "troubled", "worry"],
    angry: ["怒り", "angry", "mad"],
    surprised: ["びっくり", "驚き", "surprised", "surprise"],
};

function normalize(value: string): string {
    return value.toLowerCase().replace(/[\s_.\-]/g, "");
}

export class FaceRigAdapter {
    private readonly indices = new Map<FaceChannel, number>();
    private readonly owned = new Set<number>();

    constructor(private readonly model: MmdModel) {
        const morphs = model.morph.morphs;
        for (const channel of Object.keys(aliases) as FaceChannel[]) {
            const exact = aliases[channel].map(normalize);
            let index = morphs.findIndex(morph => exact.includes(normalize(morph.name)));
            if (index < 0 && !["a", "i", "u", "e", "o"].includes(channel)) {
                index = morphs.findIndex(morph => exact.some(alias => alias.length >= 5 && normalize(morph.name).includes(alias)));
            }
            if (index >= 0) { this.indices.set(channel, index); this.owned.add(index); }
        }
    }

    get capabilities(): { speech: boolean; expression: boolean; channels: Partial<Record<FaceChannel, string>> } {
        const channels: Partial<Record<FaceChannel, string>> = {};
        for (const [channel, index] of this.indices) channels[channel] = this.model.morph.morphs[index].name;
        return {
            speech: ["a", "i", "u", "e", "o"].some(channel => this.indices.has(channel as FaceChannel)),
            expression: ["blink", "smileEyes", "smile", "sad", "angry", "surprised"].some(channel => this.indices.has(channel as FaceChannel)),
            channels,
        };
    }

    set(channel: FaceChannel, weight: number): void {
        const index = this.indices.get(channel);
        if (index === undefined) return;
        this.model.morph.setMorphWeightFromIndex(index, Math.max(0, Math.min(1, weight)));
    }

    reset(): void {
        for (const index of this.owned) this.model.morph.setMorphWeightFromIndex(index, 0);
    }
}
