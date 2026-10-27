#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
bash "$app_root/scripts/test-performance-director.sh"
python3 "$app_root/tests/audio/check-edge-cues.py"
node "$app_root/tests/audio/check-energy-renderer.cjs"
node "$app_root/tests/audio/check-energy-ui.cjs"
node "$app_root/tests/backend/check-provider-settings.cjs"
node "$app_root/tests/performance/check-provider-timing.cjs"
node "$app_root/tests/backend/check-edge-worker.cjs"
python3 "$app_root/tests/performance/check-edge-first-byte.py"
