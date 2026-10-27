#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$app_root/build"
xcrun swiftc -parse-as-library -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework WebKit \
 "$app_root/tests/streaming/check-webkit.swift" -o "$app_root/build/check-stream-webkit"
node "$app_root/tests/streaming/run-webkit.cjs"
