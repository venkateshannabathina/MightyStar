#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="$app_root/build"
mkdir -p "$output_root/wp4-render-check/Resources" "$app_root/docs/wp4-evidence"
if [[ ! -e "$output_root/wp4-render-check/Backend" ]]; then ln -s "$app_root/Backend" "$output_root/wp4-render-check/Backend"; fi
clang -std=c11 -O2 -mmacosx-version-min=12.0 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/wp9-director-AudioRing.o"
xcrun swiftc -O -D MIGHTY_VOICE_TESTING -target "$(uname -m)-apple-macosx12.0" -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework AVFoundation \
 "$app_root/Native/Call/CallProtocol.swift" "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/Native/Call/LiveCallRuntime.swift" \
 "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/Native/Bridge/BackendConnection.swift" "$app_root/tests/face/check-director-native.swift" "$output_root/wp9-director-AudioRing.o" -o "$output_root/check-director-native"
node "$app_root/tests/face/run-native-check.cjs"
