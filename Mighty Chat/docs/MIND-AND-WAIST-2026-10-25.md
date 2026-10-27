# Main app mood integration and pelvis repair

`Sources/companion-server.cjs` now invokes `Backend/mind/MindService.cjs` before every new typed reply. `ConversationSession` uses that same service for live-call turns. The service appraises the latest message with the preceding three conversation messages through the selected provider/key/model, then calls the original Python deterministic engine through a bounded stdin/stdout worker. There is no extra server to start, no new UI, and no change to the credential broker.

The canonical pure modules remain in workspace-root `mind/`; `scripts/build.sh` copies those exact files into `Backend/mind/mind/`. The native bridge needs only Python's standard library and works with the app's existing `/usr/bin/python3`; `MIGHTY_MIND_PYTHON` can select another interpreter. The standalone FastAPI/Groq SDK service retains its Python 3.11+ requirements.

Each character's mind state is stored in `~/Library/Application Support/Mighty Chat/Mind/mind.sqlite3`. `MIGHTY_MIND_ROOT` overrides that location. Test-specific `MIGHTY_MEMORY_ROOT` also scopes mind data beneath the test directory unless explicitly overridden. Directories use mode 0700 and the database uses 0600. No credentials are stored there. Turn receipts avoid reapplying an appraisal when a failed reply is retried with the same client turn ID; successful cached replies skip appraisal entirely. Private turns retain only a generic incident summary. The existing persistent memory and transcript service remains responsible for user facts and conversation history.

Appraisal uses temperature zero. `MIGHTY_APPRAISAL_MODEL` overrides the appraisal model; for Groq, `GROQ_APPRAISAL_MODEL` is also accepted. Otherwise the selected character model is used. Malformed or failed appraisal becomes neutral. An unavailable Python worker blocks the reply with an error instead of silently losing emotional continuity. The extra appraisal call adds latency; reply generation still streams as before.

The engine's final prompt tag is adapted to the existing main-app protocol: JSON mood fields for ordinary typed replies, existing sentence directives for streaming, and plain text for untagged calls. `annoyed` maps to the native `angry` enum; `excited` maps to `happy`. Sentence events and completion metadata use the engine's held mood. No animation or TTS engine was added or re-enabled. Character wording remains model-dependent, while decay and state transitions are deterministic.

## Waist and cloth

The supplied screenshots show Lynae and female Rover. Their `下半身` and `上半身` bones are siblings beneath `腰` and sit almost on top of each other. The old Hips→Spine direction used their tiny positional difference, which points downward in both models, as a calibration axis. That could rotate the pelvis close to upside down and twist skinning, belt attachments and the physics collision targets.

`model-viewer-clean/src/scene/idleMotion.ts` now checks whether the mapped spine is actually descended from the hips. For a sibling arrangement it uses the stable Hips→Neck torso direction. Conventional Mixamo/glTF parent-child chains retain their original calibration. Model files, vertex weights, authored constraints and saved bone corrections are not rewritten.

Cloth requires **Animation → Physics** to be enabled. With physics off, the authored dynamic chains remain unsimulated; that is particularly visible in Lynae's segmented skirt. The repaired animated targets let the existing gravity solver settle those chains without the inverted pelvis. Saved physics choices are respected.

## Validation

- All 28 standalone Python tests pass.
- Native bridge tests use the real Python engine and SQLite: restart decay, character isolation, retries, suppressed forgiveness, malformed-appraisal fallback, prompt preservation, emotion mapping and live-call injection.
- HTTP route tests exercise both JSON and NDJSON streaming: insult → neutral → apology, cached retry, exact appraisal temperature and mood context.
- Existing canonical-persona HTTP/WebSocket and authenticated call-transport regressions pass with offline provider fixtures.
- Actual cached Lynae (807 bones, 567 rigid bodies, 818 joints) and female Rover (580 bones, 405 rigid bodies, 561 joints) pass all three idle styles with an upright pelvis. Eight seconds each of real Havok simulation retain finite transforms and bounded motion.
- WebGL browser checks load the real PMX models and textures, enable gravity/cloth, and inspect both physics-off and physics-on views with no page errors. Review images are in `build/waist-review/`.
- Evelyn's existing real Havok regression, pose-gizmo, animation-tuning and provider-selection tests pass.
- The workspace-root `Mighty Chat.app` has the verified renderer/backend resources, is signed with its existing persistent identity, and was reopened at that exact path. Retrying the existing failed main-app chat returned a live reply successfully after restart. The prior resources and signature are archived under `backups/mind-waist-before-20261025-113506/resources.tgz`.

The exact decay timing discrepancies from the original spec are documented in the workspace-root README; this integration does not change those half-lives.
