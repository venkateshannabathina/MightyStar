#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="$app_root/build"
mkdir -p "$output_root"
native_target="$(uname -m)-apple-macosx12.0"
clang -std=c11 -O2 -mmacosx-version-min=12.0 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/wp7-AudioRing.o"
xcrun swiftc -O -D MIGHTY_VOICE_TESTING -target "$native_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework AVFoundation \
 "$app_root/Native/Call/CallProtocol.swift" "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/Native/Call/LiveCallRuntime.swift" \
 "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/Native/Bridge/BackendConnection.swift" "$app_root/tests/performance/check-reply-latency-native.swift" "$output_root/wp7-AudioRing.o" -o "$output_root/check-reply-latency-native"
node "$app_root/tests/performance/run-reply-latency-native.cjs"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache "$app_root/Native/Call/CallProtocol.swift" "$app_root/tests/protocol/check.swift" -o "$output_root/check-protocol"
"$output_root/check-protocol" "$app_root/Shared/fixtures"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache "$app_root/Native/Call/CallState.swift" "$app_root/tests/call/check.swift" -o "$output_root/check-call"
"$output_root/check-call"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/tests/call/check-coordinator.swift" -o "$output_root/check-coordinator"
"$output_root/check-coordinator"

xcrun swiftc -O -target "$native_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework AVFoundation \
 "$app_root/Native/Call/CallState.swift" "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
 "$app_root/tests/performance/check-native-timing.swift" "$output_root/wp7-AudioRing.o" -o "$output_root/check-wp7-native-timing"
MIGHTY_DEBUG_PERF=0 "$output_root/check-wp7-native-timing"
MIGHTY_DEBUG_PERF=1 "$output_root/check-wp7-native-timing"
bash "$app_root/scripts/test-voice-fillers.sh"
