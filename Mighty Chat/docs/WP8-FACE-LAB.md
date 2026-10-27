# WP8 — Face Lab

WP8 only. `MIGHTY_FACE_LAB` enables the dev panel in the existing selected-model renderer used by the character editor/player. All section 12 flags remain off by default. No WP9 release run, rollout, provider benchmark or ten-person blind study has started.

## Use

Launch a source-built app with `MIGHTY_FACE_LAB=1`, open the selected character's model preview and click **Face Lab**. The panel has nine emotion buttons, four phases, intensity, an auto-demo, all 32 logical channel gains, live exact-name morph weights and configured runtime coverage (mapped, missing, related-channel fallback factors and paired eye keys). It previews the real loaded MMD rig. GLBs retain the existing body-only fallback and clearly report that facial calibration is unavailable.

The lab uses the existing renderer frame clock. Opening it suspends the normal face update; lab offsets restore the prior base before idle runs, and the lab writes after the fresh base. Closing or switching models removes/reset its output. No second animation timer, model loader or production morph writer is added. The scripted speaking mouth is synthetic and makes no speech request. Emotion intensity does not disable independent blink/micro motion.

Gain edits preview immediately. **Save calibration** writes `{gains, disable, aliases}` as `<sha256(appearance.key)>.json` in `~/Library/Application Support/Mighty Chat/FaceCalibration/`. Close after saving to reload the selected model; unsaved preview gains are discarded. Failure retains edits and offers retry. The token stays in the existing request header, never in calibration, the URL, UI inspection or files.

The authenticated `/api/face/calibration` route accepts reads with the lab or expressive-face flag, and writes only with the lab flag. This lets saved authoring data work in normal `MIGHTY_EXPR_V2` playback with Face Lab off. Valid saved data wins; bundled calibration is the fallback. Both flags off means no route/storage side effect or lab UI. Channel schema, finite 0–2 gains, 16 KiB caps, bounded alias lists, model-key hashing, private file permissions, atomic replacement and symlink/ancestor checks protect writes. HTTP never supplies a filesystem path. `MIGHTY_FACE_CALIBRATION_ROOT` is a trusted process-environment test storage override, not a feature flag or request field.

## Inventory and visual review

WP3 already supplied the verified Section 4 parser and canonical `inventory.json`. The requested `tests/face/build-key-fixture.py` entry delegates to that parser, verifies its source checksum, and writes/checks `fixtures/model-keys.json` with explicit Other/System-only exclusions. Counts remain **50 models / 4,789 rows**, with four opaque models excluded from facial assertions. Existing engine/static coverage remains **40/46 usable rigs**; availability is not visual correctness. English labels remain outside the alias language.

Reviewed nine-emotion images for Aalto (01), Blackbird (07) and Lucia (24). Retained explicit unity calibrations for those three QA models: this limited review did not justify extra amplification or disabling a morph. This is not a claim that these are the owner's most used models or that quality improved. The test's `.55` browWorry save is temporary and is not shipped. The normal playback check proves that value is read and applied with the lab flag off; real app calibration and keys are untouched by tests.

## Checks and evidence

`bash scripts/test-face-lab.sh` runs inventory, API and the related existing face/Director/player/stream/protocol checks. Add `--render` to build into `/private/tmp/mighty-wp8-renderer` and run the actual Chrome model/control checks (Playwright must be available, as for existing renderer checks). The optional rendered command also decodes the captured demo and creates contact sheets using `tests/face/review-face-lab.cjs`. Source bundles and the installed app are not replaced.

Actual rendered checks cover all four lab/expressive flag combinations, three MMD rigs × nine emotions, all phases, intensity/gain controls, agreement with actual Float32 morph weights, exclusive lab writes, nonaccumulating head offsets, save/close/reload, failed-save edit retention and successful retry, persisted normal playback, a full 24-second demo cycle, model-switch cleanup and the unsupported GLB path. API checks cover authentication, flag-off suppression, schema/hash/persistence/bounds and symlink/ancestor protection. Existing bounded JSON handling may disconnect an oversized request rather than deliver a 413 body; both are tested without weakening the body limit.

Review: [live panel](wp8-evidence/live-weights.png), [Aalto](wp8-evidence/01-grid.jpg), [Blackbird](wp8-evidence/07-grid.jpg), [Lucia](wp8-evidence/24-grid.jpg), [decoded demo](wp8-evidence/demo-contact-sheet.jpg), [recording](wp8-evidence/face-lab-demo.webm), [results](wp8-evidence/rendered.json) and [manifest](wp8-evidence/manifest.json).

Evidence in `docs/wp8-evidence/`: `rendered.json`, `01-grid.jpg`, `07-grid.jpg`, `24-grid.jpg`, the full original screenshots, `live-weights.png`, `face-lab-demo.webm`, `unity-defaults.json`, check/build logs and `manifest.json`. Screenshots and the demo are controlled developer previews, not provider audio, physical-input latency measurements or human quality ratings. All new/related checks, renderer TypeScript and isolated webpack build pass (the existing Babylon module-casing warning remains). Authenticated character/call route regressions pass. No Swift source changed, so no new native typecheck or app replacement was needed. Full result status is in `V2-PROGRESS.md`.

**Stop for owner review before WP9.**
