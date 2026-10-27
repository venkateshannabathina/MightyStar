# Visual bone pose editor

Entry: character name → Edit character → Animation.

The main editing surface is the character itself: green pickable joint markers,
connecting skeleton lines, a yellow selected joint and RGB 3D rotation rings.
The native Animation inspector shows the selected joint and compact transport,
Undo/Redo, skeleton visibility, strength, speed, bypass and reset controls.
Local XYZ sliders are secondary controls under Precision rotation. The viewport
uses full-body framing in Animation and returns to normal character framing
when leaving the tab. The skeleton is a separate utility layer and is disabled
in other app views.

Body and finger joints share the existing humanoid mapping. Missing joints are
omitted from the visual skeleton and disabled in the precision controls. The
inspector has room for a persistent macOS scrollbar. Save commits by character
identity; Cancel discards the draft. Each drag is one of up to 60 undo steps.

Settings are stored in `character.profile.animationTuning`:

```json
{
  "version": 1,
  "physicsEnabled": false,
  "jiggleEnabled": true,
  "enabled": true,
  "speed": 1,
  "strength": 1,
  "bones": {"Spine2": [8, 0, 0], "LeftShoulder": [0, 0, -4]}
}
```

Rotations are local Euler angles in degrees, clamped to ±180°; strength is 0–1,
speed is 0.25–2. Unknown sources, malformed rotation triples and nonfinite
numbers are ignored by the driver. Native drafts also sanitize saved input.
An absent setting uses normal speed and no bone corrections. Unset settings on
a newly loaded character clear the previous character’s tuning.

`IdleMotion` caches correction quaternions when settings change and composes
them onto freshly evaluated local animation rotations each frame. It never
writes the correction back into the base pose or animation assets. The existing
MMD runtime owns skeleton updates; GLBs retain their linked transform nodes.
A dirty flag reevaluates one frame with zero elapsed time when paused. Speed
changes affect animation time, not voice speed. Setting bypass disables bone
corrections; playback speed remains independently controlled.

`BonePoseEditor` uses Babylon's real RotationGizmo and a unit-scale proxy at
the selected joint. It renders pickable markers and skeleton lines through the
model in a dedicated UtilityLayerRenderer. Background mouse movement continues
to orbit the camera; picking a joint or dragging a ring does not orbit it.
The proxy's world rotation delta is converted to a bone-local correction using
the actual joint world matrix, including reflected glTF roots. Partial-strength
or bypassed offsets are baked to their visible correction before dragging, so
starting a drag does not snap the model. The idle clock is frozen for the drag
and its prior play/pause state is restored on release. Native bridge changes
are throttled during dragging with an unconditional final update on release.

This is a rotation editor. IK dragging, anatomical joint limits, keyframe export
and automatic foot pinning after manual leg edits are not included. Unmapped
accessory bones are not directly edited. Original animation files and bind poses
are unchanged.

## Physics and polish

Physics uses a stable `IMmdPhysics` adapter in the existing MMD runtime. When
off, it does not construct simulation bodies or load the Havok engine. The
first enable lazily loads bundled Havok WASM and builds the model's authored
rigid bodies, collisions and joint constraints. The skeleton is not rebuilt,
and idle time, bone offsets and camera state are preserved. The solver uses
MMD gravity units and 120 Hz substeps. The Havok license is bundled with it.

Jiggle physics identifies authored dynamic bodies by their soft-body/breast
bone names. The independent toggle masks only these bodies to kinematic mode
through the library's supported body-state interface; it never mutates the
model's original rigid-body states. Hair and cloth continue to simulate. Evelyn
has 10 jiggle bodies and Lynae has 6 in their cached models. No generated spring
rig is attached to an unsupported model. Current GLB Hailey has no physics rig.

Both flags are stored in animationTuning and survive the existing Save and
voice settings paths. Physics pauses with playback. During ring dragging it
suspends physics bone overrides, then realigns bodies before resuming. Off
releases bodies and constraints. Generation guards cancel stale asynchronous
loads on character switches, disable and view disposal. Loading/errors and
unsupported rigs have distinct native status messages. An explicit retry can
recover a failed initialization; normal pose edits do not repeatedly retry it.

Polish includes hover highlights and cursor feedback, 5° snapping, a separate
Hand joints option to reduce marker clutter, Focus joint, Reframe, Space for
play/pause, and camera offsets that remain proportional while zooming. Reset
pose resets bone corrections while preserving physics preferences and speed.

## Checks completed, 23 October 2026

- Real Havok WASM check on Evelyn: 137 moving bones, finite transforms,
  pause freeze, jiggle off/on and cleanup. Lifecycle checks cover independent
  masks, reset, disposal and stale initialization cancellation.
- Production renderer and TypeScript check passed (existing Babylon casing warning).
- Rotation-ring math passed for rotated parents, existing offsets, uniform scale
  and mirrored transforms. Babylon NullEngine checks exercise real utility
  layers, joint selection, connecting bones, gizmo drag lifecycle and cleanup.
