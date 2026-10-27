# Voice latency, 22 October 2026

Mode: **Improve**. Scope: hold/click-to-talk release through transcription, reply generation, Edge synthesis and native playback. Contract: reduce release-to-first-playback time without changing the current Ava voice, reply model, prompts, stored conversations, rate/pitch, caption metadata or the chat/orb UI. Text-speed voice is the user’s goal; it is **not achieved** with this retained Edge path.

## Evidence and changes

The existing path creates a fresh speech WebSocket for every phrase, despite retaining the Python worker. The worker now owns one serialized connection, preconnects at session open and when the user begins a new recording, and reuses that connection between phrases. It closes after 20 seconds idle. Cancellation or malformed/incomplete output invalidates it. A stale idle connection retries once only before any metadata/audio has been emitted. TLS verification, authentication, request IDs and per-request word clocks are preserved. The code uses the project’s bundled edge_tts protocol/parser; its compatibility is covered by focused tests.

The existing first-clause chunker is now used for ordinary voice calls independently of the old tagged-stream feature flag. It dispatches actual model output earlier; it adds no canned acknowledgement, changes no reply model/reasoning settings, and does not enable removed animation systems. Speech remains 24 kHz mono MP3 with the existing native decoded-sample playback clock and word metadata.

Changed runtime files: `Backend/workers/edge_connection.py`, `Backend/workers/edge_worker.py`, `Backend/providers/EdgeTTS.cjs`, `Backend/call/ConversationSession.cjs`, `Backend/CallTransport.cjs`, `Sources/edge-tts-performance.py`, `Sources/companion-server.cjs`.

## Controlled native comparison

Mac14,2 (M2), macOS 27.0.1, Swift 6.4 optimized runner. Same five recorded synthetic inputs, Groq Whisper turbo + GPT-OSS 20B + Edge Ava, unchanged voice/rate/pitch. Five completed turns in each session. Timing is release to confirmed positive native played-sample progress, not an acoustic first-word detector. No renderer is loaded. Normal network/provider/model variation is uncontrolled; these are small descriptive samples, not a guaranteed user latency or isolated causal percentage. At n=5, nearest-rank p90 is the maximum. Stages overlap; do not add their percentiles.

| Delta (ms) | Before median | Before p90 | Final median | Final p90 |
|---|---:|---:|---:|---:|
| commit_to_stt | 691 | 1677 | 1141 | 1555 |
| request_to_first_token | 585 | 778 | 588 | 790 |
| phrase_to_tts_first_byte | 2596 | 3081 | 1547 | 2721 |
| phrase_to_audio_ready | 3041 | 3430 | 1921 | 3038 |
| audio_ready_to_playback | 61 | 80 | 55 | 81 |
| commit_to_playback | 4769 | 4968 | 4045 | 4371 |
| commit_to_response_complete | 1293 | 1896 | 1751 | 2352 |
| commit_to_audio_complete | 16013 | 18519 | 12444 | 13606 |

Measured inter-phrase gap: median 1882 → 383 ms; p90 3346 → 1329 ms. This signed estimate compares next sample-clock start with the prior dataPlayedBack callback; callback latency can produce small negative values.

Connection reuse alone was insufficient: the intermediate five-turn series had a 4,639 ms median and 5,872 ms maximum to playback. The final first-clause series had a 4,045 ms median and 4,372 ms maximum, versus 4,769/4,968 ms before. There is no claim of eliminating first-response delay.

A repeated-text microprobe initially showed very fast warm synthesis. An alternating six-phrase comparison then showed that repeating text strongly affects this service: those attractive microprobe numbers do not establish latency for new replies. The full native test, not that probe, is the reported result. In the final sample, new first-phrase synthesis still contributes a 1,921 ms median before audio is ready; transcription and model work add their own delay. Edge was retained at the user's request; no Azure account, different voice or new provider was introduced.

## Validation and artifacts

- `tests/backend/check-edge-connection.py`: actual bundled framing/parser with fake transport; warmed reuse, unique request IDs, reset word clocks, stale retry before output only, no duplicated output after partial failure, cancellation and idle cleanup.
- `tests/backend/check-voice-warmup.cjs`: preparation creates no speech jobs and preserves voice/rate/pitch; preparation failure cannot fail a turn.
- Existing worker, phrase, conversation, tagged conversation, STT, provider, protocol, cancellation, memory and UI speech checks passed through `scripts/test-reply-latency.sh`. The new guards are included in that script and normal builds.
- Fifteen completed controlled native turns: frozen before, connection-only intermediate, final first-clause series. One interrupted untimed pilot is excluded and has no invented timing result. The connection-only session overlapped some functional checks; the final session did not overlap compilation or a broad test suite.

Raw timing JSONL, full reports, run outcomes, input definitions and source/environment receipt are under `build/voice-latency-20261022/`. `before-source/` freezes the original provider code for reproduction. `scripts/measure-v2-baseline.sh` now accepts `MIGHTY_BASELINE_SOURCE` for a frozen source directory. No saved keys or conversations were changed. Keeping a socket open for at most 20 idle seconds is the additional resource tradeoff; only one synthesis lease is active, with existing queue/backpressure bounds.

## Follow-up: user still experiences slow replies

The user checked the installed app and reported that voice still feels late. This confirms the original text-speed contract remains unmet; the earlier five-turn improvement was insufficient. Follow-up mode: **Improve**, same release-to-first-native-playback contract, with Edge/Ava and UI retained.

A provider-only probe exercised the installed bundle's EdgeTTS module with five fresh synthetic phrases, default rate/pitch, the same persistent worker and warmup. No microphone, saved conversation, STT or reply model was involved. First audio bytes arrived in 2,799–4,157 ms (median 3,332 ms). Complete MP3s were ready in 3,559–5,026 ms (median 3,790 ms). The per-request first-byte-to-complete wait was 371–870 ms (median 608 ms). This is a small sequential network sample, not a fixed service guarantee or a fresh end-to-end comparison. Raw results: `build/voice-latency-20261022/installed-fresh-phrases.json`.

Source inspection confirms `PlaybackEngine.downloadAndDecode` begins only after `speech.chunk.ready`, which follows full synthesis. Progressive decoding could remove some of the post-first-byte wait, but cannot remove the measured multi-second wait for Edge's first bytes. No speculative native decoder rewrite or provider/voice change was installed in this follow-up. The remaining service wait is unresolved; instant/text-speed voice has not been achieved.
