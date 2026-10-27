#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
output_root="$app_root/build/context-openings-20261022"
bundle="$output_root/Context Eval.app"
mkdir -p "$bundle/Contents/MacOS"
cp "$app_root/Resources/Info.plist" "$bundle/Contents/Info.plist"
xcrun swiftc -O -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework Security \
 "$app_root/Native/Settings/CredentialStore.swift" "$app_root/tests/performance/eval-contextual-openings.swift" -o "$bundle/Contents/MacOS/MightyChat"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$bundle"
"$bundle/Contents/MacOS/MightyChat" "$workspace_root/Mighty Chat.app" "$app_root" "$output_root"
