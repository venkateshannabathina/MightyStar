# Expressive Companion v2 progress

## 2026-10-20 — Main-app recall and overlay repair verified

Added a local word-match recall fallback within Memory v1 and source-based eligibility so old questions/output constraints no longer crowd out user facts; saved records remain intact. Preserved the 20 ms semantic deadline and added paraphrase/translation and timeout/edit/delete/privacy tests. Fixed renderer persisted-page disposal, duplicate native bootstrap navigation and WebKit-process recovery. Signed and installed the repair with rollback backups. In the actual Groq + Edge main app, the first post-restart reply recalled **cobalt blue** outside recent context/summary; another restart recalled **jasmine tea / Juniper**. Amber visibly rendered after both restarts and reopening Overlay. Related backend, signed memory package, WebKit, native/renderer builds and new failing-before/passing-after lifecycle checks pass. Five trial flags stay on; **Face Lab/debug stay off**. [Evidence and limits](fixes/recall-overlay/README.md). Human WP9 acceptance remains pending. Stop for review.

## 2026-10-20 — Installed feature verification: mixed; follow-up required

Checked the real Groq + Edge main app using a separate Amber test character. Initially observed smiling/victory arms and worried comfort expressions during speech. Memory stored real local embeddings but failed restart recall outside recent context/summary. Installed signed startup/dispatch/shutdown repairs and user-evidence extraction filtering with recoverable app backups; related backend, WebKit, signed package, expression and gesture checks pass. **Live memory recall still fails**, and a later overlay capture after restart showed controls without a visible character. Neither is marked accepted. Existing memories/chats preserved; five trial flags on, Face Lab/debug off, source defaults off. [Evidence, repairs and remaining failures](main-app-feature-check/README.md). No human acceptance/quality claim. Stop for review.

## 2026-10-20 — Main-app trial: streamed reply CORS repair

The owner's five-feature trial exposed `Load failed` in the real file-backed app. Successful NDJSON replies omitted the existing restricted CORS headers used by JSON replies. Added the same `null`-origin/token-header policy before streaming headers; authentication and flag-off behavior are unchanged. The actual WebKit/product-reader regression fails without the fix and passes with memory off/on. Related memory/stream/provider/protocol/UI checks pass. Installed and signed the repair with the five requested trial flags on and Face Lab/debug off; retried the failed message and verified a completed reply in the main app. A real Groq + Edge voice turn also passed with all five flags enabled: hold endpoint, transcription, streamed reply, synthesis, decode and native playback. [Evidence](fixes/stream-cors/) retains the failure and passing checks. Source defaults and the pending ten-person acceptance gate are unchanged.

## 2026-10-20 — WP9 automated regression ready; human acceptance pending

Ran the related existing/new backend, memory, parser/stream, Director/face, energy, gesture, idle, native/WebKit, provider, credential, network/audio and UI checks against an isolated source snapshot and freshly built signed candidate. Final checks pass after correcting stale portrait/message/idle assertions and allowing native device startup to settle before synthetic turns; original failures and diagnostics are retained. Added independent rollout/default/auth checks, a two-buffer native clock check and validated blind-study scoring. Production behavior is unchanged; **all section-12 defaults remain off**. Historical WP7 latency gates still pass; no new latency or quality improvement is claimed.

[QA results and limits](V2-QA.md), [test kit](wp9-blind-study/README.md) and [deviations](SPEC-DEVIATIONS.md) document the review. The owner has no participant results: **0/10 people, 0/100 ratings**. Prepared fixed prompts/profile, balanced concealed allocation and blank forms; no participants contacted or scores invented. The required blind old/v2 comparison remains pending, so **WP9 is not fully accepted**. Installed app, generated workspace bundles and prior WP receipts were not replaced. **Stop for owner review.**

## 2026-10-20 — WP8 completed for review

Added Face Lab to the selected-model preview behind **`MIGHTY_FACE_LAB` (default off)**: live morph weights, nine emotions, four phases, intensity, a full auto-demo, 32 channel gains and mapped/missing/fallback coverage. Authenticated, bounded calibration saves write model-keyed JSON to Application Support; normal `MIGHTY_EXPR_V2` playback reads saved overrides with the lab off. Normal face writes pause while the lab is open, and switching/closing clears its output. All flag defaults remain off.

