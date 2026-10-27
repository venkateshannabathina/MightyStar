/*
 * ExpressiveFace: layered, model-aware facial animation for MMD/PMX rigs.
 *
 *   const face = new ExpressiveFace(model.morphNames);       // once per model
 *   face.sentenceStart();                                    // on each new sentence
 *   const out = face.update(dt, { phase, emotion, intensity, vowels });
 *   for (const [name, w] of Object.entries(out.weights)) setMorph(name, w);
 *   applyHead(out.head); applyEyes(out.gaze);                // bone layer hooks
 *
 * Key names come from the real morph inventory (PMX-FACE-KEYS.md). Missing keys fall
 * back to a related channel, so every model degrades instead of going flat.
 */

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
export type Emotion = 'neutral' | 'happy' | 'amused' | 'surprised' | 'worried' | 'angry' | 'thinking' | 'skeptical' | 'shy';

const VOW = ['a', 'i', 'u', 'e', 'o'] as const;
const CH_LIST = [
  'browUp', 'browDown', 'browAngry', 'browWorry', 'browHappy', 'browSerious', 'browUpL', 'browUpR',
  'blink', 'halfLid', 'smileEye', 'wide', 'sharp', 'relax', 'pupilSmall', 'blush', 'winkL', 'winkR',
  'smirk', 'cornerUp', 'cornerDown', 'widen', 'frown', 'tongue', 'closed', 'wa',
  'a', 'i', 'u', 'e', 'o',
] as const;
export type Ch = typeof CH_LIST[number];

const KEYS: Record<Ch, string[]> = {
  browUp: ['上'], browDown: ['下'], browAngry: ['怒り'], browWorry: ['困る'], browHappy: ['にこり'],
  browSerious: ['真面目'], browUpL: ['上左', '上L'], browUpR: ['上右', '上R'],
  blink: ['まばたき', '両目閉じ', 'blink'], halfLid: ['じと目'], smileEye: ['笑い'], wide: ['びっくり'],
  sharp: ['ｷﾘｯ', 'キリッ'], relax: ['なごみ'], pupilSmall: ['瞳小'], blush: ['照れ'],
  winkL: ['ウィンク'], winkR: ['ウィンク右'],
  smirk: ['にやり'], cornerUp: ['口角上げ'], cornerDown: ['口角下げ'], widen: ['口横広げ'],
  frown: ['∧'], tongue: ['ぺろっ'], closed: ['ん'], wa: ['ワ'],
  a: ['あ', 'moutha', 'vrc.v_aa', 'aa'], i: ['い', 'mouthi', 'vrc.v_ih', 'ih'],
  u: ['う', 'mouthu', 'vrc.v_ou', 'ou'], e: ['え', 'mouthe', 'vrc.v_e'], o: ['お', 'moutho', 'vrc.v_oh', 'oh'],
};

const FALLBACK: Partial<Record<Ch, [Ch, number]>> = {
  cornerUp: ['smirk', 0.8], smirk: ['cornerUp', 0.8], cornerDown: ['frown', 0.8], frown: ['cornerDown', 0.8],
  browUpL: ['browUp', 0.5], browUpR: ['browUp', 0.5], sharp: ['browSerious', 0.8], browSerious: ['browAngry', 0.4],
  relax: ['smileEye', 0.6], browAngry: ['browDown', 0.7], browWorry: ['browDown', 0.4],
};

const PRESETS: Record<Emotion, Partial<Record<Ch, number>>> = {
  neutral: {},
  happy: { browHappy: 0.7, smileEye: 0.55, cornerUp: 0.7, widen: 0.25, browUp: 0.1 },
  amused: { smirk: 0.75, smileEye: 0.25, browUpR: 0.45, cornerUp: 0.35, browHappy: 0.2 },
  surprised: { wide: 0.85, browUp: 0.8, pupilSmall: 0.35, a: 0.15 },
  worried: { browWorry: 0.85, cornerDown: 0.45, frown: 0.25, halfLid: 0.1 },
  angry: { browAngry: 0.8, sharp: 0.45, browSerious: 0.3, cornerDown: 0.35, frown: 0.15 },
  thinking: { halfLid: 0.2, browUpL: 0.4, browSerious: 0.2, cornerDown: 0.1 },
  skeptical: { halfLid: 0.5, browUpR: 0.55, smirk: 0.2, cornerDown: 0.2 },
  shy: { browWorry: 0.35, browHappy: 0.35, smileEye: 0.25, cornerUp: 0.25, blush: 0.6 },
};

