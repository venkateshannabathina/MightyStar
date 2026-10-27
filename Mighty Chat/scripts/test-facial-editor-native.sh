#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
output="$app_root/build/facial-editor-review"
mkdir -p "$output"
xcrun swiftc -parse-as-library -module-cache-path /private/tmp/mightychat-swift-cache \
  -framework Cocoa -framework WebKit -framework Security \
  "$app_root/Native/Settings/CredentialStore.swift" \
  "$app_root/Native/Settings/AISettingsController.swift" \
  "$app_root/Native/Call/HoldToTalkKey.swift" \
  "$app_root/Native/CharacterEditor/CharacterEditorController.swift" \
  "$app_root/tests/companion/check-facial-editor.swift" -o "$output/check-facial-editor"
"$output/check-facial-editor" "$(command -v node)" "$app_root/Sources/companion-server.cjs" "$output"
