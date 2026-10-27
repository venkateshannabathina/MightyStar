export type Mood = "neutral" | "happy" | "amused" | "sad" | "concerned" | "surprised";

export class ExpressionController {
    private mood: Mood = "neutral";
    private target = 0;
    private amount = 0;
    private blinkAmount = 0;
    private blinkClock = 2 + Math.random() * 2;

    set(value: { mood: string; intensity: number } | undefined): void {
        const allowed: Mood[] = ["neutral", "happy", "amused", "sad", "concerned", "surprised"];
        this.mood = allowed.includes(value?.mood as Mood) ? value!.mood as Mood : "neutral";
        this.target = this.mood === "neutral" ? 0 : Math.max(0, Math.min(0.75, Number(value?.intensity) || 0.45));
    }
    release(): void { this.target = 0; }
    update(delta: number): void {
        const speed = this.target > this.amount ? 5 : 1.1;
        this.amount += (this.target - this.amount) * Math.min(1, delta * speed);
        this.blinkClock -= delta;
        if (this.blinkClock <= 0) {
            const phase = Math.max(-1, this.blinkClock / 0.11);
            this.blinkAmount = phase > -0.5 ? 1 + phase * 2 : -phase * 2 - 1;
            if (this.blinkClock < -0.11) { this.blinkClock = 2.2 + Math.random() * 3.4; this.blinkAmount = 0; }
        }
    }
    get weights(): Record<string, number> {
        return {
            blink: this.blinkAmount,
            smileEyes: ["happy", "amused"].includes(this.mood) ? this.amount * 0.78 : 0,
            smile: ["happy", "amused"].includes(this.mood) ? this.amount * 0.58 : 0,
            sad: ["sad", "concerned"].includes(this.mood) ? this.amount * 0.72 : 0,
            surprised: this.mood === "surprised" ? this.amount * 0.7 : 0,
            angry: 0,
        };
    }
}
