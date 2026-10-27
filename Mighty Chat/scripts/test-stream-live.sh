#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="$app_root/build/wp2-live"
bundle="$output_root/Stream Check.app"
mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
cp "$app_root/Resources/Info.plist" "$bundle/Contents/Info.plist"
cp "$app_root/../Mighty Chat.app/Contents/Resources/node" "$bundle/Contents/Resources/"
cp "$app_root/Sources/credential-agent" "$bundle/Contents/Resources/"
xcrun swiftc -O -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework Security \
 "$app_root/Native/Settings/CredentialStore.swift" "$app_root/tests/streaming/check-live.swift" -o "$bundle/Contents/MacOS/MightyChat"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$bundle"
"$bundle/Contents/MacOS/MightyChat" "$bundle" "$app_root/tests/streaming/measure-live.cjs" "$app_root/docs/wp2-evidence/live-compliance.json"
