#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
output="${MIGHTY_RENDER_OUTPUT:-$app_root/build/overlay-lifecycle}"
mkdir -p "$output"
xcrun swiftc -parse-as-library -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework WebKit \
  "$app_root/Native/Companion/PlayerChromeView.swift" "$app_root/tests/companion/check-desktop-rendering.swift" -o "$output/check-overlay"
cd "$workspace_root"
MIGHTY_MEMORY_V1=0 MIGHTY_EXPR_V2=1 MIGHTY_ENERGY_JAW=1 MIGHTY_GESTURES_V2=1 MIGHTY_FACE_LAB=0 MIGHTY_DEBUG_PERF=0 \
  MIGHTY_RENDER_NATIVE_CONTAINER=1 MIGHTY_RENDER_MMD=1 MIGHTY_RENDER_PAGECACHE=1 MIGHTY_RENDER_OUTPUT="$output" \
  "$output/check-overlay" "$(command -v node)"
