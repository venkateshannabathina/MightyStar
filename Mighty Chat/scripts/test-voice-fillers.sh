#!/bin/bash
# Compatibility entry point: independent filler playback was replaced by contextual reply openings.
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
bash "$app_root/scripts/test-context-openings-native.sh"
