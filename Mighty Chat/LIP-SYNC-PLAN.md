# Lip sync and facial expression engine — proposed v1

Status: first working implementation completed. Edge word timestamps drive generated viseme cues, facial morphs are mapped at runtime, mood metadata is returned with each reply, and one audio clock synchronizes docked and desktop views. Rhubarb remains the planned precision upgrade because its 82.8 MB macOS package could not be downloaded reliably during this build.

## Outcome

The selected companion speaks with mouth movement synchronized to its actual Edge TTS audio. Eyes and eyebrows express the character’s response mood while its existing body idle continues. The same performance follows the character through Overlay, Portrait, Screensaver, Holographic, and docked views.

Perfect results cannot be guaranteed across an unverified model library. V1 should ship first on a small, visually calibrated set of characters, then expand through compatibility profiles.

## What the current project already provides

- `Renderer/companion.ts` loads PMX/BPMX models into Babylon MMD. Most models enable morphs. The installed morph controller exposes `setMorphWeight`, `setMorphWeightFromIndex`, and a morph inventory.
- Some special models explicitly disable both skeleton and morph loading. They must remain protected until separately validated; blindly enabling morphs could regress them.
- `Sources/companion-ui.js` owns speech playback through an HTML Audio element. It has no timed face controller, and asynchronous speech requests can finish out of order.
- `Sources/companion-server.cjs` generates an MP3 through the Edge TTS CLI and returns its audio ID. It does not currently return timing cues.
- The bundled Edge TTS supports word and sentence boundary metadata, with sentence boundaries as its default. Those boundaries are not phoneme or viseme timestamps.
- Desktop companions run in a separate WKWebView through `main.swift` and `desktop.html`. Existing messages carry model and view controls, not speech state.
- Actual remote character morph inventories have not yet been extracted. The aliases below are candidates, not verified claims about every character.

## Pipeline

1. User message and character personality go to Groq.
2. Backend validates a reply plus a small expression description.
3. Edge TTS produces the exact spoken reply, audio, and word boundaries.
4. A local audio analyzer produces timed mouth cues from that audio.
5. A speech coordinator waits until the performance is ready, then starts one audio player.
6. The coordinator distributes playback position and expression state to the visible renderer.
7. A model-specific face adapter combines mouth cues, emotion, and blinking into safe morph weights.

No new paid API key is required for this proposed baseline. A native audio analyzer and audio conversion support are additional packaging work.

## 1. Audit and map character faces first

Add a developer-only face inspector that lists morph name, index, type, and group relationships after model load. Test one morph at a time at low strength and reset it afterward. Record screenshots at neutral and representative weights.

Inspect at least Hu Tao, Jean, a character from another series, and one special-case model. These are pilot candidates, not yet certified compatible.

Create a profile for each appearance key and asset revision:

| Channel | Candidate aliases to inspect | Purpose |
| --- | --- | --- |
| Mouth vowels | あ, い, う, え, お; A/I/U/E/O | Open, wide, and rounded speech poses |
| Closed lips | Neutral, verified close morph | M/B/P and silence |
| Blink | まばたき, Blink; left/right variants | Natural blinking |
| Smile eyes | 笑い and model-specific equivalents | Amusement |
| Brows | 困る, 怒り, 上, 下 and equivalents | Sadness, concern, surprise |
| Mouth smile | にやり and model-specific equivalents | Mild smile between speech poses |

Names are only hints. Inspect the rendered effect before approving a mapping. Group morphs may alter several face regions or non-face features. Allowlist verified face controls; never animate arbitrary material, outfit, or visibility morphs.

Each mapping stores source indices, blend weights, upper limits, and incompatible combinations. Capability levels: calibrated speech and expressions; basic mouth only; expressions only; unsupported. Unsupported characters keep their neutral face and working audio.

## 2. Generate timing from the actual audio

Replace the one-shot Edge CLI invocation with a small Python helper using `Communicate(..., boundary="WordBoundary")`. Save the MP3 and metadata from the same synthesis request, normalize offsets to seconds, and validate monotonically ordered times.

Prototype Rhubarb Lip Sync as the local mouth-cue analyzer. Convert the exact output MP3 to supported PCM WAV, supply the exact spoken text as its dialogue hint, and request JSON cues. Its mouth categories are an intermediate representation: our face adapter converts them to 3D morph blends. Confirm packaging, Apple Silicon compatibility, license notices, latency, and accuracy before selecting it permanently.

Rhubarb offers an English recognizer and a language-independent phonetic recognizer. Evaluate non-English voices separately; do not label them equally accurate without tests. If quality is insufficient, replace the analyzer behind the same interface with a phoneme aligner. Word boundaries alone and evenly spaced text letters are insufficient for the target quality.

Fallback: an audio amplitude envelope can drive a restrained open/closed mouth when cue analysis fails. Mark this as basic sync internally. If even that is unavailable, play speech with a neutral mouth. Silence must always close the mouth.

Prepare the full short utterance before playback in v1. This adds analysis delay but avoids timing discontinuities. Sentence streaming is a later optimization after reliable cancellation and cue continuity exist.

## 3. One speech clock across every view

Add `SpeechCoordinator` beside the existing chat UI. It owns the only audio player, active character ID, appearance key, utterance ID, cancellation generation, and performance data.