- Production callback tests cover native undo boundaries, live setting updates,
  strength/bypass baking and restoring the initial play/pause state.
- Full native application compiled and packaged before the signing step.
- Real Hailey GLB: changed animated pose, exact bypass and reset, zero strength,
  rejected malformed inputs, 100 paused updates without accumulated rotation,
  and correct world-space ring turns on the actual reflected GLB skeleton.
- Actual cached Lynae and Evelyn MMD runtimes: changed spine pose, 100 paused runtime
  updates without accumulation, exact reset, and correct world-space ring turns.
- Original idle preset and sequence regressions, grounding and release passed.
- Renderer handler VM: pause/dirty refresh, bounded playback speed, fallback
  skeleton, source guard, and clearing settings when switching characters.
- Profile/desktop VM: saved tuning, desktop forwarding, voice-update protection,
  draft isolation, storage rollback, and existing menu/pause behavior.
- Character cache and supported roster regression checks passed.
- The dedicated native editor integration fixture compiles. Its live run and
  browser integration are blocked in this session because localhost listeners
  and browser launches are denied. Visual QA of the running editor is pending. App signing is also blocked by access to the persistent signing
  directory. The workspace-root signed app has not been replaced.

## Reproduce

The settings tab is now **Editor**, with **Face**, **Bone Animation** and
**Clothes** tools. Face exposes authored facial morphs (GLB targets or MMD face
categories). Clothes toggles real mesh visibility, or material parts for MMD
models with one combined mesh. Show all restores visibility. Face and clothing
edits live in the draft's `profile.editorSettings`, scoped by appearance key;
Save applies them to player/overlay loads. Cancel leaves the saved profile alone.
Voice settings preserve newer editor settings.

Editor mouse controls: left-drag orbits; right/middle-drag and Shift/Alt-drag pan
along camera axes at the current zoom; wheel zooms; double-click reframes.
Mouse-driven body reactions and their checkbox have been removed. Authored
physics, jiggle, and editor navigation remain available. Saved pointer-interaction
preferences are ignored. The front camera remains the default.

`check-appearance-editor.cjs` exercises visibility, material restoration and
disposal, morph bounds/categories, and appearance isolation.

The default camera is level and directly in front (alpha −π/2, beta π/2).
Character proportions now use the same default camera angle, position and
target in the editor, player, portrait and full overlay. Framing changes the
lens and projection crop, including the inspector inset. Previously player
close-ups moved the camera forward and raised its target while desktop views
also reset its angle, changing the apparent chest/head proportions. A real
Babylon projection test checks depth-separated landmarks across all modes and
window sizes, including correct crop centers. Interactive editor orbit and zoom
remain available; Reframe restores the shared defaults.

The real Evelyn physics test also compares saved-on startup with a later editor
toggle and compares 120 FPS with 30 FPS. Chest positions agree within .02 MMD
units for startup and .01 MMD units across cadences; chest rotation agrees within
one degree across cadences. These account for slight Havok contact-order
differences when rigid bodies are rebuilt. Live visual confirmation is pending.

Overlay physics timing fix: animation targets, MMD solvers, Havok and bone
feedback now advance together at 120 Hz. Previously only Havok was substepped;
slow overlay frames reused stale animated targets and could stretch the coat
across the screen. Automatic scene stepping is disabled to prevent a second
simulation pass. A frame advances at most 100 ms, discarding long sleep gaps.
The real Evelyn regression exercises 60/30/10 FPS, 250 ms stalls, wake-up,
pause, and both jiggle states, checking bounded bone positions as well as finite
matrices. The old timing path failed this animated displacement check at 30 FPS;
the corrected path passes 32 seconds with a maximum displacement of 6.14 MMD
units from the initial animated pose.

From the workspace root:

```sh
node model-viewer-clean/src/scene/idlePresets.test.cjs
node model-viewer-clean/src/scene/idleSequence.test.cjs
node 'Mighty Chat/tests/ui/check-animation-tuning-vm.cjs'
node 'Mighty Chat/tests/animation/check-pose-gizmo.cjs'
node 'Mighty Chat/tests/animation/check-character-physics.cjs'
node 'Mighty Chat/tests/animation/check-character-framing.cjs'
node 'Mighty Chat/tests/animation/check-appearance-editor.cjs'
node 'Mighty Chat/tests/ui/check-idle-bridge-vm.cjs'
'Mighty Chat/scripts/test-animation-tuning-native.sh'
'Mighty Chat/scripts/build.sh'
open 'Mighty Chat/build/Mighty Chat.app'
```

The native fixture runs an isolated editor with bundled Hailey, temporary profile
data and an unused credential service. It exercises paused editing, reset,
undo/redo, saving and reopening a draft. It leaves user profiles untouched. Its
review image is internal QA output under `build/animation-tuning-review`.
The regular build reuses the existing signing identity and stops on signing
failure. Do not replace the installed signed app with an unsigned build.
