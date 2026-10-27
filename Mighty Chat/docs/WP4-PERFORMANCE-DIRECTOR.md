# WP4 — Performance Director integration

19 October 2026. WP4 only; awaiting owner review. `MIGHTY_EXPR_V2` remains off by default. Timing additionally requires `MIGHTY_DEBUG_PERF`; tagged sentence intent requires `MIGHTY_STREAM_CHAT`. No WP5 energy, speech-generator changes, gesture execution or Face Lab.

## Behavior

`PerformanceDirector` owns the v2 face pass. Listening starts at local hold/typing events, commit enters thinking, and speaking requires positive progress on the existing playback clock. Stream arrival alone cannot speak. Sentence intent follows the existing Edge word boundaries and phrase metadata, with once-per-sentence blink/emphasis/nod and a bounded gesture queue. Both response and audio completion precede a 0.8-second release. Cancel/error/interrupt enter idle immediately with normal expression smoothing. Turn identities, generation fences and snapshot sequence checks reject stale output.

The adapter writes exact original morph names. Legacy expression/lip writers are bypassed only with the flag enabled. Head/eye offsets restore the previous base before evaluating idle and apply against the fresh base afterwards, including paused motion; 1,000-frame tests reject accumulation. Eye binding uses explicit Japanese/English names. Missing face controls remain unmapped; missing eyes skip gaze. The Hailey GLB test exercises head-only output without invented GLB facial controls. Trusted SHA-256 appearance-key calibration files load through the adapter; absent files use defaults. No tuned files are shipped before WP8.

Native call phase messages and typed-chat phase messages are additive to the existing bridge. The host/desktop relay phases on view creation; completed performances are not replayed as unfinished turns. Call v2 and speech v1 remain unchanged. The existing authenticated status endpoint supplies the renderer flag, failing closed when unavailable.

## Rendered evidence and measurements

Chrome rendered the production bundle in an isolated local server. [Aalto](wp4-evidence/01-emotion-grid.png), [Blackbird / EB–EL](wp4-evidence/07-emotion-grid.png), and [Lucia / sparse](wp4-evidence/24-emotion-grid.png) each have nine captured emotions at intensity 0.9. All grids were visually inspected. Aalto has clear brow/mouth changes; Lucia has fewer independent shapes; Blackbird's authored hair/hat occlude an eye and much of the brows, limiting visual assessment. Accessories were retained. This is three-model QA, not a visual-quality claim for all 50 rigs.

[Phase footage](wp4-evidence/phase-fixtures.webm) records listening, thinking, scripted sentence changes and micro motion. Fixed fixture RNG selects sentence blinks, double blinks and amused winks; it does not estimate their probabilities. Unit checks verify the probability branches. The thinking screenshot was inspected after correcting MMD coordinate signs so gaze points screen-up-left and nod pitches downward.

[Rendering receipt](wp4-evidence/rendering.json) contains three correlated onset trials per model, measured at the mapped morph-write hook using WP0 clock translation. All nine pass the <100 ms listening and <150 ms thinking gates after adding both clients' clock uncertainties. Values near zero should be interpreted within measurement uncertainty; earlier calibration runs included a small negative translated delta inside that uncertainty. These are controlled browser input-to-renderer measurements; they exclude physical key delivery, microphone latency, and the Swift-to-WebKit bridge. The native check below separately establishes that actual local hold events reach the bridge; it does not measure a physical-hold-to-pixel deadline.

| Model (3 trials each) | Maximum listening + uncertainty | Maximum thinking + uncertainty |
|---|---:|---:|
| Aalto | 17.54 ms | 15.27 ms |
| Blackbird | 8.26 ms | 13.62 ms |
| Lucia | 15.28 ms | 11.63 ms |

The 30-second Aalto speaking script samples actual MMD morph-controller weights each animation frame, with sentence changes and existing vowel cues. The final run recorded 1,801 frames; longest intervals without a >0.001 change were brows 199.9 ms, eyes 1037.0 ms and mouth 0.0 ms, all below three seconds. The standalone three-rig scripts additionally retain 90 varying three-second windows. No claim is made that audio-only speech without word/mouth data already has a moving jaw; that is WP5.

