# Idle animation update

Installed app: `/Applications/Model Viewer.app`
Original app backup: `../backups/Model Viewer-before-idle-2.app`

This source copy preserves the installed viewer's original interface. The only application source changes are `src/scene/idleMotion.ts` and its integration in `src/scene/sceneBuilder.ts`.

The bundled clip is converted from `<home>/Downloads/Idle-2.fbx`; its SHA-256 is recorded in `res/animations/idle-mixamo.json`. Rigged MMD characters enter the idle on initial load and when selected while playback is stopped. Playing a motion releases the idle; paused motions keep their pose. Models intentionally loaded without skeletons retain their existing behavior.

Validation: production build, application type check, `node tools/verify-idle.cjs`, visual playback on Hu Tao and Zhongli, physics enabled/disabled, dance play/pause, character switching, installed-app launch, and app signature verification. Installed `main.css` is byte-for-byte identical to the original app.

Build with `npm run build`. `skipLibCheck` avoids pre-existing incompatible third-party declaration files; application source remains strictly type checked. Dependencies currently use the original viewer's local `node_modules` via a symlink.

## Bind-pose correction

The final retargeter uses absolute FBX pose deltas and aligns each target bone’s rest direction to the source before calculating local rotations. This compensates for A-pose models instead of lowering their arms twice. It maps relaxed fingers, orders spine joints by their actual hierarchy, and temporarily releases foot IK during idle. Original IK states and rotations are restored when a motion starts.

The regression check uses Hu Tao’s actual PMX skeleton and the MMD runtime, verifies source-to-target arm and hand alignment over ten loops, checks finite transforms and bounded head position, and verifies pose/IK restoration. Pass a downloaded PMX path to `node tools/verify-retarget.cjs PATH`; default test fixture path is `/private/tmp/hutao-idle-test.pmx`.
