# Mighty Chat — live conversation architecture and implementation plan

Date: 21 September 2026. Status: proposed design based on source inspection; no application changes made or live latency benchmarks performed for this plan.

## 1. Decision

Build one interruptible call session with three independent responsibilities:

1. **Native Swift owns microphone capture, local speech detection, interruption, audio output, and the playback clock.**
2. **The local Node backend owns transcription requests, streamed language generation, phrase scheduling, and TTS jobs.**
3. **Babylon renders the character using playback-timed mouth and expression data.** It never owns audio or decides when a conversation turn ends.

Keep the current macOS shell, character creator, personality data, view modes, Babylon/MMD loader, and face-controller structure. Replace the speech orchestration and extract the mixed application logic gradually. Do not rewrite the whole UI or introduce separate network services for each feature.

The first implementation keeps Groq and Edge to minimize migration risk. Groq transcription after a detected utterance is a **batch STT adapter**, even though microphone capture is continuous. Groq replies stream; Edge initially synthesizes complete short phrases with the next phrase prepared during current playback. These are explicit baseline limitations, not a claim of true streaming STT or sample-streaming TTS. Provider interfaces allow upgrades without rewriting the call or avatar.

The product is ready only when measured conversation quality passes the release gates. If Edge phrase preparation or batch STT misses those gates, replace that adapter; adding threads cannot remove provider latency.

## 2. What the source actually contains

Paths below are relative to `Mighty Chat/` unless stated otherwise.

| Location | Observed behavior | Action |
|---|---|---|
| `Sources/index.html:10` | Phone button only shows “Voice calls aren’t connected…” | Connect to a call controller; keep camera controls separate |
| `Sources/index.html:31`, `sendMessage` | Inline script owns history, pending requests, persistence, rendering, and automatic speech | Extract chat/history adapters; route all speech through one output owner |
| `Sources/companion-ui.js:187–237` | Global audio state; full TTS request, full MP3 fetch, then HTML Audio; generation counter discards some late results | Replace with native playback plus explicit session identities and cancellation |
| `Sources/companion-server.cjs`, `chat` | Waits for full Groq JSON reply with mood before returning | Keep old text-chat endpoint during migration; add a streamed call pipeline |
| Same file, `runEdgeTts` / `tts` | Starts Python per request and waits for MP3 and metadata files | Introduce a warm, cancellable TTS worker and bounded phrase preparation |
| `Sources/edge-tts-performance.py` | Real word boundaries, but mouth shapes inferred from written letters divided evenly inside each word | Label as approximate; replace precision path with audio/phoneme-derived cues |
| `Renderer/face/*.ts` | Separate rig, mouth, expression, mixer classes already exist | Keep and strengthen; this is useful architecture |
| `Renderer/face/LipSyncController.ts` | Linear cue search every frame; extrapolation capped at 180 ms but stale snapshots can leave a speaking pose active indefinitely | Add sample-based cue cursor, stale timeout, session/generation checks |
| `Renderer/face/FaceRigAdapter.ts` | Alias matching, including substring fallback for expressions; no calibrated profiles | Add model-specific allowlists, morph conflict rules, capability levels |
| `Renderer/companion.ts` | Face update runs before runtime observer via insert-first; special models disable morphs/skeletons | Preserve order and special cases; test before changing |
| `Sources/main.swift` | Native shell, Keychain, local-server lifecycle, separate desktop WKWebView, speech relay | Extract host responsibilities and add native audio/session modules |
| `Sources/desktop.html` | Relays performance and snapshots into its own renderer | Keep as a presentation subscriber; add versioned snapshot hydration |
| `Mighty Chat.app/Contents/Info.plist` | Minimum macOS 12; no microphone usage description | Add source-controlled packaging metadata and microphone permission flow |
| `Renderer/webpack.config.cjs` | Uses dependencies from sibling `model-viewer-clean`; outputs into `Sources/Companion` | Preserve initially; generated bundles are never hand-edited |

Other source-level risks to fix during migration:

- A typed reply finishing after selection changes can still invoke `speakCharacterReply` for the old character. Validate ownership at dispatch and playback, not only before rendering text.
- Current client cancellation does not cancel the server's TTS child process. Discarding a late result protects the UI but still wastes work.
- `ExpressionController.set` treats explicit zero intensity as its fallback due to `||`; preserve zero through validation.
- Mouth smoothing can blur brief closures. Blink and smiling-eye controls can combine without calibrated per-rig conflict limits.
- Last word end is used as audio duration in Python. Actual decoded audio sample count must determine playback duration.
- Existing `LIP-SYNC-PLAN.md` mixes original pre-implementation descriptions with a completed-status header. Use this document for call architecture; preserve the older document as historical context.

### Prototype inspected

Task: **Build standalone live voice loop**. Source directory:

`<home>/Documents/Codex/2026-09-21/referenced-chatgpt-conversation-this-is-an/live-conversation-prototype`

Read `public/app.js`, `server/index.js`, and `README.md`. Actual implementation is Node HTTP despite the README mentioning Fastify.

