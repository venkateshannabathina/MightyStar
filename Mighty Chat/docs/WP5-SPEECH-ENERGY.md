# WP5 — speech cues and playback energy

19 October 2026. WP5 only, ready for owner review. `MIGHTY_ENERGY_JAW` remains **off by default**. It gates both the Edge cue improvements and energy generation/consumption. `MIGHTY_EXPR_V2` independently selects the Director; the energy flag also works with the legacy mixer. Other feature defaults are unchanged. WP6 has not started.

## Implementation

Edge's enhanced heuristic maps `o` to the existing `o` pose, groups `th/sh/ch/ee/oo`, and removes a silent trailing `e` in common English spellings. It preserves closures, non-Latin fallback, eight poses per word and the 4,000-cue limit. The original spelling pass remains the flag-off path. This is a spelling heuristic, not phonetic alignment; word boundaries still come from Edge.

The existing speech interface retains authenticated local `audioId` results, duration, words, mouth cues and quality. With WP5 enabled, OpenAI explicitly returns an empty words array; it still reports unknown duration as zero until playback can observe the audio. No synthetic word times or provider visemes are invented.

Native `PlaybackEngine` computes RMS over the trailing 20 ms of decoded PCM at the actual played-sample position, on its serial control queue. It never reads future samples for the envelope and does no new work on the audio callback. Snapshots retain their existing cadence and clock. The browser uses a `MediaElementSource` and 1,024-sample `AnalyserNode` on the audio element actually playing the authenticated blob. The graph is disposed on completion/cancellation; failed or blocked setup falls back to normal speech, with a bounded 250 ms resume wait. Actual WebKit playback was checked separately from Chrome's renderer capture.

Both paths convert RMS into a visual control with `min(1, sqrt(max(0, (rms - 0.008) * 6)))`. This is a normalized jaw envelope, not a calibrated loudness meter. Silence, buffering, pause, completion and cancellation produce zero energy. There is no new raw-audio persistence. Native measurement precedes output gain/mute; it describes the decoded speech advancing through playback, not microphone or acoustic speaker output.

The additive `energy` field stays inside the existing renderer playback snapshot. With the feature enabled, valid energy scales existing vowel cues; explicit lip closures retain priority. Audio-only performances use the envelope to open `あ`, or the engine's existing jaw fallback on appropriate rigs. Missing or invalid fields retain the existing cue behavior; stale energy closes after 180 ms. The Director still owns v2 morph writes. Ready audio does not speak before positive playback progress. `quality` becomes `energy-envelope` at the playback layer when an actual envelope source is available for an audio-only performance; the provider's original response remains `audio-only`.

## Evidence and checks

- [Recorded flag-off/on screen capture](wp5-evidence/openai-selected-on.webm), [decoded contact sheet](wp5-evidence/energy-contact-sheet.png), and [browser receipt](wp5-evidence/browser.json): OpenAI TTS selected through its actual adapter and authenticated TTS/audio routes, with a recorded MP3 substituted for the remote HTTP response. Three plays per flag use the real browser audio graph and actual Aalto morph-controller output. Flag off stays at jaw weight 0; enabled reaches about 0.82 and returns to closed after playback. All six performances retain version 1 and no fabricated word/mouth cues. The enabled performances report `energy-envelope`. Decoded frames were visually inspected. Chrome's system output was muted for this capture.
- [Native enabled receipt](wp5-evidence/native-energy.json) and [disabled receipt](wp5-evidence/native-energy-off.json): actual local hold endpoint, fixture STT/reply, OpenAI selection/adapter, recorded MP3 response, native decoding and muted sample-clock playback. Two phrase performances complete in each mode. Enabled samples stay finite in 0–1, vary with speech and end at zero; disabled snapshots omit energy and retain `audio-only`. These are local fixtures, not live OpenAI synthesis or physical microphone/hold-to-pixel measurements.
- [WebKit receipt](wp5-evidence/webkit.json): the actual macOS `WKWebView` runs the production analyser helper against recorded MP3 playback. It yields finite, nonzero envelope output and cleans up its graph. No provider call is involved.
- Native PCM checks cover silence, a tone burst, absence of future-sample leakage, invalid samples, saturation, out-of-range clock positions and actual MP3-decoded samples. Renderer checks cover flag independence, old snapshots/renderers, cue scaling/closures, audio-only jaw, stale/missing/invalid energy, pause/end and Director output. Browser graph checks cover flag-off allocation, cleanup, blocked resume and direct-output fallback. Edge tests cover the new hints, both generator flag modes and bounded cue timelines.
- Existing Director/face/inventory/coverage, legacy mixer, streaming/submit, memory UI, phrase scheduler/conversation, timing, provider settings, first-byte hooks, Edge worker, player speech and protocol checks pass. Coverage remains 40/46. `scripts/test-network.sh` passes authenticated transport/routes, native upload, MP3 decode and live output. Existing real Edge synthesis also passes with WP5 enabled (synthetic “Hello there.” fixture; 1.872 s audio, 0.8375 s final word boundary). No latency or naturalness improvement is claimed.
- Renderer TypeScript, isolated production webpack build and full native source typecheck pass; existing dependency/deprecation warnings remain. Generated source bundles and the installed app were not replaced. The unrelated pre-WP1 editor portrait-count failure remains documented.

The OpenAI test intentionally substitutes recorded audio because the owner has only supplied Groq + Edge as the current provider combination. It proves adapter selection and actual playback-to-jaw behavior, not remote OpenAI service availability, voice quality or latency. Azure/ARKit visemes remain optional and were not implemented without an owner-supplied Azure key.

## Reproduce

From the workspace root:

1. `bash 'Mighty Chat/scripts/test-speech-energy.sh'` runs the new and related source checks.
2. `bash 'Mighty Chat/scripts/test-speech-energy-native.sh'` builds/runs native PCM, call and actual WebKit checks. It needs normal macOS local networking/audio/UI access and briefly shows a test panel.
3. Build the isolated renderer with `node model-viewer-clean/node_modules/webpack-cli/bin/cli.js --config 'Mighty Chat/Renderer/webpack.config.cjs' --output-path /private/tmp/mighty-wp5-renderer`.
4. With Playwright available through `NODE_PATH`, run `Mighty Chat/tests/audio/check-energy-browser.cjs`, then `review-energy-clips.cjs`. They create an isolated server stage with no credential agent. Fake fixture credentials cannot be imported into saved configuration. Run browser/audio capture checks serially.

`wp5-evidence/manifest.json` records source, bundle and evidence checksums. [Spec deviations](SPEC-DEVIATIONS.md) record the code-informed choices. Stop for review before WP6.
