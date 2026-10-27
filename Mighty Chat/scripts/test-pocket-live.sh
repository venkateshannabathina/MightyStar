#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
app_bundle="${1:-$app_root/build/Mighty Chat.app}"
test_bundle="$app_root/build/Pocket Live Check.app"
mkdir -p "$test_bundle/Contents/MacOS"
cp "$app_root/Resources/Info.plist" "$test_bundle/Contents/Info.plist"
clang -std=c11 -O2 -c "$app_root/Native/Audio/AudioRing.c" -o "$app_root/build/VoiceTestAudioRing.o"
xcrun swiftc -D MIGHTY_VOICE_TESTING -module-cache-path /private/tmp/mighty-live-check-cache -framework Cocoa -framework AVFoundation -framework Security \
 "$app_root/Native/Settings/CredentialStore.swift" "$app_root/Native/Call/LiveCallRuntime.swift" \
 "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/Native/Call/CallProtocol.swift" \
 "$app_root/Native/Call/HoldToTalkKey.swift" "$app_root/Native/Bridge/BackendConnection.swift" \
 "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" \
 "$app_root/Native/Audio/PlaybackEngine.swift" "$app_root/tests/backend/check-pocket-live.swift" "$app_root/build/VoiceTestAudioRing.o" \
 -o "$test_bundle/Contents/MacOS/MightyChat"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$test_bundle"
"$test_bundle/Contents/MacOS/MightyChat" "$app_bundle"