**Reuse concepts:** streamed Groq tokens, phrase boundaries, per-turn IDs, immediate output stop, configurable provider models.

**Do not copy the implementation wholesale:**

- It is hold-to-talk. There is no automatic VAD/endpointing; recording is uploaded after release.
- The promise chain includes both synthesis and playback, so preparation of the next phrase waits for the previous phrase to finish playing.
- Pausing and clearing an Audio element does not guarantee settlement of the promise waiting for `ended`; cancellation needs an explicit settlement path.
- Shared abort/player globals can be cleared by an older task's `finally` after a newer task starts.
- Client TTS cancellation does not terminate the server's synthesis subprocess; STT fetch has no client abort signal.
- It lacks character history, rig synchronization, call lifecycle, and the main app's authenticated backend boundary.

These findings are from code review, not reproduced runtime failure claims.

## 3. Runtime layout

```text
Chat / Call UI ── commands ──> Native CallSessionCoordinator
        ^                           │
        └──── state snapshots ──────┤ owns session + generation
                                    │
Microphone -> Native AudioHost -> VAD / endpoint worker
                 │                      │
                 │                 utterance PCM
                 │                      v
                 │           authenticated local connection
                 │                      │
                 │            Node ConversationSession
                 │              STT -> streamed LLM
                 │                       │
                 │                 PhraseScheduler
                 │                       │
                 │              warm Python Edge worker
                 │                       │
                 └── PlaybackEngine <── audio + word/cue metadata
                          │
                  actual playback clock
                          │
                    AvatarRelay
                     /        \
              docked view   desktop view
                     \        /
                  FaceMixer per view
```

**One owner per decision:** Swift is authoritative for call lifecycle, generation changes, mute, output stop, and what was played. Node mirrors that identity and owns provider jobs for the accepted turn. UI and renderer consume state; neither starts provider work independently.

**Concurrency does not mean a thread per feature.** Use the native audio callback, a serial native call-control executor, a VAD/analysis worker, Node asynchronous I/O, one persistent Python TTS process, and each existing renderer's animation loop. Start with one TTS synthesis job in flight. It overlaps current playback; increase to two only if benchmarks justify cost and ordering complexity.

Audio callbacks only copy bounded samples into preallocated buffers and update counters. No JSON, locks that can block, logging, network calls, model inference, file I/O, or UI work there. Serialize graph changes and player operations on the audio-control executor. Publish observable UI state on the main thread.

Use a direct native-to-Node local WebSocket with the existing random backend token in the native handshake header. Do not move microphone PCM through WKWebView JavaScript or base64 it through the native UI bridge. Bind only to loopback. Keep existing HTTP routes for text-chat migration and bounded phrase audio downloads.

The top-level trusted file UI sends only commands and character/history snapshots to Swift. Avatar frames receive no API keys or backend token. Keep current file URL/storage identity to preserve existing localStorage.

## 4. Call behavior and state

The phone button begins a call for the selected character. Capture the character ID, appearance revision, voice, language, personality, and initial history into an immutable session configuration. Repeated clicks while connecting must not create another session.

Use separate state dimensions instead of one giant enum:

```text
lifecycle: idle | connecting | active | reconnecting | ending | failed
input:     muted | quiet | speaking | finalizing
output:    idle | generating | buffering | playing
```

Input can be `speaking` while output is `playing`; that overlap causes barge-in. “Listening” is a UI label, not a reason to disable capture during assistant speech. Render labels from the state snapshot with priority: failure/reconnect, mute, user speaking, assistant playing, generating, quiet listening.

Call startup order:

1. Validate selection, backend health, provider configuration, and required packaged runtimes.
2. Ask macOS for microphone permission when the user starts the first call.
3. Cancel old read-aloud output; allocate session ID and generation zero.
4. Open authenticated transport, initialize audio graph and VAD, warm TTS worker.
5. Enter `active` only once capture, transport, and required providers are ready. Begin call timer now. Initial behavior is quiet listening; no unsolicited greeting.
6. Load/show the character concurrently. A slow or unsupported avatar must not block usable audio.

| Action | Required behavior |
|---|---|
| Mute | Stop forwarding/capturing user utterances; discard uncommitted input and pre-roll. Current assistant playback may finish. Never transcribe muted speech |
| Unmute | Reset VAD and input buffers; resume with fresh audio |
| Hang up | Stop audible output locally first, invalidate generation, stop capture, cancel jobs, clean buffers, persist final status |
| Change view | Continue the same call and clock; hydrate the newly ready renderer |
| Change character | End the old call before selecting the new character; never transfer audio/history ownership implicitly |
| Edit voice/personality | Freeze for current call; apply next call. Explicit future live edits require their own safe boundary |
| Type during call | Treat submitted text as a new user turn: interrupt current output, commit text, use the same pipeline |
| Replay saved reply during call | Disable replay to avoid a second output source; explain in button state |
| Close app / system sleep | End call and release microphone; wake does not silently restart capture |
| Audio route changes | Stop output and invalidate its clock mapping; rebuild graph, then resume listening after health checks. Never replay interrupted content automatically |
| Backend disconnect | Stop current output, cancel generation, show reconnecting; no accumulating/uploading microphone backlog while disconnected |