Related existing/new checks pass, including four flag combinations, three actual MMD rigs × nine emotions, all phases, exclusive Float32 weights, stable head offsets, save/reload/failure/retry, normal playback persistence and GLB body-only fallback. Inventory is **50 models / 4,789 rows**, static coverage remains **40/46**, and isolated renderer build/typecheck plus authenticated character/call routes pass. Reviewed three emotion grids, the live weights panel and decoded demo footage; retain conservative unity defaults, with no owner-usage ranking or human-quality claim. [Implementation, checks and evidence](WP8-FACE-LAB.md) and [deviations](SPEC-DEVIATIONS.md) record the results. Generated source bundles, installed app and saved keys were not replaced. **Stop for review; WP9 has not started.**

## 2026-10-20 — WP7 completed for review

Added first-clause/approximately-25-character dispatch, per-character reply limits and ordered pre-token one-retry failover behind **`MIGHTY_STREAM_CHAT` (default off)**. Memory retrieval has a 20 ms deadline when memory and streaming are enabled; timing/gap export remains behind `MIGHTY_DEBUG_PERF`. Retained existing connection pooling, two-ready scheduler and post-response learning. Groq GPT-OSS keeps its code-compatible 900-token cap after a measured empty reply at 220; enabled requests use low reasoning. Deviations are logged; no WP8 work or default changes.

Related existing/new checks and full native typecheck pass. Real Groq + Edge: **20/21 completions**, first-token p50/p90 **0.51/0.80 s**, hold-release-to-native-playback **3.38/4.34 s** versus WP0 **4.36/5.88 s**; all measurable adjusted latency gates pass. All final successes and the failure are retained across two sessions. **Chunk pauses remain:** 34 transitions, signed p50/p90 **0.14/1.97 s**; no gap-free, acoustic, pose-onset or human-quality improvement is claimed. [Implementation, checks and limits](WP7-LATENCY.md), [full before/after table](V2-BASELINE.md), and [deviations](SPEC-DEVIATIONS.md) record the evidence. **Stop for review; WP8 has not started.**

## 2026-10-20 — WP6 completed for review

Added production upper-body gestures behind **`MIGHTY_GESTURES_V2` (default off)**, with shared AnimationLab tags/selection/mask rules, actual source-clip export, the existing `IdleMotion` retargeter, playback-aligned intent, pace, cooldown, nonrepeat, stale-turn fences and short cancellation fades. Gesture-only flags work without the expressive-face flag; GLBs remain body-only. No WP7 work or default changes.

New and related checks pass: all 12 tags on rendered MMD/GLB rigs, flag-off asset suppression, thinking restrictions, coalesced cues/cancellation, and native gesture-only phase/metadata delivery. Full paired checks cover 16,653 frames per rig across three idle styles with **zero additional hip/leg/foot transform drift**; additive head offsets remain stable. Existing AnimationLab, idle/foot/gaze, face, speech, streaming/player, protocol and network/audio checks pass, as do renderer build/typecheck and full native typecheck.

[Implementation, recordings and limits](WP6-PRODUCTION-GESTURES.md) and [deviations](SPEC-DEVIATIONS.md) record the evidence. No provider latency or human-rated quality improvement is claimed. Generated source bundles, the installed app and saved keys were not replaced. **Stop for review; WP7 has not started.**

## 2026-10-19 — WP5 completed for review

Added Edge `o`/digraph/silent-e spelling hints and native/browser playback energy behind **`MIGHTY_ENERGY_JAW` (default off)**. Valid energy scales existing cues or drives an audio-only jaw; the Director remains behind `MIGHTY_EXPR_V2`, and the energy flag also works independently with the legacy mixer. Snapshot versions and provider transport stay compatible. No Azure integration or WP6 work.

New and related checks pass: bounded PCM/RMS, silence/stale/cancel behavior, cue precedence, flag independence, browser cleanup/fallback, Edge generator flag modes, actual WebKit analysis, flag-off/on native call playback and rendered OpenAI-selected recordings using a clearly labeled recorded-audio HTTP fixture. Existing real Edge synthesis, authenticated network/audio, Director/face, streaming/player, provider and timing checks pass, as do renderer build/typecheck and full native typecheck. Enabled captured jaw peaks at about 0.82 and closes afterward; no live OpenAI service, latency or human-quality improvement is claimed.

[Implementation and evidence](WP5-SPEECH-ENERGY.md) and [spec deviations](SPEC-DEVIATIONS.md) record the limits. Generated source bundles, the installed app and saved keys were not replaced. **Stop for review; WP6 has not started.**

