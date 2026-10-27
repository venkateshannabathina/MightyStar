# Installed main-app feature check — 2026-10-20

Follow-up: the failures below are retained historical evidence. The [recall/overlay repair](../fixes/recall-overlay/README.md) subsequently passed actual-app restart verification.

Result: **mixed; persistent memory does not pass end-to-end recall.** This is an actual installed-app check with Groq + Edge, not only unit tests. Added a separate `V2 Feature Check` character (`mvgjhwccg4q6z4j1656`, Amber/MMD). Existing user conversations and facts were not deleted or rewritten. Test prompts use imaginary preferences, pets and objects. The five trial flags remain on; Face Lab/debug remain off. Source defaults remain off.

## Observed behavior

- **Expressions and gestures were observed working during the initial live speech test.** The first celebration visibly smiled and raised both arms in a victory pose; its stored sentence event was `happy/0.8/victory`. The comfort reply visibly changed to a worried/downturned expression and lowered arms (`worried/0.7/-`); `comfort-speaking.png` records that capture. A later victory capture missed the active gesture and is named `rematch-late-capture.png`; it is not gesture proof. Metadata alone is not proof that a pose rendered.
- **Later overlay check is unresolved.** After the memory update/restart, the overlay capture showed controls but no visible character (`overlay-blank-after-restart.png`, `overlay-final.png`). It cannot count as a visual pass. Returned to the main test chat. Initial visual success does not establish reliable reload behavior or coverage of every model.
- **Memory writes and embeddings work.** The app stored jasmine tea, Juniper and a cobalt-blue bicycle, with real 384-dimensional local embeddings. After the grounding repair, the live garden statement was stored with a 1,536-byte embedding; the output directive was not stored (`post-grounding-live.json`).
- **Persistent recall fails.** Original preferences were absent from recent context after five filler exchanges; the first restart answer was “I’m not sure.” The fresh bicycle marker was absent from both the recent ten rows and summary before the later restart (`before-fixed-restart.json`, `before-grounding-restart.json`). Answers guessed “Blue” rather than recalling “cobalt blue”; repeated direct recall also guessed (`final-recall-results.json`). These failures are retained, not replaced by a passing summary-assisted test.

## Diagnoses and installed repairs

1. Cold context/tokenizer work consumed the existing 20 ms retrieval window. Registration now warms chat/call assembly; worker readiness includes a fixed local non-user inference. Ready embedding jobs now post synchronously rather than waiting another microtask before dispatch. Deadline and late-result/forget fences remain unchanged.
2. Worker shutdown during native ONNX inference could abort a diagnostic process. Close now queues native session release after outstanding inference, with bounded termination fallback. Real close-during-startup/inference tests pass.
3. Extraction had saved calculation questions, assistant arithmetic answers and temporary reply constraints as high-importance facts. Extraction now receives only user text and requires an exact source quote; a local guard rejects missing/invented evidence, questions and the tested temporary reply instructions. This is a conservative guard, not proof of full semantic entailment or every language's question syntax. Existing facts are preserved.

Installed both repairs as signed bundle updates with backups and receipts in `../installations/memory-startup-fix-*.json` and `../installations/memory-grounding-20261020-163921.json`. Installed memory files match source hashes. No credentials were printed or changed.

## Remaining limitations / acceptance

Memory is **not accepted as working reliably**. A disposable copy of the real synthetic character's database reproduces the deadline issue: first preparations 47.13 ms and 27.22 ms timed out and omitted the bicycle; a subsequent 24.27 ms full preparation included it (`final-context-diagnosis.json`; total includes post-retrieval assembly). This isolates a possible failure mechanism; it does not instrument or prove the exact cause of each live failed answer. Existing high-importance polluted facts also dominate ranking (`fresh-query-retrieval.json`). No automatic deletion/migration was performed. Changing the spec's deadline or silently rewriting existing memories was not used to manufacture a pass. The later blank overlay also needs follow-up.

## Checks

Passing related existing/new checks:

- `scripts/test-reply-latency.sh`: memory restart/dispatch, real ONNX lifecycle, grounding, storage/500-turn semantic retrieval, routes, background jobs, deadline/late fencing, provider/stream/protocol/UI/timing checks (`grounding-regression.log`).
- New grounding integration: assistant claims excluded from request; only exact eligible user assertions reach storage (`grounding-integration.log`).
- Actual file-origin WebKit/product streaming reader, memory off/on (`grounding-webkit.log`).
- Signed packaged SQLite, offline ONNX, real saved Groq card/reply/extraction, retry and memory controls (`grounding-package.log`).
- Expression inventory/coverage, renderer TypeScript, face mixer/timing and speech/protocol checks (`face-checks.log`).
- Production gesture export, 12-tag retarget/MMD preservation, controller/energy/native checks, idle and 26-clip rig checks (`gesture-checks.log`).

These automated passes do not override live failures. Prior WP9 ten-person blind acceptance remains pending. Stop for review with memory recall and overlay reload issues open.