UI: keep chat history visible; show a compact call bar with character, duration, status, mic level, mute, and red End call. Show a live transcript when supported; mark partial text provisional. Keep captions readable while model loading or avatar fallback is active. Provide accessible names and keyboard-operable controls. Phone and camera remain separate controls.

## 5. Capture, speech detection, and STT

Use AVAudioEngine input/output with voice processing where supported by the target route. Route assistant playback through that same native graph so echo processing can be evaluated against real output. This must be tested on the target Mac; simply enabling a flag does not prove speakerphone barge-in works. Apple documents the voice-processing engine path.[1]

Native capture uses the negotiated device format. Convert off the real-time callback to mono 16 kHz PCM for baseline VAD and STT. Preserve sample positions across conversion. Recommended VAD implementation candidate: bundled Silero ONNX through a pinned native ONNX runtime; validate packaging, architecture support, license, model checksum, and inference latency in the audio spike before adopting it. Follow the selected model's frame/context requirements; do not arbitrarily feed 20 ms frames to a model that expects another window.[2]

Initial tuning values, all configurable and unverified:

- Keep 250 ms pre-roll so speech onset and initial consonants survive detection.
- Confirm onset after approximately 100–150 ms of consistent speech probability; use hysteresis, not a raw volume threshold.
- Endpoint after 450 ms quiet; extend toward 700 ms for hesitant speech in later tuning. Do not claim a semantic end-of-turn detector exists in v1.
- Minimum speech region around 150 ms; preserve brief valid words such as “yes” and “stop.”
- Cap an utterance at 30 seconds and 2 MB PCM. On cap, finalize explicitly and continue with a new input segment; do not silently clip samples.
- Distinguish speech detection from transcription: interruption must not wait for a word to be recognized.

**Baseline `GroqBatchSTT`:** send one bounded WAV utterance at endpoint using `whisper-large-v3-turbo` configuration, with language hint when known. The documented API accepts uploaded audio; this adapter returns a final transcript, not token-by-token recognition.[3] Discard empty/no-speech results, keep confidence metadata where provided, and do not turn noise-only recordings into assistant prompts.

**Upgrade boundary:** `STTProvider` declares `mode: batch | streaming`, supported languages, and cancellation support. A future streaming adapter receives audio while the user talks and emits revisioned partial/final transcript events; the endpoint controller still decides when to commit. Partials update captions only in the first version. Do not launch speculative LLM responses until finalization/cancellation is proven.

Select a streaming STT provider only after testing the actual target languages and target Mac/network. That is a measured provider decision, not a reason to redesign this architecture. No additional paid account is assumed by this plan.

Echo tests are mandatory: assistant speech with no user speech must not repeatedly trigger interruptions. If a route cannot pass, offer explicit hold-to-talk fallback with a visible mode indicator. Do not silently disable input during playback and call it full duplex.

## 6. Interruption: the most important correctness contract

Every asynchronous item carries:

```ts
type Identity = {
  sessionId: string;
  characterId: string;
  generation: number; // monotonic within session; advanced only by native coordinator
  turnId: string;     // user utterance and its assistant response
};
```

Generation invalidation is synchronous on the native call-control executor. Node receives the new value and cancels all jobs from older values. Both sides reject old identities at every async completion. Renderer tombstones prevent a delayed old performance from reopening the mouth.

On confirmed user speech while a response is generating, buffering, or playing:

1. Advance generation and record the old response's played sample boundary.
2. Stop/fade local audio over a short 10–20 ms ramp, then flush queued buffers. This must not wait for a backend acknowledgement.
3. Emit a terminal avatar snapshot immediately; close mouth within the visual reset budget.
4. Cancel response stream, queued phrases, active synthesis, outstanding downloads/decodes, and analysis for the old generation.
5. Retain microphone pre-roll and continue the user's new utterance under the new identity.
6. Persist the previous response as interrupted with its heard prefix; start new generation only after a valid user input commits.

All waits resolve or reject on cancellation. Every job owns its own abort controller, decoder, and resources. `finally` may release that job's resources; it cannot clear a global handle belonging to a newer job.

Node cancellation must reach fetch, the Python task, and any analyzer process. The worker accepts a cancel job command; if it does not acknowledge within a bounded grace period, terminate/restart it. Late results are still rejected even after a successful cancel acknowledgement.

Do not resume cancelled speech automatically after a false detection. Return to listening; expose interruption metrics for tuning. Add a candidate-stage reversible duck only in a later refinement if false positives warrant it. A confirmed event in v1 invalidates output irrevocably.

## 7. Streamed reply and TTS scheduling

Extract the existing personality prompt builder and history filtering into a reusable backend module. Call mode asks for short, speakable replies. Stream plain spoken text; do not wait for the existing whole-response `{reply,mood,intensity}` JSON before producing speech. Never send partial JSON or control tags to TTS.

