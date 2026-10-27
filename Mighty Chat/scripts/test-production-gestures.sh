#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
node "$workspace_root/model-viewer-clean/tools/export-production-gestures.mjs" --check
node "$app_root/tests/animation/check-gesture-controller.cjs"
node "$app_root/tests/animation/check-gesture-retarget.cjs"
node "$app_root/tests/animation/check-gesture-mmd.cjs"
bash "$app_root/scripts/test-speech-energy.sh"
node "$workspace_root/model-viewer-clean/src/scene/idleSequence.test.cjs"
node "$workspace_root/model-viewer-clean/src/scene/idlePresets.test.cjs"
node "$workspace_root/model-viewer-clean/node_modules/webpack-cli/bin/cli.js" --config "$app_root/tests/animation/webpack.config.cjs"
node "$app_root/build/animation-tests/check-rig.cjs" "$app_root/AnimationLab/assets"