Use `audio.currentTime` as the source of truth, never wall time since the network response. Deliver timestamped position snapshots with sequence numbers and play/pause state. A renderer may interpolate briefly between snapshots, but must reconcile to fresh audio time and freeze on stale state. Clocks in different WKWebViews cannot be assumed to share an origin.

Route the same validated speech payload directly to the docked iframe and through the native host to `desktop.html`. A newly loaded view announces readiness, then receives the current performance and position. It must not start another audio player or restart the utterance.

State lifecycle: idle → preparing → ready → speaking ↔ paused → ended/cancelled/error → idle.

On character switch, new speech, app close, or cancellation: invalidate pending work, stop old audio, discard late responses, and reset mouth weights. Camera mode changes preserve the active utterance. Replays receive fresh utterance IDs. Release blob URLs using the URL belonging to that playback, not a mutable global reference.

## 4. Contextual expressions

Ask Groq for a validated structure containing spoken reply text and an expression intent: neutral, happy, amused, sad, concerned, or surprised; intensity from 0 to 1. Start with one mood per reply. Keep metadata out of visible chat and spoken text. If parsing fails, preserve usable reply text with neutral animation.

Use the message context and character personality together. Kindness can lead to a smile; an actual joke to amusement; a direct insult to a subdued or hurt reaction. A quoted insult or discussion of someone else’s sadness must not automatically trigger the same reaction. These are performed character expressions, not claims that the AI experiences feelings.

Blend gently into a mood, hold during the relevant reply, then decay toward neutral. Suggested initial tuning: 200–400 ms onset, moderate intensity, and a 1–3 second release. These values need visual calibration.

Edge TTS does not provide a guaranteed natural laugh or arbitrary emotional delivery. V1 can show an amused face while delivering a playful response. Add audible laughter only with an appropriate actual sound segment and cues derived from that segment; do not animate laughing over unrelated speech.

## 5. A single face mixer

Create `FaceRigAdapter`, `LipSyncController`, `ExpressionController`, and `FaceMixer` under `Renderer/face/`.

The mixer alone writes final morph weights once per frame in a verified position before the MMD runtime applies morphs. Confirm runtime observer order in a small test; adding multiple competing render callbacks risks overwritten results.

Rules:

- Speech owns mouth articulation during playback. Smile mouth weights are attenuated while speaking, especially during closed-lip sounds.
- Mood primarily owns eyes and eyebrows. Blinking blends with, rather than adds fully to, eyelid expressions.
- Smooth adjacent speech poses using short transitions without smoothing away brief closures.
- Clamp weights to per-model limits and constrain competing mouth blends.
- Existing body idle keeps owning the skeleton. No new bone animation in the first version.
- Reset only owned facial channels when speech ends or models unload. Respect reduced-motion settings for optional expressions.

## Data contract

`SpeechPerformance`: version, utteranceId, characterId, appearanceKey, audioId, durationSeconds, voice, locale, quality, mouthCues[{start,end,pose}], expression{mood,intensity}.

`PlaybackSnapshot`: utteranceId, characterId, sequence, positionSeconds, playbackRate, state.

Validate identity, finite numbers, bounds, cue order, sizes, and allowed pose/mood values. Use the existing authenticated backend. Check message origin and source at iframe boundaries. Never forward the Groq key into a renderer. Keep temporary audio and timing files under the same cleanup policy.

## Delivery order and release checks

1. **Face audit:** build the inspector and approve profiles on pilot characters. Exit: neutral, vowels, blink, smile, and sad poses visibly verified where supported.
2. **Speech prototype:** Edge metadata plus local mouth analysis, tested in portrait view. Exit: closures, vowels, pauses, and end-of-audio reset match recorded speech.
3. **All-view synchronization:** add coordinator, native relay, readiness handshake, cancellation, and replay. Exit: rapid camera switches never duplicate audio or restart lip motion; slow obsolete TTS responses cannot speak.
4. **Mood layer:** contextual expression metadata, subtle blends, and personality-aware reactions. Exit: happy, joking, sad, and ambiguous conversations produce sensible faces without damaging mouth sync.
5. **Compatibility expansion:** certify additional appearances and voices; profile performance on the target Mac before shipping broadly.

Measure audio-to-visible-mouth timing using synchronized recordings. Initial acceptance target: most marked speech events within about 80 ms, no growing drift during a 60-second utterance, and mouth reset within 100 ms after stop. These are targets, not achieved results. Track cue correctness separately: a well-timed wrong mouth shape still fails.

Test P/B/M closures, F/V, rounded vowels, fast and slow replies, long pauses, laughter-like text, repeated replay, pause/resume, failed network requests, missing morphs, and model switching mid-speech. Check facial frame cost against a target budget of 2 ms on the target Mac. Maintain the current working app as a rollback build and gate the new engine until these checks pass.

## Sources

- Project inspection: `Renderer/companion.ts`, `Sources/companion-ui.js`, `Sources/companion-server.cjs`, `Sources/main.swift`, `Sources/desktop.html`, bundled Edge TTS, and installed Babylon MMD morph controller declarations.
- Rhubarb capabilities and formats: https://github.com/DanielSWolf/rhubarb-lip-sync
- Edge timing implementation: https://github.com/rany2/edge-tts/blob/master/src/edge_tts/communicate.py
- Edge emotional voice limitations: https://github.com/rany2/edge-tts/discussions/176
