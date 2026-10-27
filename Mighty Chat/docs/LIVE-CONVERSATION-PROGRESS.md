# Live conversation implementation progress

Architecture: [LIVE-CONVERSATION-ARCHITECTURE.md](LIVE-CONVERSATION-ARCHITECTURE.md)

## Current status

- Planning completed on 21 September 2026.
- Existing app and standalone voice prototype inspected.
- Task 1 implemented and verified in a separate output bundle.
- Task 2 native audio graph captures samples during a packaged-app diagnostic; route-specific echo and interruption behavior remain unverified.
- Task 3 reducer and serial effect coordinator are implemented with deterministic tests; production audio/backend ports remain unwired.
- No live audio, visual calibration, or latency benchmark has passed yet.
- Task 4 transport now accepts bounded PCM frames, typed turns, transcript events, streamed reply events, and speech chunk notifications; native client upload is tested.
- Task 5 has a provisional native endpoint controller and tested Groq batch STT request adapter; live STT has not been exercised with a Groq key.
- Task 6 has a shared context builder, tested Groq stream parser, bounded phrase chunker, and phrase scheduler.
- Task 7 has a persistent Edge worker and real phrase synthesis test; it is not connected to the phone UI yet.
- Task 8 has a native decode/playback engine in source; real Edge MP3 decoding was checked outside the sandbox. The call runtime now relays sample-clock snapshots to the existing renderer, but continuous playback/view synchronization remains unverified.
- Task 10 has an initial phone-button and hold-to-talk call UI connected to a native runtime, shared chat history, and heard-chunk persistence. It has not passed a real user-to-avatar call.
- Next task: run complete speaking/listening/interruption checks with a configured Groq key, then validate face cues and acoustic behavior before enabling hands-free mode.

## Task checklist

- [x] 1. Establish build and protocol fixtures.
- [ ] 2. Prove native full-duplex audio.
- [ ] 3. Implement session reducer and local cancellation.
- [ ] 4. Implement authenticated transport and backend sessions.
- [ ] 5. Connect VAD endpointing to Groq transcription.
- [ ] 6. Stream LLM text and split phrases.
- [ ] 7. Warm TTS worker and overlapping playback.
- [ ] 8. Replace avatar clock and fix lip sync lifecycle.
- [ ] 9. Calibrate face profiles and expressions.
- [ ] 10. Wire phone button and shared history.
- [ ] 11. Migrate ordinary speech to the same output engine.
- [ ] 12. Measure, choose upgrades, and release.

## Entry template

### Task N — title / date

- Changes and files:
- Verification commands and actual results:
- Manual checks performed:
- Manual checks still needed:
- Measurements, environment, and limitations:
- Unresolved issues or justified design deviation:
- Exact next task:

Do not mark a task complete solely because it compiles. Use its acceptance criteria in the architecture plan.

### Task 1 — build and protocol fixtures / 21 September 2026

- Changes and files: `scripts/build.sh`, `Resources/Info.plist`, `Shared/protocol.schema.json`, `Shared/CallProtocol.cjs`, `Native/Call/CallProtocol.swift`, shared fixtures, JavaScript and Swift fixture runners.
- Verification commands and actual results: full renderer and Swift build passed; `build.sh --skip-renderer` passed; JS and Swift protocol fixtures passed; source plist lint passed; bundled Node reports v24.20.0; ad hoc code signature verifies.
- Manual checks performed: none.
- Manual checks still needed: launch packaged app and check pre-existing character/chat behavior on the target desktop.
- Measurements, environment, and limitations: build currently uses the sibling `model-viewer-clean` dependency tree and the Node binary from the build machine. The future release packaging task must pin and ship its own dependencies.
- Unresolved issues or justified design deviation: no source-level deployment changes beyond the build bundle. Renderer rebuild takes roughly 25–110 seconds in this workspace; `--skip-renderer` is for iterations after a successful full build.
- Exact next task: Task 2 native audio proof.

### Task 2 — native full-duplex audio spike / 21 September 2026 (in progress)

- Changes and files: `Native/Audio/AudioRing.c`, `Native/Audio/AudioHost.swift`, `tests/audio/check-ring.c`; an opt-in `MIGHTY_AUDIO_SPIKE=1` diagnostic path in `Sources/main.swift`; microphone purpose text in Info.plist.
- Verification commands and actual results: Swift app compilation passed for macOS 12 target; C ring wraparound and overrun checks passed; signed bundle verifies. A direct sandbox run aborted before `NSApplication` registration; an outside-sandbox run reached audio. Initial voice-processing graph initialization failed with Core Audio `-10875`. A controlled retry with voice processing disabled succeeded. Two-second diagnostic logged 44.1 kHz input, 87,886 captured samples, peak 0.049, and zero ring overruns.
- Later diagnostic on the default `headsu` Bluetooth microphone at 16 kHz produced zero captured samples despite the engine starting. `AudioHost.start()` now checks for capture within 900 ms and fails with a user-readable input-device error on this condition. The repeat diagnostic confirmed that explicit failure. The macOS audio inventory also shows an iPhone microphone and MacBook Air microphone as alternate inputs; route and permission behavior need investigation before a real call can pass.
- Manual checks performed: none; the automated diagnostic confirms API operation, not perceived sound or echo quality.
- Manual checks still needed: listen to fixture output, speak over it, check speaker/headphone echo and interruption, route changes, permission denial, and repeated resource cleanup. Validate a suitable production VAD runtime and model package.
- Measurements, environment, and limitations: only two-second sample count/peak/overrun diagnostic; no audio-to-output timing or false-interruption measurement. Current `AudioHost` captures first input channel at device rate into a 192,000-sample SPSC ring. Resampling, VAD, route notifications, and provider transport remain to implement.
- Unresolved issues or justified design deviation: voice processing cannot initialize on the tested route; a call on that route must expose the hold-to-talk fallback until echo behavior is proven. The direct sandbox GUI failure was environmental because the same bundle ran outside the sandbox.
- Exact next task: complete the audio hardware acceptance checks, then wire coordinator effects.

