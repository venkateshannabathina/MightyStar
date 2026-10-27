# Memory recall and overlay repair — 2026-10-20

Installed main app: `Mighty Chat.app`, Groq + Edge, separate synthetic `V2 Feature Check` character (Amber). Five trial flags remain on. Face Lab and debug are off in the running native app and backend (`runtime-flags.json`); source defaults remain off. Existing conversations/facts were not deleted or bulk rewritten.

## Memory

Semantic embedding can exceed its existing 20 ms window, especially during cold setup. Old extraction errors also put high-importance arithmetic questions into core context and ahead of actual user preferences. Added deterministic local word matching before bounded semantic retrieval, with at most four merged facts. It uses per-character eligible facts, never private turns, and does not wait for the embedding worker. The original vector score/threshold and deadline are unchanged. The deadline now falls back to the already assembled literal matches rather than always losing useful recall.

Recall eligibility uses the stored source turn: question-only, assistant-only and temporary-output claims do not enter core or relevant context. Stored records remain visible in the Memory editor/export. Absence of literal word overlap alone does not reject a paraphrase/translation. Explicit user edits clear the obsolete extraction-source link, so an edited fact remains authoritative. The memory prompt tells the model to prefer relevant facts over prior assistant guesses. No schema, public protocol or provider changes.

**Actual installed-app results:** On the first reply after the combined repair/restart, “What color is my imaginary bicycle?” produced **“Cobalt blue. Got it.”** Before that request, `cobalt` was absent from both the recent ten rows and summary (`before-live-restart.json`), so this was persistent fact recall. On the next restart, the older drink/turtle question produced **“Jasmine tea. Juniper.”** (`live-recall-results.json`, screenshots). The second check exercises the memory tiers together; it does not isolate semantic lookup from a possible summary contribution. Prior failed answers remain in `../../main-app-feature-check/`.

## Overlay

The old renderer destroys its Babylon scene on every `pagehide`, including a persisted WebKit page-cache transition; restoring that DOM leaves an empty canvas. The new lifecycle test reproduces this with installed old assets: model initially draws, but there are no visible canvas pixels after the persisted hide/show cycle. The repaired renderer retains the scene for persisted pages and refits on restoration. Nonpersisted disposal remains intact.

The native host also keeps the first navigation running when a duplicate view request arrives during bootstrap, retaining the latest configuration for `didFinish`. It reloads the trusted desktop entry point after WebKit content-process termination rather than leaving a transparent panel. The exact WebKit event responsible for every prior live blank capture was not separately traced; the persisted-page failure is independently reproduced, and the repaired combination is verified in the real app.

**Actual installed-app results:** Amber rendered after the repair/restart, after closing and reopening Overlay mode, and after a second full app restart. See `main-overlay-after-first-restart.png`, `main-overlay-reopened.png`, `main-overlay-after-second-restart.png`. The second restored overlay was brought forward with the ordinary view control. No Face Lab, inspect query or debug overlay was used. This verifies the selected model/local restart cases; it is not a claim about every model or all GPU/process failures.

## Verification

- `scripts/test-reply-latency.sh`: existing deadline/fences, memory/500-turn vector recall, routes, jobs, context budgets, providers, streams, protocols and UI, plus new lexical-timeout/source-filter/edit/delete/private/isolation tests and paraphrase/translation guards. Final log: `memory-regression-final.log`.
- Signed packaged Node SQLite, offline ONNX and real saved Groq card/reply/extraction pass: `memory-package.log`.
- Actual file-origin WebKit streamed chat, memory off/on: `stream-webkit.log`.
- Native host optimized build and production renderer build pass (existing deprecation/dependency warnings): `native-build.log`, `renderer-build.log`.
- New `scripts/test-overlay-lifecycle.sh` uses the native container, production assets and real MMD model. Old assets fail the persisted-page test (`page-cache-before/`, `page-cache-before.log`); repaired assets pass (`page-cache-after/`, `final-lifecycle/`). Post-restore pixel counts, hit masks and native snapshots are retained. Lifecycle events are deliberately dispatched by the isolated test; the real app is tested separately through normal controls.
- Existing player-speech bridge, idle UI lifecycle and Performance Director checks pass.
- Installed signature, source hashes, feature flags and rollback location are recorded in `../../installations/recall-overlay-20261020-174959.json`; the final paraphrase/translation compatibility follow-up is `../../installations/recall-compatibility-20261020-175744.json`.

Word matching and source classification are conservative heuristics; semantic lookup still has its bounded graceful fallback and ambiguous queries may need more context. No new latency distribution or human quality improvement is claimed. WP9 blind acceptance remains pending. This follow-up repairs the observed main-app failures; it does not start another work package.