`PhraseChunker` consumes incremental text and emits stable text ranges:

- Prefer punctuation boundaries; allow a short complete first sentence instead of the prototype's fixed 24-character minimum.
- Protect decimals, common abbreviations, and incomplete words.
- Suggested first-phrase target: 6–16 words. Subsequent phrases: 10–25 words.
- After about 350 ms with enough buffered text, allow a clause/word boundary; never emit a single partial word to satisfy a timer.
- Maximum phrase 180 characters initially; final stream completion flushes the remainder once.
- Normalize Markdown/code/URLs through an explicit speech-text formatter. Keep display text and spoken text mapping; exact sample-to-character accounting uses spoken text.

`PhraseScheduler` is separate from `PlaybackEngine`:

```text
LLM:       [text streams...................................]
TTS:           [phrase 0] [phrase 1]       [phrase 2]
Playback:               [phrase 0........][phrase 1........]
```

Start preparing phrase 1 when phrase 0 becomes ready, while phrase 0 plays. Completed jobs enter an ordered queue keyed by chunk index. Never play chunk 2 before chunk 1. Start with one synthesis job in flight and at most two ready chunks / about 6 seconds decoded audio. A separate text queue holds at most eight phrases or 2,000 characters; apply upstream backpressure where possible, otherwise cancel with a controlled limit error. Bound the provider stream buffer too (32 KB initial cap); do not merely move unlimited buffering elsewhere.

One persistent Python process uses an asynchronous job protocol over stdin/stdout. Each job includes identity, job ID, text, voice, rate, pitch, and output IDs. Diagnostics go to stderr. Bound messages and error strings. Cancellation does not require restarting the worker in the healthy case.

Initially synthesize a complete short MP3 phrase and its word boundaries, return authenticated audio ID and metadata, and decode natively. Edge exposes audio and word-boundary events, but those boundaries are not phoneme timestamps.[4] A later adapter may stream PCM/audio frames; do not interpret arbitrary partial MP3 bytes as independently decodable clips.

Use a private per-process audio directory, scoped random IDs, explicit deletion on playback completion/cancel plus TTL and startup scavenging. Failed or cancelled synthesis must not leave a growing temp folder. Never accept arbitrary file paths from UI messages.

Provider timeouts: start with STT 10 seconds, first LLM token 10 seconds, LLM idle 5 seconds, phrase TTS 10 seconds, and total response 45 seconds. Make them configuration, surface stage-specific failures, and measure before tightening. Do not retry speech after part of it has played. An automatic retry may happen once only before any audio for that response has been heard, under the same deduplicated job identity.

## 8. Audio clock and synchronized performance

Native playback owns the only output channel for both calls and ordinary read-aloud. During migration, a global output arbiter ensures legacy HTML Audio is stopped before native output starts. Final state has no competing HTML Audio owner.

For baseline phrases, decode MP3 using native audio facilities off the callback, convert to one negotiated output PCM format, and obtain exact sample count. Schedule ready buffers on AVAudioPlayerNode. Maintain a table mapping player sample ranges to chunk IDs and offsets. Player time, render time, and output presentation latency require explicit handling; a scheduled-buffer callback alone is not proof the user heard every sample.[5]

Each chunk has its own cue origin at local sample zero. Do not concatenate metadata using estimated last-word duration. Silence, decoder priming/padding, and resampling must be included in the measured mapping. On stop, route change, or player restart, create a new `clockEpoch`; old sample mappings become invalid.

Send compact snapshots from a native timer at 20–30 Hz, independent of browser requestAnimationFrame, plus immediate start/stop/underrun/reset snapshots. Include:

```ts
type PlaybackSnapshot = Identity & {
  version: 2;
  clockEpoch: number;
  sequence: number;
  chunkId: string | null;
  chunkIndex: number;
  playedSamplesInChunk: number;
  sampleRate: number;
  state: "buffering" | "playing" | "ended" | "cancelled" | "error";
};
```

The timestamp refers to an estimate of presented audio, calibrated for the route. Do not subtract latency twice. Renderers use their own monotonic receive time for short interpolation; they never compare raw `performance.now()` across WKWebViews. Begin with bounded receive-time interpolation, then measure relay delay and add a ping/clock-offset protocol only if required by the visual target.

Stop extrapolation after 150–200 ms without a new snapshot and fade mouth to rest; do not freeze an open mouth forever. During underrun, mouth rests and no nonexistent audio time advances. Restart at the actual new chunk start.

A newly ready renderer gets an atomic bundle: current session/generation, clock epoch, active chunk metadata, expression state, and latest playback snapshot. Apply configuration, metadata, then clock. Loading a model midway through a phrase must join the current position, not start that phrase at zero. Switching views never creates a second player.

## 9. Lip sync and facial behavior

Keep `FaceRigAdapter`, `LipSyncController`, `ExpressionController`, and `FaceMixer`. Add `PerformanceTimeline`, a capability profile registry, and a transport receiver. The mixer remains the only owner writing facial morph weights once per frame before MMD morph application. Existing body idle retains skeleton ownership.