### Task 3 — session reducer / 21 September 2026 (in progress)

- Changes and files: `Native/Call/CallState.swift`, `CallSessionCoordinator.swift`, `tests/call/check.swift`, `check-coordinator.swift`.
- Verification commands and actual results: lifecycle, stale generation, old STT result, mute, route change, disconnect, hang-up while connecting, and local stop-before-cancel effect ordering checks passed.
- Manual checks performed: none.
- Manual checks still needed: connect coordinator effects to the actual `AudioHost` and backend; prove confirmed speech stops a playing fixture without network involvement.
- Measurements, environment, and limitations: no latency measurement. State is pure and coordinator actions are serialized; no production call UI invokes them yet.
- Unresolved issues or justified design deviation: no authenticated backend transport yet.
- Exact next task: Task 2 hardware proof and Task 3 port integration.

### Task 4 — authenticated transport / 21 September 2026 (in progress)

- Changes and files: `Backend/CallTransport.cjs`, vendored `ws` 8.18.0, `Native/Bridge/BackendConnection.swift`, server upgrade/shutdown hooks, backend transport and native handshake tests, `scripts/test-network.sh`.
- Verification commands and actual results: loopback test passed for missing-token rejection, `session.open`, generation advance, stale-generation close; native `URLSessionWebSocketTask` handshake received `session.ready`. These tests required a scoped outside-sandbox loopback run because the sandbox denied `127.0.0.1` bind.
- Manual checks performed: none.
- Manual checks still needed: test actual app lifecycle, reconnect, malformed/oversized frames, and provider cancellation through the connection.
- Measurements, environment, and limitations: binary PCM upload is limited to 2 MiB and 30 seconds, sent in 32 KiB frames. Server shutdown with an active call passed. Heartbeat, precise queue telemetry, and an integrated call UI remain.
- Unresolved issues or justified design deviation: `ws` is explicitly vendored with its included MIT license because the offline npm install could not resolve cached registry metadata. Replace through a deliberate dependency update.
- Exact next task: integrate native endpoint, playback, and UI with this connection.

### Tasks 5–8 — provider and audio path / 21 September 2026 (in progress)

- Changes and files: `Native/Audio/EndpointController.swift`, `PlaybackEngine.swift`, `Backend/providers/GroqBatchSTT.cjs`, `GroqLLM.cjs`, `EdgeTTS.cjs`, `Backend/call/PhraseChunker.cjs`, `PhraseScheduler.cjs`, `ConversationSession.cjs`, `Backend/workers/edge_worker.py`, protocol/fixture tests.
- Verification commands and actual results: automatic and hold-to-talk endpoint fixtures passed; WAV construction and STT request checks passed with a fake fetch; split SSE/UTF-8 reply parsing and cancellation tests passed; phrase overlap/backpressure tests passed; persistent Python worker startup/shutdown passed; actual Edge phrase synthesis succeeded and native MP3 decoding produced 44,928 samples at 24 kHz. The Edge phrase's final word ended at 0.8125 s while decoded audio lasted 1.872 s, so metadata now reports full-file duration and explicitly labels the mouth cues heuristic.
- Manual checks performed: none.
- Manual checks still needed: Groq STT/LLM with a configured key, native playback on the user's output route, cue timing across a multi-phrase reply, echo suppression and barge-in, app UI and desktop viewer hydration.
- Measurements, environment, and limitations: current endpoint uses an RMS threshold as a provisional detector. Automatic mode must be gated by a validated speech detector and echo-capable route. The source renderer still expects v1 timing messages; no call runtime relays v2 native snapshots yet.
- Unresolved issues or justified design deviation: macOS MP3 decoding failed inside the command sandbox with Core Audio format setup error, but succeeded outside the sandbox on the exact same file. The audio decode integration check runs in `scripts/test-network.sh` outside that sandbox.
- Exact next task: connect coordinator, endpoint, backend, playback, avatar relay, and phone controls into one call session; then replace the provisional detector for hands-free release.

### Task 10 — call UI and native orchestration / 21 September 2026 (in progress)