## 2026-10-19 — WP4 completed for review

Integrated the Director, exclusive v2 morph writes, fresh-base head/gaze offsets, trusted calibration loading and native/typed phase and sentence bridges behind **`MIGHTY_EXPR_V2` (default off)**. Speaking follows positive playback progress; completion, cancellation and stale-turn fences are checked. Missing face/eye controls degrade safely; gestures are queued only. No WP5 work or flag-default changes.

New and related checks pass, including three rendered nine-emotion grids, nine correlated browser-to-face onset trials under the proposed limits with clock uncertainty, an actual rendered 30-second speaking nonfreeze check, blink-footage comparison, actual GLB fallback, flag-off/on native hold/decoder/playback fixtures, legacy player/streaming/audio checks, renderer build/typecheck and full native typecheck. Static coverage remains 40/46. Native delivery is tested separately; physical key-to-pixel latency and human-rated quality are not claimed.

[Implementation, evidence and measurement limits](WP4-PERFORMANCE-DIRECTOR.md) and [code-informed deviations](SPEC-DEVIATIONS.md) record the results. Generated source bundles and the installed app were not replaced. **Stop for review; WP5 has not started.**

## 2026-10-19 — WP3 standalone engine completed for review

Implemented the owner-confirmed WP3 scope only: the supplied ExpressiveFace engine, sad preset, EB/EL and bilateral aliases, jaw fallback, validated calibration support, deterministic RNG and inventory checks. The entry is behind **`MIGHTY_EXPR_V2` (default off)** and has no production imports yet. Director and live renderer wiring remain WP4.

Checks pass: 36,000 frames across all 50 rigs produce zero invalid/unknown morph weights; coverage meets **40/46 usable models** for every non-neutral emotion (including sad), with six shortfalls and four opaque rigs reported. Aalto/Blackbird/Lucia engine scripts vary all facial groups across 90 three-second windows. Related legacy mixer, renderer timing, player speech, tagged call and protocol checks, renderer typecheck and isolated build pass (existing dependency warning).

[Engine/check details](WP3-EXPRESSIVE-FACE.md), [coverage](wp3-evidence/coverage.md), [unit evidence](wp3-evidence/unit-checks.json) and [deviations](SPEC-DEVIATIONS.md) record the exact method and limits. These are standalone/static checks; rendered QA, live onset measurements and calibration await integration. The reference reproduces 25/46 under this method, versus the spec's stated 26/46. **Stop for review; WP4 has not started.**

## 2026-10-19 — WP2 completed for review

Implemented only WP2 behind **`MIGHTY_STREAM_CHAT` (default off)**: shared tagged prompts/parser, clean typed HTTP streaming and call streaming, sentence metadata in memory/display caches, cancellation/retry/error handling, and legacy fallback. No Director or face/gesture driver changes.

New parser, call, route and UI checks pass, including 200 sentences × 200 random split patterns and assertions that directives never enter TTS or saved assistant text. Related existing provider, memory, phrase, protocol, timing, native network/audio and browser player checks pass; full native typecheck passes with existing warnings. Streaming memory context with 2,000 rows stays within budget (1,959 units; 2,458 with filled dynamic slots).

Real Groq sample: **21/21 explicitly tagged sentences across 10 synthetic replies** (five chat/five call prompts), plus two nonempty real Edge audio outputs. This small compliance sample makes no quality or latency claim. [Implementation/checks](WP2-STREAMING.md), [content-free evidence](wp2-evidence/live-compliance.json), and [spec deviations](SPEC-DEVIATIONS.md) record limits and code-informed decisions. The existing editor portrait-count failure remains as documented in WP1. **Stop for review; WP3 has not started.**

## 2026-10-19 — WP1 completed for review

Implemented only WP1 behind **`MIGHTY_MEMORY_V1` (default off)**: SQLite-owned context, compact/idempotent chat and call turns, local 384-dimensional BGE retrieval/dedupe, asynchronous facts and rolling summaries, bounded compiled persona/context, and native Memory edit/delete/export/forget/card controls. No UI history migration or WP2 work.

Acceptance checks pass: 2,000 stored rows keep the new request under 8 KiB; context is 1,908 token units (2,407 with filled dynamic slots), below the 2,827 limit; real offline embeddings retrieve a fact 500 rows later; deletion, private turns, retry IDs, summary cadence, background failures and forget races are checked. The signed-package/live Groq smoke test and native Memory-panel load/Save/Delete test pass; screenshot visually verified. Related provider/call/audio/bridge checks and native typecheck pass.

