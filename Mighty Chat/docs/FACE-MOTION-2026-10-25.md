# Low-latency face motion

The main renderer uses one compositor for playback-driven speech, emotion, blinking and subtle idle detail. It adds no model downloads, GPU inference, network call or forced-alignment stage to speech generation. It does not change body animation or chest/jiggle simulation.

## Chosen method

| Available input | Mouth driver | Timing confidence |
| --- | --- | --- |
| Explicit timed mouth cues | Coarticulated canonical visemes | Provider timing; needs appropriate pose mapping |
| Edge TTS word boundaries | Local grapheme-to-mouth estimates inside measured word intervals | Word timing is real; phoneme positions are estimates |
| Pocket/OpenAI or untimed voice | Real PCM RMS drives mapped A/jaw opening | Actual audio activity, without claiming phoneme recognition |
| No playable audio or unsupported facial rig | No speech-mouth motion | Expressions/idle work where the asset has suitable keys |

This is a fit for this app's latency constraint, not universally best or perfect lip reading. Exact consonant timing needs provider visemes or an audio phoneme model. The estimator handles a small set of English patterns and kana; unsupported scripts fall back to audio energy. It is not a general multilingual pronunciation model.

Timed provider visemes are the preferred future upgrade. Microsoft's [official documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme) describes audio-offset visemes and synchronization with audio chunks. Azure is not added as a required service. [Rhubarb](https://github.com/DanielSWolf/rhubarb-lip-sync) analyzes existing recordings; that extra recognition stage is not added to live playback. The [Oculus Lipsync guide](https://developers.meta.com/vr/documentation/unreal/audio-ovrlipsync/) marks the old plugin end-of-life and directs developers toward Quest-specific support, which does not fit this Mac app's stack.

## Flow

1. Existing mood drives expressions on typed replies and native speech chunks. No additional LLM facial-direction call is made.
2. TTS returns audio plus any word/viseme timestamps. Audio starts normally; face planning does not require another recognition pass.
3. Browser speech uses the HTML media clock and a 1024-sample Web Audio analyser. Native speech uses the player's decoded sample clock and trailing 20 ms RMS. Both use the existing 50 ms playback snapshots. Native leading-silence trimming shifts timestamps before transmission.
4. `FaceTimeline.ts` builds a bounded cue schedule once per utterance. Provider cues win; word estimates preserve measured pauses. Bilabials suppress opening. Vowels blend over 45 ms with a 25 ms anticipation window.
5. `FaceMotion.ts` composes weights per rendered frame. `AppearanceEditor.animateFace()` is the sole runtime morph writer and skips unchanged values.

No face work runs on the audio callback. Clock extrapolation is capped at 100 ms; after 250 ms without fresh playback data the mouth releases. These are tuning bounds, not measured end-to-end response latency guarantees.

## Layer ownership

| Layer | Owns | Collision policy |
| --- | --- | --- |
| Saved Neutral | Resting face, non-face keys | Restored when speech ends; authored settings remain intact |
| Emotion | Brows/eyelids, mouth styling at rest | Broad lower-face shapes are suppressed during a speech session |
| Speech | Jaw/vowel shapes | Sum normalized to 0.85, including after smoothing |
| Mouth corners | Small smile/frown controls | At most 24% expression strength during speech; vowel timing remains exclusive |
| Blink | Eyelid closure | Maximum rather than additive closure; other eye expressions fade during blink |
| Idle detail | Small brow variations, supported eye-look shapes | Never opens the speech mouth or rotates body bones |
| Manual preview | Authored face preview | Overrides automatic motion and suspends speech-mouth activity |

Emotion stays in the brows/eyes while the mouth articulates. Angry dialogue does not randomly smile. Micro detail is procedural animation, not an inference of hidden feelings. Blinks vary between 2.8–6.2 seconds with occasional doubles; small brow changes occur every 2.8–5.8 seconds. Recognized brow shapes vary by a small additive pulse, including on top of a base expression. Tiny gaze shifts use explicitly recognized eye-look morphs only. Missing shapes are omitted safely.

Idle motion is not baked into models or saved to Neutral. Unknown helper/body/impulse morphs are not repurposed as face actions. Existing user presets take priority over suggested defaults.

## Lifecycle cases

- Ready/buffered audio does not open the mouth; playback must start.
- Silence energy gates timed vowels; measured word gaps close the mouth.
- Pause, buffering, stale clocks, interruption and terminal events release speech shapes.
- Character/appearance/utterance IDs, sequence numbers, sessions and generations fence delayed events.
- Character changes clear speech and start that character's idle face. Live-action pause/manual preview restores the authored rest face.
- Preview/body-pause suspension retains the live utterance clock, so resuming can join ongoing audio at its current position. Actual cancellation retires it.
- Renderer/view recreation replays current metadata and the actual playback snapshot without restarting audio.
- Speech-disabled typed replies still update emotion.
- Browser audio analysis reuses one AudioContext and disconnects old graphs. A blocked context leaves normal HTML audio usable; untimed lip motion may be unavailable until audio analysis is allowed.

## Asset support

Real-rig checks passed for Lynae (191 accessible keys), female Rover (113), Evelyn (49) and Lucy (176). Suggested mappings use stable per-model face IDs and remain editable in the Facial editor.

**The bundled Hailey GLB has no morph targets or jaw bone.** Its face and mouth-interior meshes exist, but there is no mouth deformation rig. The controller reports unavailable mouth capability and leaves the mesh alone. Hailey needs an updated asset with authored facial morphs or a suitable facial skeleton. No fake mesh scaling or body-bone deformation is used.

## Validation

- Deterministic tests: provider/word/RMS paths, kana/unsupported text, timing gaps, silence/prebuffering, stale clocks, pause/cancel, ordering and identity fences, vowel normalization, upper-face expression, blink/micro detail and preview priority.
- Local 14-key synthetic benchmark: approximately **0.005 ms/sample**, over 20,000 samples. This excludes rendering, transport, TTS and inference; it is not end-to-end latency.
- Real WebGL: all five assets loaded; four animated bounded weights and cancelled cleanly, while Hailey reported the unsupported rig safely. Evidence is in `build/face-motion-review/`.
- Native PCM: no future-sample jaw opening, silence closure, finite/clamped energy and actual MP3 decoding passed.
- Actual WKWebView analyser: recorded MP3 playback passed, peak energy approximately 0.75, graph cleanup verified.
- Existing clock/volume/view-continuity, phrase-scheduler, character-editor, expression-library, body-pose and conversation/mind tests passed. Renderer and native app compile successfully.

Run `node 'Mighty Chat/tests/animation/check-face-motion.cjs'` plus the existing `check-appearance-editor.cjs`, `check-facial-expressions.cjs` and `tests/ui/check-player-speech.cjs` checks.

Provider response time is still determined by the selected LLM/TTS. This update removes an extra lip-sync inference stage; it does not eliminate provider latency.

The workspace-root `Mighty Chat.app` contains the compiled native audio/face bridge and renderer. It is signed with the existing persistent identity. Previous native/resources are recoverable from `backups/face-motion-before-20261025-122509/resources.tgz`.
