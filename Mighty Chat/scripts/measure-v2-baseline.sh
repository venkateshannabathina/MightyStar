#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
installed_app="${1:-$workspace_root/Mighty Chat.app}"
output_root="${2:-$app_root/build/wp0-baseline}"
test_bundle="$output_root/WP0 Baseline.app"
mkdir -p "$test_bundle/Contents/MacOS"
cp "$app_root/Resources/Info.plist" "$test_bundle/Contents/Info.plist"
clang -std=c11 -O2 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/AudioRing.o"
xcrun swiftc -O -D MIGHTY_VOICE_TESTING -module-cache-path /private/tmp/mighty-live-check-cache -framework Cocoa -framework AVFoundation -framework Security \
 "$app_root/Native/Settings/CredentialStore.swift" "$app_root/Native/Call/LiveCallRuntime.swift" \
 "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" "$app_root/Native/Call/CallProtocol.swift" \
 "$app_root/Native/Call/HoldToTalkKey.swift" "$app_root/Native/Bridge/BackendConnection.swift" \
 "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" \
 "$app_root/Native/Audio/PlaybackEngine.swift" "$app_root/tests/performance/measure-baseline.swift" "$output_root/AudioRing.o" \
 -o "$test_bundle/Contents/MacOS/MightyChat"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$test_bundle"
MIGHTY_DEBUG_PERF=1 "$test_bundle/Contents/MacOS/MightyChat" "$installed_app" "${MIGHTY_BASELINE_SOURCE:-$app_root}" "$output_root"
node "$app_root/scripts/report-v2-baseline.cjs" "$output_root/turns.jsonl" > "$output_root/report.json"
