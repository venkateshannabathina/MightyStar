# Idle presets in the main MightyStar app

The browser test's three base poses become the main character's idle system:
Male breathing, Female breathing, and Female 2 (the exact Dwarf Idle-2 clip).
Each selection loops continuously with subtle, intermittent glances. Male uses
35% pointer sensitivity during occasional glances; female styles look around
gently. The selected style is saved independently on each character.

## Design

- Keep the existing main companion renderer, lighting, appearance loading,
  face animation, desktop placement, and character proportions.
- Retarget the original clip data through the existing humanoid driver for
  both GLB and MMD characters. Bundle the data for offline startup.
- Close the animation seams and ease transitions between styles. Apply head,
  neck, and chest glances over freshly evaluated poses so offsets cannot drift.
- Show the selected idle immediately when a model opens. Pause freezes the
  animation and glance together; resume continues the same state.
- Store `profile.idleStyle` as `male`, `female`, or `dwarf2`. Existing profiles
  use Female until the user chooses. Expose choices through character controls,
  the desktop character menu, and the character editor.
- Forward desktop pointer positions at a bounded rate, suspending glances during
  dragging and menus. Retain existing transparent-window hit testing.

## Delivery and checks

1. Extract and verify the three source motions; test seams, style changes,
   pointer sensitivity, pause, and retargeting.
2. Wire persisted styles and pointer input through main, editor, and companion
   views. Build the production renderer and native app.
3. Exercise actual character rendering in isolated native WebKit and inspect the
   main app visually. Check both the local GLB and an available MMD character.
4. Update the workspace-root app with the validated build, retain its path and
   saved data, sign with the existing identity, and reopen it.

Recovery: `backups/Mighty Chat-before-idle-presets-20261016.app` at the workspace
root contains the previously installed app. Verification outputs live under
`Mighty Chat/build/idle-integration-review/`.

## Validation completed

- Focused skeletal tests cover the exact source clip hashes, startup pose,
  loop seams, rapid switching, contact grounding, reset, and 35% gaze limits.
- Direction checks use the real Hailey GLB and Jean PMX rigs. The glTF root's
  reflection and the PMX pitch convention are accounted for separately.
- UI bridge checks cover per-character persistence, rollback, startup restore,
  keeping pause across style changes, menu continuity, and pointer invalidation.
- Native pointer tests cover normalized coordinates, 15 Hz throttling, immediate
  invalidation, and resumption. Existing face and silhouette checks pass.
- The standard signed application build and its backend/native checks passed.

No live AI or microphone request is needed to exercise this idle engine.
