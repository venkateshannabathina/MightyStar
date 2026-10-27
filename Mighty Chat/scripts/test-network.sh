#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
node "$app_root/tests/backend/check-call-transport.cjs"
node "$app_root/tests/backend/check-character-routes.cjs"
output_root="${MIGHTY_BUILD_ROOT:-$app_root/build}"
node "$app_root/tests/backend/check-call-transport.cjs" "$output_root/Mighty Chat.app/Contents/Resources/companion-server.cjs"
xcrun swiftc -target "$(uname -m)-apple-macosx12.0" -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Call/CallProtocol.swift" "$app_root/Native/Bridge/BackendConnection.swift" \
  "$app_root/tests/backend/check-native-connection.swift" -o "$output_root/check-native-connection"
"$output_root/check-native-connection" "$(command -v node)" "$app_root/Sources/companion-server.cjs"
xcrun swiftc -target "$(uname -m)-apple-macosx12.0" -module-cache-path /private/tmp/mightychat-swift-cache \
  -framework AVFoundation "$app_root/Native/Call/CallState.swift" \
  "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
  "$app_root/tests/audio/check-decode.swift" "$output_root/AudioRing.o" \
  -o "$output_root/check-decode"
"$output_root/check-decode" "$app_root/tests/fixtures/hello-there.mp3"
xcrun swiftc -target "$(uname -m)-apple-macosx12.0" -module-cache-path /private/tmp/mightychat-swift-cache \
  -framework AVFoundation "$app_root/Native/Call/CallState.swift" \
  "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/PlaybackEngine.swift" \
  "$app_root/tests/audio/check-live-output.swift" "$output_root/AudioRing.o" \
  -o "$output_root/check-live-output"
"$output_root/check-live-output" "$app_root/tests/fixtures/hello-there.mp3"
