# Mighty Chat optimization — 16 October 2026

The workspace app was updated, verified with its persistent signing identity,
reopened, and checked in its native character editor. The changes preserve the
existing UI, rendering settings, character data and conversation formats.

## Skills applied

- [app-performance](https://github.com/Kirchberg/awesome-skills/tree/main/skills/apple-development/app-performance): source-supported corrections, matched measurements and functional validation.
- [code-simplification](https://github.com/addyosmani/agent-skills/tree/main/skills/code-simplification): clearer facial blending and shared hover results while preserving behavior.
- [babylonjs](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/tree/main/BabylonJS): renderer allocation review and verification of materials, transparency, skeletal motion and resource behavior.

All three are installed under `~/.codex/skills/`.

## Scope and performance contract

Mode: **Improve**. Target repeated CPU work in silhouette sampling, facial
blending, shortcut parsing and native hover routing. Keep visual fidelity,
speech blending, interaction timing, saved data and features intact.

For silhouette processing, compare identical 460 × 760 synthetic RGBA frames
with the same alpha threshold, dimensions, sampling times and native packets.
Measure milliseconds per accepted sample, lower being better, over seven
interleaved baseline/candidate runs after warm-up. Each run measures 180 frames.
Cover both unchanged and changing silhouettes. Acceptance requires identical
outgoing packets, including the 500 ms heartbeat, plus a lower median for the
unchanged case and no material regression for changing masks.

For facial blending, compare every morph weight across 3,600 frames covering
mouth poses, moods, blinking, stale snapshots, pause, completion, cancellation,
errors and reuse. Measure seven interleaved runs of 12,000 updates after warm-up.
Acceptance requires exact output equivalence and lower median CPU processing cost.

Environment: MacBook Air Mac14,2, Apple M2, 8 GB RAM, macOS 27.0.1, Node
24.20.0, production webpack renderer, installed Babylon.js 8.45.3. Native builds
use the installed Command Line Tools and the project's `-O` configuration.
Full Xcode/Instruments is not selected on this Mac; these measurements use
focused CPU harnesses and real browser/native WebKit validation.

## Changes

| File | Result |
| --- | --- |
| `Renderer/AlphaHitMask.ts` | Reuse packed buffers and compare mask bytes before base64 encoding. Unchanged masks reuse their encoded data while retaining the native heartbeat. |
| `Renderer/face/FaceMixer.ts` | Replace per-frame target maps and repeated channel arrays with direct channel lookups and one fixed channel/speed table. |
| `Native/Call/HoldToTalkKey.swift` | Reparse shortcut flags only when the selected shortcut changes. Settings are still read on each poll. |
| `Native/Companion/CompanionInteraction.swift` | Reuse the control/silhouette lookup results for mouse routing and hover notification. |
| `Sources/companion-server.cjs` | Restore HTTP delivery of the bundled sidebar, symbols, styles and home backgrounds already referenced by the UI. Keep an explicit file allowlist. |

Sampling remains up to 30 Hz, pointer routing remains 90 Hz, shortcut polling
remains 50 Hz, and the renderer retains its existing Retina scaling, lighting,
shadow quality, animation timing and continuous rendering behavior.

The mask retains two packed byte buffers, bounded at 128 KiB combined at the
maximum mask size, to avoid repeated buffer allocation. No canvas readback or
sampling precision is removed.

## Measurements

| CPU work only | Baseline median | Updated median | Change |
| --- | ---: | ---: | ---: |
| Unchanged mask, ms/sample | 1.2981 | 0.4761 | 63.3% less processing time |
| Changing mask, ms/sample | 1.3025 | 1.2735 | 2.2% less processing time |
| Facial blending, ms/update | 0.002796 | 0.001815 | 35.1% less processing time |

Unchanged-mask run ranges were 1.2895–1.3267 ms before and 0.4744–0.5272 ms
after. Changing-mask ranges were 1.2894–1.3052 ms before and 1.2658–1.2776 ms
after. Facial update ranges were 0.002754–0.002903 ms before and
0.001788–0.001845 ms after. After warm-up, 180 unchanged samples required zero
new encodings rather than 180; outgoing packets remained identical.

These are synthetic CPU measurements. They exclude canvas readback, GPU work,
actual Babylon morph application, total application CPU, battery usage and
end-to-end frame time. They do not establish an overall FPS or battery gain.
Shortcut/hover changes have source-supported savings but no quantified runtime claim.

## Validation

- Standard application build and its protocol, providers, conversation, speech,
  cache, worker, call lifecycle, audio and shortcut checks passed.
- New mask checks cover alpha boundaries, partial bytes, removed pixels,
  dimension changes, size caps, throttle, heartbeat and encoding reuse.
- New facial checks cover mouth poses, expression blending, speech smile
  attenuation, stale/unrelated snapshots, completion, clearing and reuse.
- Nine fresh before/after GPU captures passed for Hailey GLB, Jean PMX and Lupa
  BPMX in full-body, portrait and selection framings. All silhouettes matched.
  Hailey's three captures were pixel-identical. The largest other RGB mean
  delta was 0.004502 on a 0–255 scale, with at most 0.0163% of visible pixels
  exceeding the comparison's color-change threshold. The Hailey full-body pair
  was also visually inspected.
- Existing idle-sequence tests passed. Native WebKit checks confirmed the
  247-bone model, both full clips, endpoint holds and pause/resume.
- Native mask, anchored resize and hover checks passed. Actual native WebKit
  overlay/portrait tests received populated masks and rendered visible models.
- Browser desktop tests passed with a real animated model: mask updates,
  transparent margins, stationary camera, menus, resizing and dismissal.
- Native editor bridge and browser character checks passed for draft isolation,
  identity-based save, history/personality preservation and rollback.
- Desktop talk UI and authenticated character/animation route checks passed.
- New static-resource checks verified all 28 referenced UI/background files,
  matching contents, MIME types, HEAD responses and rejection of private paths.
- The reopened workspace app displayed existing saved characters/history and
  rendered Hailey in the native editor. The editor was cancelled without saving.

The existing local-character browser fixture was updated to verify the native
editor handoff before explicitly exercising its browser fallback. Its original
behavior assertions were retained. Visual QA now accepts
`MIGHTY_RENDER_REVIEW_ROOT` to keep a fresh baseline separate from prior reviews.

Live provider requests and microphone calls were not exercised. Existing
Babylon dependency filename-casing and legacy Keychain API deprecation warnings
remain outside this change. No reduction in fidelity or feature scope was used
to obtain the CPU results.

## Artifacts and recovery

- Running app: workspace-root `Mighty Chat.app`.
- Complete pre-update backup: `backups/Mighty Chat-before-optimization-20261016-084416.app` at the workspace root.
- Original touched source snapshots, benchmarks, build log, deployment hashes,
  JSON summary and fresh rendering pairs: `build/optimization-review/`.
- Native animation and desktop reports were copied into that review directory.
- Deployment verification confirms renderer/server bytes and the unsigned native
  executable payload match the validated build. App signatures were verified
  after installation. The native payload comparison removes signatures only
  from temporary copies; the app remains signed.

Run the new focused checks from the workspace root:

```sh
node 'Mighty Chat/tests/companion/check-hit-mask.cjs'
node 'Mighty Chat/tests/companion/check-face-mixer.cjs'
node 'Mighty Chat/tests/backend/check-static-resources.cjs'
```

The static-resource check needs loopback access. Adding `--benchmark` to either
renderer check compares against the preserved source snapshots and rewrites its
benchmark report. Use the existing build and native/browser checks for broader
regression validation.
