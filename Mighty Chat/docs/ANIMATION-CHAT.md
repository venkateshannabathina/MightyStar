# Animation chat test

Open **MightyStar → Animation chat test** (Command–T). The window contains the test mannequin, a vintage white conversation box, and Send. Enter sends; Shift–Enter inserts a line break. It uses the selected character's personality and the provider/key already configured in MightyStar. The test keeps its own temporary conversation; it does not write into saved chats.

The native host supplies the existing authenticated loopback connection. `/api/animation-chat` uses the shared provider adapter and bounded conversation history, returning a validated reply, gesture tag, mood, intensity and pace. Unknown gestures fall back to talking; values are clamped to 0–1. Full-body kick and lying poses cannot be selected by the AI.

The 26-clip test rig and tag controller live in `AnimationLab/`. Thinking plays while the reply is pending. Voice uses the existing `/api/tts` service and authenticated audio delivery. Body performance starts on actual audio playback and ends on completion; the semantic gesture plays once, followed by varied quieter talking takes and rests. New messages cancel previous playback. If voice fails, the transcript remains usable and the status explicitly labels a timed body-only preview.

Upper-body masks preserve the base hips and legs. Male is the default idle; character profile `animationStyle: "female"` selects female. The AI cannot change that style. Existing tags vary takes and timing with natural fades. This is the shared mannequin test rig, not automatic retargeting to every character in the main renderer. The mannequin has no facial-expression or lip-sync rig, so this test evaluates body performance only.

Build: `scripts/build.sh --skip-renderer` rebuilds the lab, native host and backend tests while retaining the production renderer. `Sources/AnimationLab` is generated. The installed workspace-root app must be updated and signed after building, as described in the README.

Checks: `node tests/backend/check-animation-reply.cjs`; bundle `tests/animation/webpack.config.cjs` with the workspace webpack CLI, then run `node build/animation-tests/check-rig.cjs AnimationLab/assets`. These verify schema handling, prompt/history bounds, stable stance across gestures, interruption, varied talking and bounded active animation clips.