[Blink comparison](wp4-evidence/blink-comparison.json), [decoded contact sheet](wp4-evidence/blink-contact-sheet.png), and `blink-legacy.webm` / `blink-v2.webm` compare seven seconds of actual Aalto idle output with the same fixed RNG. Legacy's smoothed peak was 0.264; v2 reached 0.998. The contact sheet shows v2 closing and reopening clearly, whereas legacy barely closes. Retain the reference's approximately 160 ms unsmoothed cycle. This is an engineering visual choice on one model, not a human preference study or an isolated duration-only A/B.

## Checks

- `scripts/test-performance-director.sh`: inventory checksum; renderer TypeScript; 36,000 engine frames, no invalid/unknown weights; deterministic RNG, aliases/calibration and coverage 40/46; Director states, playback-aligned sentence changes, queued-only gestures, completion/cancellation, stale turns and snapshots, audio-only/body-only fallback and fresh-base bones. Existing mixer, renderer timing, player speech, tagged conversation, protocol, conversation, phrase scheduler, streaming submit/UI, memory UI and idle bridge checks pass.
- `tests/backend/check-stream-chat.cjs` and `scripts/test-network.sh` pass: authenticated chat/call routes, rollback flag combinations, native WebSocket upload, decode and live audio output. The existing packaged backend is checked separately from changed source.
- `tests/ui/check-player-view.cjs` passes against the existing default-off renderer: actual Hailey, player controls, subtitle timing, stale turns, character switching and 320–700 px layouts. `tests/face/check-body-fallback.cjs` additionally checks actual Hailey with the new bundle, flag off/on ([receipt](wp4-evidence/body-fallback.json)).
- `tests/face/check-director-native.swift` / `run-native-check.cjs` pass with the flag off and on: actual local hold endpoint, fixture STT/reply, real MP3 decoder, muted playback and positive sample clock, two phrase performances, sentence metadata and final completion. [Enabled receipt](wp4-evidence/native-bridge.json), [disabled receipt](wp4-evidence/native-bridge-off.json), and native timing JSONL retain the results. No live provider, saved key, physical microphone or audible speaker test is claimed for this fixture.
- Full native source typecheck and isolated production webpack build pass with existing deprecation/dependency warnings. No generated source bundle or installed application was replaced. The unrelated pre-WP1 portrait-count failure remains documented; this package does not claim to fix it.

## Reproduction

From the workspace root, run `bash 'Mighty Chat/scripts/test-performance-director.sh'`. Build the isolated renderer using `node model-viewer-clean/node_modules/webpack-cli/bin/cli.js --config 'Mighty Chat/Renderer/webpack.config.cjs' --output-path /private/tmp/mighty-wp4-renderer`.

With Playwright available through `NODE_PATH`, run `tests/face/check-director-rendering.cjs`, then `check-body-fallback.cjs`, `check-blink-comparison.cjs` and `review-director-clips.cjs` (all under `Mighty Chat/`). Run browser/GPU checks serially. Rendering creates the isolated server stage under `build/wp4-render-check`; the existing validated character-cache loader may fetch missing resources only from its normal asset origin. No AI provider is involved. Calibration 404s are expected with no tuned file.

For the native fixture, compile `check-director-native.swift` with the existing native Call/Audio/BackendConnection sources, `build/AudioRing.o`, Cocoa/AVFoundation and `-D MIGHTY_VOICE_TESTING`, then run `tests/face/run-native-check.cjs` after the rendering stage exists. Its fake provider credential is local fixture data; the isolated stage has no credential agent and cannot import it into saved credentials. Local-server and native audio checks require ordinary local networking/audio access.

The evidence manifest records source and isolated bundle checksums. Deviations and measurement limits are recorded in [SPEC-DEVIATIONS.md](SPEC-DEVIATIONS.md). WP5 has not started.
