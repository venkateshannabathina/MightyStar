#!/bin/bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
app="$root/Mighty Chat"
temporary="$(mktemp -d /private/tmp/mightystar-runtime.XXXXXX)"
mount="$temporary/mounted"
cleanup() { hdiutil detach "$mount" -quiet 2>/dev/null || true; rm -rf "$temporary"; }
trap cleanup EXIT
repo=venkateshannabathina/mighty_star_web
gh release download v0.1.1 -R "$repo" --pattern 'MightyStar-0.1.1-macOS-arm64.dmg' --pattern SHA256SUMS.txt --dir "$temporary"
(cd "$temporary" && shasum -a 256 -c SHA256SUMS.txt)
hdiutil attach "$temporary/MightyStar-0.1.1-macOS-arm64.dmg" -mountpoint "$mount" -nobrowse -readonly -quiet
bundle="$mount/MightyStar.app/Contents"
codesign --verify --deep --strict "$mount/MightyStar.app"
for name in Python PocketTTS EdgeTTS Companion Symbols; do
  if [[ ! -e "$app/Sources/$name" ]]; then ditto "$bundle/Resources/$name" "$app/Sources/$name"; fi
done
if [[ ! -e "$app/Sources/symbol-assets.js" ]]; then cp "$bundle/Resources/symbol-assets.js" "$app/Sources/symbol-assets.js"; fi
if [[ ! -d "$app/Backend/vendor/memory/node_modules" ]]; then ditto "$bundle/Backend/vendor" "$app/Backend/vendor"; fi
if [[ ! -d "$app/Backend/memory/models/bge-small-en-v1.5" ]]; then ditto "$bundle/Backend/memory/models" "$app/Backend/memory/models"; fi
if [[ ! -x "$app/Sources/credential-agent" ]]; then
  xcrun swiftc -O -target arm64-apple-macosx13.5 "$app/Native/Settings/CredentialAgent.swift" -o "$app/Sources/credential-agent"
  shasum -a 256 "$app/Native/Settings/CredentialAgent.swift" | awk '{print $1}' > "$app/Sources/credential-agent.source-sha256"
fi
printf 'Runtime ready. Run bash "Mighty Chat/scripts/build.sh".\n'
