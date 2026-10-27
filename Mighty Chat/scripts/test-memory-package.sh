#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(dirname "$app_root")"
output_root="${MIGHTY_WP1_CHECK_ROOT:-$app_root/build/wp1-package-check}"
bundle="$output_root/Memory Check.app"
mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
cp "$app_root/Resources/Info.plist" "$bundle/Contents/Info.plist"
cp "$app_root/Sources/companion-server.cjs" "$bundle/Contents/Resources/"
cp "$workspace_root/Mighty Chat.app/Contents/Resources/node" "$bundle/Contents/Resources/"
cp "$app_root/Sources/credential-agent" "$bundle/Contents/Resources/"
cp -R "$app_root/Backend" "$bundle/Contents/"
cp -R "$app_root/Shared" "$bundle/Contents/Resources/"
xcrun swiftc -O -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework Security \
 "$app_root/Native/Settings/CredentialStore.swift" "$app_root/tests/memory/check-signed-package.swift" \
 -o "$bundle/Contents/MacOS/MightyChat"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$bundle"
"$bundle/Contents/MacOS/MightyChat" "$bundle" "$output_root"
