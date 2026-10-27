#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
node "$app_root/tests/face/build-inventory-fixtures.cjs" --check
node "$workspace_root/model-viewer-clean/node_modules/typescript/bin/tsc" --noEmit -p "$app_root/Renderer/tsconfig.json"
node "$app_root/tests/face/check-expressive-face.cjs"
node "$app_root/tests/face/report-coverage.cjs"
node "$app_root/tests/companion/check-face-mixer.cjs"
node "$app_root/tests/performance/check-renderer-timing.cjs"
node "$app_root/tests/ui/check-player-speech.cjs"
node "$app_root/tests/backend/check-tagged-conversation.cjs"
node "$app_root/tests/protocol/check.cjs"