### Timing quality tiers

1. **Basic live fallback:** derive an amplitude envelope from the exact decoded outgoing PCM, aligned by sample index. Gate mouth opening during actual silence. Word/text heuristics may provide restrained approximate vowel variety, explicitly labeled approximate.
2. **Calibrated live sync:** use verified provider phoneme/viseme timing or an audio-to-viseme analyzer that stays ahead of playback within the allowed preparation budget. Match the language and rig profile. This is the quality upgrade required if basic sync looks inadequate.
3. **Offline/replay precision:** consider Rhubarb on complete short recordings as an analysis/benchmark adapter. Its documented workflow processes recordings; do not put full-response analysis on the live critical path.[6]

Do not describe the current letter interpolation as accurate phonetic sync. Basic audio-driven mouth motion is an honest first milestone, not the final realism claim. If precision analysis is late, start with basic cues; only apply an upgrade to future samples, never visibly rewrite already played motion. A provider change may be preferable to an expensive local aligner if both speed and precise timing are required.

### Rig profiles and mixing

- Key calibrated profiles by appearance key plus asset revision/hash; store verified indices/names, morph types, maximum weights, and conflict groups.
- Ship a developer inspector; validate Hu Tao, Jean, one other series, and one special-case unsupported character.
- Alias matching is discovery assistance. Avoid substring-based activation of arbitrary group/material/outfit morphs in production.
- Define capability levels: calibrated, basic mouth, expressions-only, unsupported. Audio and captions work at every level.
- Articulation owns mouth channels during speech; upper-face mood stays subtle. Smile mouth is reduced, especially on closed-lip poses.
- Use an advancing cue cursor with binary search only after discontinuities; avoid scanning the whole cue array each frame.
- Use faster closure than opening and test short P/B/M closures. Explicit rest is required in silence and after cancellation.
- Compose blink and eye expressions with profile-defined limits. Respect overlapping source morph indices so one logical channel cannot overwrite another accidentally.
- Clamp delta after suspended views; reset owned weights on unload, generation invalidation, and terminal playback.
- Respect reduced-motion preference for optional expression/gaze changes.

### Expression timing

Separate conversation behavior from reply emotion. Listening is mild attention, thinking is restrained, speaking follows the current phrase, and interruption releases the speaking face promptly. Do not infer sadness or happiness from microphone loudness.

V1 uses neutral contextual emotion plus deterministic listening/thinking behaviors while validating audio. The next milestone adds one bounded asynchronous expression-classification request using character context and the completed/available response text. It returns only the existing allowlisted mood/intensity structure. This is off the speech critical path, cancellable, rate-limited to one per response, and timeout-falls-back to neutral. No per-frame or per-word LLM calls.

Associate emotion with a chunk and apply it when that chunk plays. Late emotion can affect a future chunk; it cannot retroactively animate an already spoken joke. Validate zero intensity correctly. Start with 200–350 ms onset and 1–2 seconds decay; calibrate visually. Later replace the side request with validated structured streaming metadata only if the chosen provider reliably supports it.

Facial acting cannot fix flat TTS prosody. Preserve the voice adapter's capabilities (rate/pitch, supported styles, timing quality), and test emotional delivery separately. Do not simulate laughing facial motion over ordinary unrelated speech; actual laughter needs matching audio.

## 10. Protocol, history, and bounded failure handling

Define a versioned JSON schema and fixture corpus first. Implement runtime validation on both Swift and TypeScript boundaries; TypeScript types alone do not validate IPC. Every envelope has `version`, `type`, `eventId`, direction-local `sequence`, and identity where applicable. Audio blocks carry identity, capture sequence, sample rate, channel count, format, and declared byte count in a binary envelope.

Required message families:

| Direction | Messages |
|---|---|
| UI → native | `call.start`, `call.end`, `call.mute`, `turn.text` |
| Native → UI | `call.state`, `transcript.partial`, `transcript.final`, `assistant.delta`, `turn.finalized`, `call.error` |
| Native → backend | `session.open`, `input.audio`, `input.commit`, `turn.text`, `generation.advance`, `playback.progress`, `session.close` |
| Backend → native | `session.ready`, `transcript.*`, `assistant.delta`, `speech.chunk.ready`, `response.complete`, `job.cancelled`, `error` |
| Native → renderers | `avatar.hydrate`, `performance.chunk`, `playback.snapshot`, `behavior.state`, `generation.reset` |

Initial caps: control message 64 KB; audio frame 64 KB; phrase download 2 MB; cues 2,000 per chunk; response text 12,000 characters. Validate finite numbers, monotonically ordered nonnegative cue ranges, cue duration within decoded sample count, permitted mood/pose enums, chunk order, supported version, and active character/appearance. Reject malformed frames without crashing the app.

