# Facial editor validation

Completed against the newer native editor and cached Evelyn PMX, 24 October 2026.

- TypeScript typecheck and production renderer build passed. Webpack retains its
  existing optional OpenPBR material dependency warning.
- Native Swift compilation and the complete signed app build/check suite passed.
  Existing Keychain deprecation warnings remain.
- `tests/animation/check-facial-expressions.cjs`: complete 49-key extracted Evelyn
  inventory; all 14 presets, separate winks, five vowels, legacy Neutral migration,
  name-based identity under reordering, ARKit starter mappings, custom names,
  clamped/invalid weights, intentional clears and foreign-key isolation.
- `tests/animation/check-appearance-editor.cjs`: real Babylon morph targets,
  original shared materials, visibility/disposal, saved Neutral, temporary preview,
  reset and model isolation.
- `tests/animation/check-character-framing.cjs`: face crop at 1280×720 and 900×700
  with both inspectors excluded, alongside existing camera modes. Perspective
  proportions remain consistent.
- `scripts/test-facial-editor-native.sh`: real AppKit editor and WKWebView renderer;
  all 49 keys and 14 previews; author-alias search; numeric edit, undo/redo, preset
  switching, Neutral comparison, restoration of actual resting morph weights,
  native custom-expression creation sheet, save/reopen, Cancel and unrelated
  profile preservation. Test saves stay in memory.
- `scripts/test-animation-tuning-native.sh`: existing bone editor's paused edits,
  reset, undo/redo, saved settings and reopen check passed after the Facial changes.
- `tests/face/review-facial-defaults.cjs`: isolated headless Chrome, real Evelyn
  geometry, verifies every default's actual morph weights and captures all presets.
  Smiling and Happy were tuned after reviewing the rendered mouth/eye combinations.

Evidence is under `build/facial-editor-review/`: native and app-build logs,
`native-report.json`, `defaults/report.json`, individual expression captures and
`native-editor-final.png`. The previous source files are preserved in `originals/`.
The prior newer app is backed up at
`../backups/Mighty Chat-before-facial-editor-20261024.app`. The verified new build
is installed at `build/Mighty Chat.app` and has been promoted to the main
workspace-root `../Mighty Chat.app`. Full bundle comparison and signature
verification passed after promotion, and the main app was opened successfully.
Its prior version is preserved at
`../backups/Mighty Chat-main-before-facial-editor-20261024.app`.

Only expression authoring and saved Neutral are wired into runtime. Automatic
speech/emotion animation is outside this change. Unrecognized model keys need
manual assignment; a model with no morphs cannot acquire facial deformation
through this editor alone. Duplicate source names use occurrence IDs; reordering
indistinguishable duplicate names cannot be resolved automatically.
