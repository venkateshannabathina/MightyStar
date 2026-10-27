# WP3 — standalone ExpressiveFace

Completed for review on 2026-10-19. The owner explicitly split section 7: **WP3 is the engine, alias/calibration support, and inventory tests/coverage; the Director and live renderer integration are WP4.** No production face writer, event bridge, bone offsets, gesture playback or visual calibration was added here.

## Implementation

The engine in `Renderer/face/ExpressiveFace.ts` extends the original `ExpressiveFace.ts` from the supplied `files.zip`. A byte-identical reference is retained in `tests/face/fixtures/ExpressiveFace.reference.ts` (SHA-256 `9d412c254f86fec6d91c1bbf49466a4d215dc25b7f07f2d150bdf34b84eaf401`). It was not replaced with a fresh implementation.

The composition entry is `createExpressiveFace(names, {MIGHTY_EXPR_V2}, calibration, random)`: only boolean `true` or string `1` constructs an engine; all other values return null without initialization. The flag defaults off. The class remains independently constructible for deterministic unit checks. No production module imports it in WP3, including when an environment flag is set; WP4 will supply that wiring through the gate. All other section 12 flags remain unchanged.

Changes to the reference:

- Added the exact sad preset; model-facing emotions exclude thinking, which remains an internal thinking-phase preset.
- Added `FaceAliases.ts`: EB/EL, explicit Mouth/Eye/Brow families, full-width normalization, and complete bilateral control pairs. A pair replaces its aggregate control rather than driving both. Original morph names are always returned; no English-name translations or broad substring guesses are used.
- Eye `EL_*_OP`/`EL_*_CLO` pairs crossfade with blink state. Mouth jawOpen expression variants do not follow eye blinks. Existing closed-mouth emotion variants supply missing corner/smirk controls on EB/EL rigs.
- Retained mouth-expression attenuation by `1 - 0.6*jaw`, normalized eye-shape channels, blink suppression of open eye shapes, unsmoothed blink/wink curves, and 160 ms blink cycles. Initial and later spontaneous blink intervals use 2.2–5.2 seconds. Visual comparison to baseline footage is still pending integration.
- Added the generic jawOpen fallback only when no vowel channel maps; existing vowel families remain supported. This consumes provided vowel intent, not audio energy; energy-envelope work remains WP5.
- Added validated calibration gains (finite, 0–2), disabled logical channels, and exact named alias overrides. `FaceCalibration.ts` contains the data contract and validation. No tuned per-model JSON defaults or file loader are claimed; the adapter loader belongs to WP4 and tuning to WP8.
- Injected RNG, sanitized nonfinite/negative inputs and bounded output weights. Every owned route now returns zero as it releases, preventing stale nonzero weights when a future caller writes only returned morphs.
- Kept reference listening/thinking/head/gaze/micro-brow/sentence-pulse behavior as standalone outputs. `sentenceStart(emotion?)` can use the new sentence emotion immediately for the amused wink decision. It performs no rig writes.

`Renderer/tsconfig.json` now explicitly includes `face/**/*.ts`; previously unimported nested files would not be typechecked. Generated source bundles were not edited.

## Evidence and method

`tests/face/build-inventory-fixtures.cjs` parses all 4,789 exact original morph entries across 50 models from `PMX-FACE-KEYS.md`, preserving IDs, categories, indices, formats/types and source checksum. English names are intentionally not used for mapping. The four rigs with no author-categorized facial controls have opaque Other-category morphs; none is guessed as a face alias.

[Coverage JSON](wp3-evidence/coverage.json) lists every model's mapped channels/routes and counts per emotion. [Coverage table](wp3-evidence/coverage.md) is the readable counterpart. The reproducible method is 60 frames at 60 Hz, speaking phase, intensity 0.9, no vowel input/sentence pulse; count unique authored facial morphs above 0.01, excluding vowels/blink/wink. Neutral is reported but excluded from the ≥3 gate because its preset is empty. Micro-brow behavior is retained in both engines.

**40/46 usable models have at least three active non-vowel morphs for every non-neutral model emotion, including sad.** The six shortfalls are 03 Alice Thymefield, 21 Hanya, 23 Jean, 27 Neverness to Everness-Mint Swimsuit, 40 Saber, and 50 薄荷宿舍 (IDs, rather than names, are authoritative; see report). IDs 13, 36, 37 and 44 remain unmapped without errors. Under exactly this method the untouched reference gives 25/46, not the spec's 26/46; sad is absent from that reference comparison. No visual quality conclusion is drawn from these counts.

[Unit evidence](wp3-evidence/unit-checks.json) records 36,000 scripted frames across all 50 rigs: zero invalid weights, zero unknown morph writes, seeded determinism. Additional checks cover flag-off/no initialization, all vowel families/jaw fallback, malformed numeric inputs, intensity 1 versus 0.75, calibration aliases/gains/disable, blink/closed-eye pairs, direct wink curves, mouth attenuation and release-to-zero. Thirty-second speaking scripts on Aalto (01), Blackbird (07) and Lucia (24) vary all three mapped facial groups in all 90 sampled three-second windows. These are engine-output checks, not rendered-motion or live-audio checks.

## Checks run

`bash scripts/test-expressive-face.sh` passes:

- Inventory fixture checksum/count check, full renderer TypeScript check, new engine unit checks and coverage gate (at least 40/46).
- Existing face mixer, renderer timing, player speech, tagged conversation and JavaScript protocol checks.

An isolated production webpack build to `/private/tmp/mighty-wp3-renderer-check` also passes, with the existing Babylon OpenPBR filename-case dependency warning. Its main bundle contains neither ExpressiveFace nor the new flag gate, confirming the engine has no production import yet. Installed and generated source app bundles were not replaced.

Rendered emotion screenshot grids/recorded clips, visual calibration on three rigs, WP0 event-to-face onset measurements, exclusive morph writing, fresh-base bone offsets, and actual idle/listening/thinking/speaking transitions remain unperformed by design: they require the explicitly deferred live integration. No live face reaction or latency improvement is claimed. Stop before WP4.