WebSocket send queues are bounded. Native capture ring contains at most two seconds awaiting processing; a consumer falling behind triggers a controlled input reset/error, not corrupted speech. Backend keeps at most one committed current STT job, one current LLM response, and bounded TTS preparation. Prioritize cancellation/control over queued bulk data. A new session after reconnect gets a new ID; never resurrect old jobs from transport retries.

### History must reflect what happened

Keep current character data and localStorage keys; introduce a `HistoryStore` adapter with an additive schema version. Do not redesign long-term memory in this work.

User transcript: commit final recognized text once with `turnId`; partial captions never become duplicate history messages. Assistant record stores generated display text, spoken text, last confirmed heard prefix, status (`completed`, `interrupted`, `failed`), and IDs. Full generated text may remain visible as interrupted, but future model context includes only the conservatively heard prefix plus an interruption marker.

Use word timing and actual playback progress to approximate the heard prefix. If alignment is unavailable, commit only fully played chunks; never pretend a queued but unplayed paragraph was heard. A final progress acknowledgement precedes next-turn prompt assembly when possible. On disconnect, use the last acknowledgement conservatively.

Native session keeps an in-memory history journal and sends idempotent history events to the existing UI `HistoryStore`; the UI acknowledges persisted event IDs. Rehydrate from the journal after a webview reload. Persist to the current storage location in v1; explicitly document that an app crash before acknowledgement may lose the latest event. A durable native database migration is separate work.

Microphone audio is ephemeral by default. Metrics record IDs, stage timings, queue depths, cancellations, and error categories; do not log API keys or full private conversations by default.

## 11. Proposed source layout

Create only the files needed by the current milestone. These paths are a dependency map, not a requirement to generate empty scaffolding.

```text
Mighty Chat/
  Shared/
    protocol.schema.json
    fixtures/                       # same valid/invalid examples used by Swift + JS
  Native/
    Call/CallSessionCoordinator.swift
    Call/CallState.swift
    Audio/AudioHost.swift
    Audio/MicrophoneCapture.swift
    Audio/VoiceActivityDetector.swift
    Audio/EndpointController.swift
    Audio/PlaybackEngine.swift
    Audio/PlaybackClock.swift
    Audio/AudioAnalysis.swift
    Bridge/BackendConnection.swift
    Bridge/CallUIBridge.swift
    Bridge/AvatarRelay.swift
  Backend/
    server.ts                       # composition root and local routes
    call/ConversationSession.ts
    call/CancellationScope.ts
    call/PhraseChunker.ts
    call/PhraseScheduler.ts
    providers/STTProvider.ts
    providers/GroqBatchSTT.ts
    providers/LLMProvider.ts
    providers/GroqLLM.ts
    providers/TTSProvider.ts
    providers/EdgeTTS.ts
    providers/ExpressionProvider.ts
    history/ContextBuilder.ts
    storage/TemporaryAudioStore.ts
    workers/edge_worker.py
  UI/
    call/CallController.ts
    call/CallView.ts
    chat/HistoryStore.ts
    chat/ChatController.ts
  Renderer/
    companion.ts                    # existing scene composition
    face/                           # keep existing four controllers
      PerformanceTimeline.ts
      RigProfiles.ts
      profiles/
    transport/PerformanceReceiver.ts
  Sources/
    main.swift                      # thin existing app entry / composition root
    index.html                      # existing file origin, extracted logic
    desktop.html
    companion-ui.js                  # legacy facade during migration
    companion-server.cjs             # temporary facade to built backend
    Generated/                      # built UI and backend, never hand-edit
    Companion/                      # existing built renderer, never hand-edit
    EdgeTTS/                        # existing vendor runtime pending packaging step
  Resources/Info.plist
  scripts/build.sh
  scripts/package.sh
  tests/{protocol,call,audio,backend,renderer}/
  package.json
  docs/LIVE-CONVERSATION-ARCHITECTURE.md
  docs/LIVE-CONVERSATION-PROGRESS.md
```

Use the existing renderer toolchain first. Add an app-local manifest/lockfile for backend/UI dependencies and a documented TypeScript build; avoid a frontend framework migration. Bundle the WebSocket server dependency and explicitly package Python/VAD native dependencies. Do not rely on `/usr/bin/python3` existing on every user's Mac. Compile all new native files through the build script, with AVFoundation/AVFAudio linkage and pinned deployment target validated by the audio spike. Keep source packaging separate from the existing installed `.app` until release checks pass.

## 12. Small implementation tasks for the next model

Execute sequentially. For every task: read the named existing code, implement only its scope, run its acceptance checks, and append files changed/results/unresolved issues to `docs/LIVE-CONVERSATION-PROGRESS.md`. Do not claim manual listening or visual checks passed unless actually performed.

### Task 1 — establish build and protocol fixtures

Create the app build/package scripts, source Info.plist, protocol schema, and fixture runners. Preserve existing localStorage/file loading and renderer build. Record the baseline build commands and app runtime dependencies; keep rollback output separate.

**Done:** clean build can reproduce the current app resources; Swift and TypeScript validators agree on valid/invalid identity/snapshot fixtures. No runtime behavior change.

