#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="${MIGHTY_BUILD_ROOT:-$app_root/build}"
mkdir -p "$output_root"
clang -std=c11 -O2 -mmacosx-version-min=12.0 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/wp9-AudioRing.o"
xcrun swiftc -O -target "$(uname -m)-apple-macosx12.0" -module-cache-path /private/tmp/mightychat-swift-cache -framework AVFoundation \
 "$app_root/Native/Call/CallState.swift" "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/tests/audio/check-multichunk.swift" "$output_root/wp9-AudioRing.o" -o "$output_root/check-multichunk"
"$output_root/check-multichunk" "$app_root/tests/fixtures/hello-there.mp3"