One existing editor check has a reproduced pre-WP1 portrait-count failure (4 versus 3); its code/assertion were not changed. Packaging choices, cache-documentation findings, exact test evidence, privacy/OS/tokenizer limits and deviations are recorded in [WP1-MEMORY.md](WP1-MEMORY.md), [V2-BASELINE.md](V2-BASELINE.md) and [SPEC-DEVIATIONS.md](SPEC-DEVIATIONS.md). Installed app and API-key configuration were not replaced. **Stop for review; WP2 has not started.**

## 2026-10-19 — WP0 completed for review, with code-informed face-metric exceptions

Finished timing-only instrumentation behind `MIGHTY_DEBUG_PERF` (default off): monotonic backend/native marks, first nonempty provider audio-byte hooks, final-only sentence boundaries, native hold-release and confirmed positive-sample playback observations, actual mapped expression-output observer, bounded content-free ring, authenticated clock probes/correlated JSONL export, percentile reporting and last-turn renderer overlay. Empty transcripts are timed; cancellation does not invent expression/audio completion. Existing call version 2 and renderer speech version 1 remain compatible. No WP1 or later package started, and no v2 flag default was enabled.

Measured the owner's only current combination, **Groq + Edge**, on this Mac with real STT, streaming LLM, Edge synthesis and native audio playback: **20 completed turns from 21 attempts**, including one recorded provider/playback failure. Hold release → confirmed playback: **p50 4.36 s / p90 5.88 s**. Maximum clock-alignment uncertainty ±0.569 ms, plus 40 ms playback observation cadence and unmeasured device output latency. The failed attempt's detailed timing snapshot was unavailable and is explicitly excluded from latency percentiles, not assigned zero. A separate 20-turn pilot is retained, not pooled. No latency improvement is claimed.

[Baseline, budgets and measurement limits](V2-BASELINE.md) include every per-delta p50/p90, raw correlated records, both refined-run outcomes, failure accounting, environment/source hashes and reproduction steps. Section 9 of the local spec copy now has baseline-based regression budgets. This is a controlled recorded-input provider/native baseline, not a human-microphone, acoustic first-word or Babylon-under-load benchmark. The current call sends neutral intensity 0 and has no listening/thinking face driver; those unavailable face metrics are logged in [SPEC-DEVIATIONS.md](SPEC-DEVIATIONS.md), rather than implementing WP3/WP4 here.

Validation passed:

- New timing checks: ring capacity, identity isolation, first occurrence, privacy projection, flag off, clock translation/import validation, authenticated export, missing-data handling and nearest-rank percentiles.
- New provider checks: first nonempty bytes before file readiness, once-only and cancelled callbacks, actual LLM request boundary, Edge helper legacy mode.
- New renderer checks: actual adapter/mixer expression writes, missing morphs and neutral output, no invented listening, once-only export, clock translation, overlay deltas, cancellation/reset and retry when the debug token/backend is initially unavailable. Native WKWebView overlay check passed; its screenshot was visually inspected and is labeled fixture data.
- New native timing checks: default off, captured release timestamps, monotonic deltas, first occurrence, 128-ticket eviction, identity isolation and allowlist.
- Existing checks: per-character providers, provider settings, Claude/Gemini routing, conversation, STT, phrase chunker/scheduler, Edge worker, face mixer, JavaScript and Swift protocol fixtures, call reducer/coordinator, authenticated call transport/character routes/native WebSocket upload, MP3 decode/live output, player speech and idle bridge. `scripts/test-network.sh` passed against final source.
- Existing real voice fixture passed with `MIGHTY_DEBUG_PERF=0` against the existing backend, demonstrating backward compatibility. Its first attempt timed out while another audio check was running; an isolated rerun passed. No specific cause is claimed for that timeout.
- Renderer TypeScript check and production webpack build passed (existing dependency warning); full native app source typecheck and optimized isolated measurement builds passed (existing deprecation warnings).

Only source, documentation, test artifacts and isolated build outputs were changed. The installed app and saved credentials were not replaced or modified. Architecture section 19 now links the new verification surfaces and measured baseline. **Stop here for owner review. WP1 has not started.**

### Earlier checkpoint

The initial WP0 checkpoint had timing scaffolding only and no real baseline. It has been superseded by the completed work and evidence above.