### Task 2 — prove native full-duplex audio before plumbing providers

Implement `AudioHost`, capture ring, playback, VAD adapter spike, and minimal developer test controls. Use a local audio fixture, actual microphone permission, and native voice processing. Add microphone purpose text and any signing/runtime entitlements required by the chosen packaging configuration.

**Done:** capture while fixture plays; speech onset events work; stop/route change/denial release resources; record echo and route results on built-in speakers and headphones. Measure VAD worker latency. If the candidate runtime cannot package or keep up, resolve here before continuing; retain a manual interruption test input meanwhile.

### Task 3 — implement session reducer and local cancellation

Implement call coordinator, state dimensions, generation ownership, and fake backend/player adapters. All lifecycle inputs pass through one serialized control path. Add call ID/generation guards to output acceptance.

**Done:** deterministic tests for double start, hang-up while connecting, mute mid-input, speech during playback, route change, character change, and stale completion. Interruption stops fixture audio without network involvement.

### Task 4 — implement authenticated transport and backend sessions

Add bounded native WebSocket transport, backend session manager, protocol validation, cancellation scope, heartbeat/disconnect cleanup, and audio envelopes. Use fake STT/LLM/TTS providers initially. Preserve old authenticated HTTP endpoints.

**Done:** wrong token rejected; malformed/oversized frames rejected; late old-generation output ignored at both ends; dropped connection stops native output and cleans jobs; reconnect creates a new session.

### Task 5 — connect VAD endpointing to Groq transcription

Implement pre-roll, utterance cap, WAV encoding, batch STT adapter, final transcript events, and user history commit. Add configurable language/model settings without leaking keys to UI or avatar.

**Done:** automatic hands-free utterance detection works without holding a button; “yes”/“stop” are retained; silence does not generate replies; cancelled STT cannot create an old turn; explicitly report batch STT latency.

### Task 6 — stream LLM text and split phrases

Extract personality/context builder. Add streamed plain-text LLM adapter, speech formatting, phrase chunker, and bounded scheduler using fake TTS. Handle SSE fragmentation, multi-byte text, provider error, EOF, and final buffer flush.

**Done:** first stable phrase emits before full response completes; chunk order stable; abbreviations/decimals/short replies tested; no duplicated/missing final phrase; unbounded responses hit a controlled limit.

### Task 7 — warm TTS worker and overlapping playback

Adapt `edge-tts-performance.py` into the persistent worker; retain real word metadata and correctly label heuristic cues. Implement job cancellation, native authenticated audio retrieval, decode, actual sample duration, and scheduling.

**Done:** phrase N+1 synthesis overlaps phrase N playback; worker process reused; interrupted work cancels or is killed after timeout; all waiting promises settle; no unbounded temp files; stream/voice errors are visible. Measure inter-phrase gaps and first-audio latency.

### Task 8 — replace avatar clock and fix lip sync lifecycle

Implement v2 performance receiver/timeline, native snapshots, PCM envelope fallback, generation tombstones, stale timeout, and renderer hydration. Adapt existing mixer without changing the model loader or body idle.

**Done:** one audio output across all view modes; a newly loaded view joins mid-phrase; silence/underrun/cancel closes mouth; delayed old chunks cannot restart motion; 60-second playback has no accumulating drift.

### Task 9 — calibrate face profiles and expressions

Add inspector/profile registry, channel limits/conflicts, cue cursor, zero-intensity fix, and asynchronous expression adapter. Verify special-case model fallback. Evaluate precise lip-sync adapter only with timing measurements.

**Done:** pilot rigs visually checked; blink/smile/mouth combinations do not visibly collide; emotion starts on relevant playback; missing/late classification remains neutral; report basic versus calibrated quality honestly.

### Task 10 — wire the existing phone button and shared history

Implement CallView/Controller and bridge commands. Add call bar, mute/end, captions, error/retry, connecting state, and mode indicators. Extract HistoryStore; integrate typed-in-call interruptions and disable duplicate replay. Stop late typed-chat speech from old characters.

**Done:** real UI can start/end repeated calls; view switching preserves audio; history records final user text once and interrupted assistant heard prefix; normal typed chat and character creation still work.

### Task 11 — migrate ordinary speech to the same output engine

Route saved-message replay and auto-speak through native PlaybackEngine/AvatarRelay. Remove the legacy audio globals and old rAF speech timer after regression checks. Keep text-chat API compatibility until its callers migrate. Update README and annotate the old lip-sync plan as historical.

**Done:** no second audio owner remains; replay works outside calls; original characters/messages/settings remain; native desktop modes still work. Do not delete provider fallback code until migration tests pass.

### Task 12 — measure, choose upgrades, and release

Run the scripted quality matrix below; produce a small report with p50/p95, device/route/network, warm/cold runs, and failing cases. Improve the measured bottleneck. If batch STT dominates, implement a tested streaming STT adapter. If phrase TTS dominates or sounds discontinuous, adopt a tested streaming TTS adapter behind the existing contract. If mouth shapes fail visual quality, implement/calibrate a timing provider rather than increasing frame rate.

