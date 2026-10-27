#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="$app_root/build"
mkdir -p "$output_root" "$app_root/docs/wp5-evidence"
native_target="$(uname -m)-apple-macosx12.0"
clang -std=c11 -O2 -mmacosx-version-min=12.0 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/wp5-AudioRing.o"
xcrun swiftc -O -target "$native_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework AVFoundation \
 "$app_root/Native/Call/CallState.swift" "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/tests/audio/check-energy-snapshot.swift" "$output_root/wp5-AudioRing.o" -o "$output_root/check-energy-snapshot"
"$output_root/check-energy-snapshot" "$app_root/tests/fixtures/hello-there.mp3"
xcrun swiftc -O -D MIGHTY_VOICE_TESTING -target "$native_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework AVFoundation \
 "$app_root/Native/Call/CallProtocol.swift" "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/Native/Call/LiveCallRuntime.swift" \
 "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/Native/Bridge/BackendConnection.swift" "$app_root/tests/audio/check-energy-native.swift" "$output_root/wp5-AudioRing.o" -o "$output_root/check-energy-native"
node "$app_root/tests/audio/run-energy-native.cjs"
xcrun swiftc -parse-as-library -target "$native_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework WebKit \
 "$app_root/tests/audio/check-energy-webkit.swift" -o "$output_root/check-energy-webkit"
"$output_root/check-energy-webkit" "$app_root/Sources/companion-ui.js" "$app_root/tests/fixtures/hello-there.mp3" "$app_root/docs/wp5-evidence/webkit.json"