- Changes and files: `Native/Call/LiveCallRuntime.swift`, `Sources/main.swift`, `Sources/index.html`, `Native/Bridge/BackendConnection.swift`, `Native/Audio/PlaybackEngine.swift`, and `scripts/build.sh`.
- Verification commands and actual results: packaged build, protocol/state/provider/audio fixtures, inline JavaScript syntax check, authenticated loopback transport, native WebSocket upload, and real MP3 decode all passed. The loopback/codec checks ran outside the sandbox where macOS grants those APIs. The latest packaged audio diagnostic failed its new capture-health check on the current 16 kHz input route.
- Manual checks performed: none. No end-to-end call with a Groq key has been run.
- Manual checks still needed: start/end call, microphone permission denial, hold-to-talk capture, Groq transcription and reply, multi-phrase native audio, avatar timing, interrupted playback, repeated sessions, route changes, and headphone/speaker echo.
- Measurements, environment, and limitations: the button starts a native hold-to-talk session only. Input endpointing remains provisional RMS code and automatic hands-free mode is deliberately not exposed. History stores assistant phrases only after their audio completes, limiting unspoken text leakage into the next turn; phrase-level partial playback still needs a heard-prefix policy. The UI speaks via native AVAudioEngine in calls while ordinary chat keeps its prior HTML Audio path.
- Unresolved issues or justified design deviation: this wiring is a functional integration step, not proof of a lifelike full-duplex call. Playback sample-clock sync, expressions, acoustic cancellation, packaged runtime dependencies, and latency targets remain open.
- Exact next task: run an end-to-end call on target hardware and fix observed lifecycle/timing faults; then implement validated VAD, echo gating, expressions, and ordinary speech migration.

### Runtime fixes — 22 September 2026

- Serialized call effects on the main queue, preserved visible errors, cancelled pending startup on end, and protected replacement playback downloads from stale completions.
- Replaced failing input taps with bounded AVCapture capture and built-in microphone fallback. Quiet input is accepted when frames arrive; input sample-rate changes discard the current hold and return to listening. Silent/short holds do not reach STT; recordings stay within the 2 MiB transport cap.
- Keychain reads are cached and noninteractive by default; the settings UI offers explicit saved-key unlock. Restarted the development build and verified that the saved key loaded and a call connected without a password prompt.
- Hardware test passed with MacBook Air Microphone: 158,040 captured samples, 44,928 decoded output samples, playback completion and advancing sample clock, decoded peak 0.6256. This verifies audio processing, not subjective audibility.
- Observed the user's real spoken long-story request transcribed in the call UI. It exposed `TTS phrase queue limit exceeded`. Replaced overflow failure in the call producer with awaitable queue capacity; cancellation releases waiting producers. A 100-phrase slow-consumer regression passed with a queue limit of two.
- Native avatar performance is retained for view hydration. Typed call input uses the same native response/playback path.
- Full hands-free echo cancellation, natural expression generation, and latency targets remain unvalidated. Long-story provider playback must be rechecked in the newly rebuilt app.
- The follow-up real long-story call exposed `Groq stream frame limit exceeded`: a network read can contain many SSE events. The parser now limits each event and incomplete remainder, rather than the total read. Regression covers 2,000 valid events in one read and rejection of a genuinely oversized event; both passed.

### API and voice settings — 22 September 2026

- Added native `AISettingsController` and `CredentialStore`: separate connections/voice tabs, masked OpenAI/Groq fields, explicit unlock, connection test, provider/model selection, per-character voice, speed, Edge pitch, OpenAI delivery instructions, and preview.
- Added OpenAI reply, transcription, and speech routing; keys stay out of WebKit and profile storage. See `docs/AI-VOICE-SETTINGS.md` for behavior and limitations.
- Full packaged build and fixture suite passed. Provider tests cover OpenAI routing without real credentials. Packaged authenticated transport, native upload, decode, and hardware output checks passed.
- Opened the new settings UI and visually checked the voice tab; all controls fit. Existing Groq key showed Saved · available without an authentication prompt. OpenAI showed Not loaded. The key pasted in the conversation was not stored or used.
- Started an Edge voice preview, but the user began interacting with settings before completion could be verified. Live OpenAI validation requires the user to enter a key in the native secure field. Long-story fixes remain in the build; final uninterrupted story playback has not yet been verified.
- Follow-up read-only UI check confirmed `Playing voice preview.` in the settings status, completing the Edge preview-start verification.

### Global hold-to-talk — 23 September 2026

- Added native modifier-state polling (`HoldToTalkKey`) and configurable Control/Option/Shift/Fn selection in a new settings tab. Default Control; no event tap or general keystroke capture.
- Press starts the selected character's session automatically; release submits the current hold. Session remains warm between turns. Pending startup holds are cleared on release so a quick tap cannot start recording later.
- Integrated native menu-bar status and Start/End conversation, with microphone/waveform symbols. Simplified processing status to Replying. Shortcut pauses in settings and resets on sleep; calls end on sleep/termination.
- Pure hold-state regression covers one-shot edges, repeated down events, settings suspension, rearming, and reset. Passed. Physical global-key behavior and final holographic call still need interactive verification.
