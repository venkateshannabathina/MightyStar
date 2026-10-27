/** Shared face tuning. Times are seconds except incoming playback clocks (ms). */
export const FACE = Object.freeze({
    maxCues: 4096, maxWords: 1000, maxDuration: 600,
    anticipation: .025, blend: .045, staleClock: .25, extrapolate: .1,
    attack: .025, release: .055, emotionEase: .24, microEase: .18,
    maxMouth: .85, speakingCorners: .24, idleMouth: .18,
    blinkMin: 2.8, blinkMax: 6.2, blinkDuration: .19,
    microMin: 2.8, microMax: 5.8, microDuration: 1.1, microStrength: .095,
    reactionDuration: 3.5, reactionEase: .16,
    happyEyes: .6,
    doubleBlinkChance: .12, doubleBlinkGap: .13, phaseTimeout: 20,
    maxDt: .1, rmsFloor: .008, rmsGain: 6,
});