const MOUTH_EXPR: Ch[] = ['smirk', 'cornerUp', 'cornerDown', 'widen', 'frown'];
const EYE_SHAPE: Ch[] = ['wide', 'halfLid', 'smileEye', 'sharp', 'relax'];

export interface FaceInput {
  phase: Phase;
  emotion: Emotion;
  intensity: number;
  vowels?: Partial<Record<'a' | 'i' | 'u' | 'e' | 'o', number>>;
}
export interface FaceOutput {
  weights: Record<string, number>;
  channels: Record<Ch, number>;
  head: { nod: number; tilt: number };
  gaze: { x: number; y: number };
}

const norm = (s: string) => s.replace(/[\s_.\-]/g, '').toLowerCase();
const zero = () => Object.fromEntries(CH_LIST.map((c) => [c, 0])) as Record<Ch, number>;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export class ExpressiveFace {
  private route = new Map<Ch, { names: string[]; gain: number }>();
  private cur = zero();
  private t = 0; private phase: Phase = 'idle'; private phaseT = 0; private emotion: Emotion = 'neutral';
  private emph = 0; private aver = 0; private blink = 0; private blinkP = -1; private nextBlink = 2; private doubleBlink = false;
  private winkP = -1; private sac = 1; private sx = 0; private sy = 0; private gx = 0; private gy = 0;
  private nod = 0; private tilt = 0;

  constructor(morphNames: string[], private gains: Partial<Record<Ch, number>> = {}) {
    const byNorm = new Map<string, string>();
    for (const n of morphNames) if (!byNorm.has(norm(n))) byNorm.set(norm(n), n);
    const find = (ch: Ch): string | undefined => {
      for (const a of KEYS[ch]) { const n = byNorm.get(norm(a)); if (n) return n; }
      return undefined;
    };
    for (const ch of CH_LIST) {
      const own = find(ch);
      if (own) { this.route.set(ch, { names: [own], gain: 1 }); continue; }
      const fb = FALLBACK[ch];
      const alt = fb && find(fb[0]);
      if (fb && alt) this.route.set(ch, { names: [alt], gain: fb[1] });
    }
  }

  coverage() {
    const present = CH_LIST.filter((c) => this.route.has(c));
    return { present, missing: CH_LIST.filter((c) => !this.route.has(c)) };
  }

  emphasis(strength = 1) { this.emph = Math.max(this.emph, strength); }

  sentenceStart() {
    this.aver = 0.45; this.emph = 1;
    if (Math.random() < 0.7) this.startBlink();
    if (this.emotion === 'amused' && this.winkP < 0 && Math.random() < 0.3) this.winkP = 0;
  }

  private startBlink() { if (this.blinkP < 0) { this.blinkP = 0; this.doubleBlink = Math.random() < 0.1; } }

  update(dtRaw: number, inp: FaceInput): FaceOutput {
    const dt = Math.min(dtRaw, 0.05);
    this.t += dt;
    if (inp.phase !== this.phase) { this.phase = inp.phase; this.phaseT = 0; }
    this.phaseT += dt;
    this.emotion = inp.phase === 'thinking' ? 'thinking' : inp.emotion;

    const k = inp.phase === 'thinking' ? 1 : clamp01(inp.intensity) * (inp.phase === 'listening' ? 0.6 : 1);
    const tgt = zero();
    const pre = PRESETS[this.emotion];
    for (const ch of Object.keys(pre) as Ch[]) tgt[ch] = (pre[ch] ?? 0) * k;
    if (inp.phase === 'listening') tgt.browUp += 0.12;

    const v = inp.vowels ?? {};
    const jaw = Math.min(1, VOW.reduce((s, c) => s + (v[c] ?? 0), 0) * 1.4);
    for (const ch of MOUTH_EXPR) tgt[ch] *= 1 - 0.6 * jaw;
    tgt.browUp += 0.35 * this.emph;
    this.emph *= Math.exp(-3 * dt);
    this.aver = Math.max(0, this.aver - dt);

    for (const ch of CH_LIST) {
      if (ch === 'blink' || ch === 'winkL' || ch === 'winkR') continue;
      if ((VOW as readonly string[]).includes(ch)) {
        const target = Math.max(tgt[ch], v[ch as 'a'] ?? 0);
        this.cur[ch] += (target - this.cur[ch]) * (1 - Math.exp(-22 * dt));
      } else {
        const rate = tgt[ch] > this.cur[ch] ? 6 : 3;
        this.cur[ch] += (tgt[ch] - this.cur[ch]) * (1 - Math.exp(-rate * dt));
      }
    }

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.startBlink(); this.nextBlink = 2.2 + Math.random() * 3; }
    if (this.blinkP >= 0) {
      this.blinkP += dt / 0.16;
      if (this.blinkP >= 1) {
        if (this.doubleBlink) { this.doubleBlink = false; this.blinkP = 0; } else { this.blinkP = -1; this.blink = 0; }
      } else this.blink = Math.sin(Math.PI * this.blinkP);
    }
    let wink = 0;
    if (this.winkP >= 0) {
      this.winkP += dt / 0.4;
      if (this.winkP >= 1) this.winkP = -1; else wink = Math.sin(Math.PI * this.winkP);
    }

    const val = { ...this.cur };
    const n = Math.sin(this.t * 0.9) + Math.sin(this.t * 1.9 + 2);
    val.browUpL += Math.max(0, n) * 0.05;
    val.browUpR += Math.max(0, -n) * 0.05;
    const sum = EYE_SHAPE.reduce((s, c) => s + val[c], 0);
    if (sum > 1) for (const c of EYE_SHAPE) val[c] /= sum;
    const open = 1 - this.blink;
    for (const c of EYE_SHAPE) val[c] *= open;
    val.blink = this.blink;
    val.winkR = wink * open;

    const weights: Record<string, number> = {};
    for (const ch of CH_LIST) {
      const r = this.route.get(ch);
      if (!r || val[ch] <= 0.001) continue;
      for (const name of r.names) weights[name] = clamp01((weights[name] ?? 0) + val[ch] * r.gain * (this.gains[ch] ?? 1));
    }

    this.sac -= dt;
    if (this.sac <= 0) { this.sac = 0.7 + Math.random() * 1.6; this.sx = (Math.random() - 0.5) * 0.3; this.sy = (Math.random() - 0.5) * 0.2; }
    let tx = this.sx, ty = this.sy;
    if (this.phase === 'thinking') { tx = -0.8; ty = -0.7; }
    else if (this.aver > 0) { tx = -0.5; ty = -0.3; }
    else if (this.emotion === 'shy') { tx = -0.35; ty = 0.3; }
    this.gx += (tx - this.gx) * (1 - Math.exp(-14 * dt));
    this.gy += (ty - this.gy) * (1 - Math.exp(-14 * dt));

    let nt = 0;
    if (this.phase === 'listening' && this.phaseT > 0.6) nt = Math.pow(Math.max(0, Math.sin(this.phaseT * 3)), 3) * 0.6;
    if (this.phase === 'speaking') nt = this.emph * 0.8;
    this.nod += (nt - this.nod) * (1 - Math.exp(-10 * dt));
    const tt = this.phase === 'thinking' ? 7 : this.phase === 'listening' ? 3 : (this.emotion === 'shy' || this.emotion === 'skeptical') ? 4 : 0;
    this.tilt += (tt - this.tilt) * (1 - Math.exp(-3 * dt));

    return { weights, channels: val, head: { nod: this.nod, tilt: this.tilt }, gaze: { x: this.gx, y: this.gy } };
  }
}