**Done:** call-quality gates pass, fallback modes are explicit, packaged build is verified without developer runtime paths, and rollback build remains available. Provider upgrades are separate small tasks using the same completion checklist; this plan does not invent benchmark results or guarantee provider availability.

## 13. Performance targets and acceptance matrix

These are desired targets on the user's Mac, not measured achievements or provider guarantees.

| Metric | Initial target | Measurement |
|---|---|---|
| Confirmed speech onset → assistant output stopped | p95 ≤100 ms | Local VAD event and audio-loopback recording |
| Physical speech onset → output stopped | p95 ≤250 ms | Includes VAD confirmation; headphones and speakers separately |
| Actual end of user speech → first audible reply | p50 ≤1.0 s; p95 ≤1.8 s | Includes endpoint wait, STT, first phrase, synthesis, decode |
| Unintended silence between continuous phrases | p95 ≤120 ms | Exclude intended linguistic pauses; also judge prosody |
| Audio event → corresponding mouth event | Most annotated events within ±80 ms | Synchronized screen/audio recording |
| Stop → mouth rest | ≤100 ms | Video at cancellation |
| Drift during 60-second playback | No accumulating drift; remain in sync budget | Marked beginning/middle/end events |
| Face controller update | p95 ≤2 ms/frame | Face code separately from whole render cost |
| UI presentation | Smooth on target device while speaking | Frame time during capture and synthesis |
| Repeated calls | 20 start/end cycles without accumulating workers/buffers | Process/resource counters; expected caches excluded |

Instrument: speech onset/offset, endpoint commit, STT start/final, LLM request/first token/first phrase, TTS start/ready, decoded, scheduled, presented, interrupted, and stopped. Correlate by IDs. Avoid adding timestamps from different clock domains without mapping. First-audio latency follows the dependency path; later phrase preparation overlaps playback.

Run at least 30 representative turns per target audio route before quoting percentiles; include long/short utterances and interruptions. Small-sample p95 is preliminary. Maintain recorded fixtures for reproducible cancellation and timing tests.

Required scenarios:

1. Normal two-way call; short “yes”; hesitant sentence; long pause; mixed-language utterance in the intended supported languages.
2. Interrupt during STT, first-token wait, TTS, decode, playback, and between chunks. Rapidly interrupt twice.
3. Inject an old chunk and old playback snapshot after cancellation; neither speaks nor moves the face.
4. Assistant speech alone through built-in speakers; user speech overlapping it; keyboard click and cough. Record false interruptions instead of hiding them.
5. Hang up while microphone permission or provider startup is pending; repeated phone clicks create one session.
6. Missing key, denied permission, unavailable input, unplugged headphones, Bluetooth route change, sleep/wake, failed TTS, rate limit, disconnected network.
7. Switch docked/overlay/portrait/screensaver/holographic during speech; reload renderer; unavailable morphs; delayed model load.
8. Confirm unheard generated text is excluded from the next prompt after interruption.
9. Repeat calls and long responses while monitoring queue bounds, workers, temp files, stale listeners, and native buffers.
10. Regression: character creation/editing, appearance choice, per-character memory/preferences, ordinary chat, replay, Keychain settings, and original file-origin storage.

## 14. Handoff prompt

Paste this with the plan into the implementation model:

> Implement the next incomplete task in `Mighty Chat/docs/LIVE-CONVERSATION-ARCHITECTURE.md`. Read the relevant source and `LIVE-CONVERSATION-PROGRESS.md` first. Do only that task and its prerequisites; preserve the existing character UI, storage identity, and view modes. Use the architecture's ownership rules, identity fields, bounded queues, and cancellation contract. Do not hand-edit generated bundles. Validate with the task's acceptance checks; distinguish tests actually run from manual checks still needed. Update the progress file with changes, commands, outcomes, and the exact next task. Do not silently replace a provider or claim latency/lip-sync quality without measurement.

## 15. Reference checks

The architectural recommendation is based on this repository and the inspected prototype. External documentation supports API capabilities, not claimed measured performance:

1. [Apple — Using voice processing](https://developer.apple.com/documentation/avfaudio/using-voice-processing).
2. [Silero VAD — official project](https://github.com/snakers4/silero-vad) and [model/version history](https://github.com/snakers4/silero-vad/wiki/Version-history-and-Available-Models).
3. [Groq — Speech to Text](https://console.groq.com/docs/speech-to-text) and [API reference](https://console.groq.com/docs/api-reference).
4. [Edge TTS — communication implementation](https://github.com/rany2/edge-tts/blob/master/src/edge_tts/communicate.py).
5. [Apple — AVAudioPlayerNode](https://developer.apple.com/documentation/avfaudio/avaudioplayernode) and [AVAudioEngine](https://developer.apple.com/documentation/avfaudio/avaudioengine).
6. [Rhubarb Lip Sync — official repository](https://github.com/DanielSWolf/rhubarb-lip-sync).
