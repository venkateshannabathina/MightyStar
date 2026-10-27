#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(cd "$app_root/.." && pwd)"
output_root="${MIGHTY_BUILD_ROOT:-$app_root/build}"
app_bundle="$output_root/Mighty Chat.app"
deployment_target="$(uname -m)-apple-macosx12.0"
# The broker's binary identity owns Keychain entries. UI builds must reuse it.
if [[ ! -x "$app_root/Sources/credential-agent" ]]; then
  echo "Stable credential helper is missing. Restore it from the last signed build before continuing." >&2
  exit 1
fi
credential_source_hash="$(shasum -a 256 "$app_root/Native/Settings/CredentialAgent.swift" | awk '{print $1}')"
if [[ "$credential_source_hash" != "$(cat "$app_root/Sources/credential-agent.source-sha256")" ]]; then
  echo "Credential helper source changed. Prepare a versioned key migration before replacing its binary." >&2
  exit 1
fi
mkdir -p "$output_root"
# Package the canonical deterministic engine; the native bridge needs only
# Python's standard library, not a separately running FastAPI service.
mkdir -p "$app_root/Backend/mind/mind"
for module in __init__ config state engine store; do
  cp "$workspace_root/mind/$module.py" "$app_root/Backend/mind/mind/$module.py"
done
xcrun swiftc -O -parse-as-library -target "$deployment_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework AVFoundation "$app_root/Native/Audio/PocketAudioTuner.swift" -o "$app_root/Sources/PocketTTS/audio-tuner"
node "$app_root/scripts/build-symbols.cjs"
if [[ "${1:-}" != "--skip-renderer" ]]; then
  node "$workspace_root/model-viewer-clean/node_modules/webpack-cli/bin/cli.js" --config "$app_root/Renderer/webpack.config.cjs"
elif [[ ! -f "$app_root/Sources/Companion/companion.js" ]]; then
  echo "Renderer bundle is missing; run without --skip-renderer" >&2
  exit 1
fi
clang -std=c11 -O2 -mmacosx-version-min=12.0 -c "$app_root/Native/Audio/AudioRing.c" -o "$output_root/AudioRing.o"
rm -rf "$app_bundle"
mkdir -p "$app_bundle/Contents/MacOS" "$app_bundle/Contents/Resources"
xcrun swiftc -O -target "$deployment_target" -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework WebKit -framework Security \
  -framework AVFoundation -framework ImageIO "$app_root/Sources/main.swift" "$app_root/Native/AppEnvironment.swift" "$app_root/Native/Onboarding/OnboardingController.swift" "$app_root/Native/Companion/CompanionInteraction.swift" "$app_root/Native/Companion/PlayerChromeView.swift" "$app_root/Native/Settings/CredentialStore.swift" "$app_root/Native/Settings/AISettingsController.swift" "$app_root/Native/CharacterEditor/CharacterEditorController.swift" "$app_root/Native/Settings/UIControls.swift" "$app_root/Native/Settings/HomeBackgroundStore.swift" "$app_root/Native/Call/CallProtocol.swift" \
  "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" \
  "$app_root/Native/Call/LiveCallRuntime.swift" "$app_root/Native/Call/HoldToTalkKey.swift" \
  "$app_root/Native/Audio/AudioHost.swift" "$app_root/Native/Audio/EndpointController.swift" "$app_root/Native/Audio/InputLevelMeter.swift" \
  "$app_root/Native/Audio/PlaybackEngine.swift" \
  "$app_root/Native/Bridge/BackendConnection.swift" \
  "$output_root/AudioRing.o" \
  -o "$app_bundle/Contents/MacOS/MightyChat"
cp "$app_root/Resources/Info.plist" "$app_bundle/Contents/Info.plist"
for item in "$app_root/Sources/"*; do
  name="${item##*/}"
  if [[ "$name" != main.swift && "$name" != credential-agent-v01 ]]; then cp -R "$item" "$app_bundle/Contents/Resources/"; fi
done
cp -R "$app_root/Shared" "$app_bundle/Contents/Resources/Shared"
cp -R "$app_root/Backend" "$app_bundle/Contents/Backend"
cp "$(command -v node)" "$app_bundle/Contents/Resources/node"
/usr/bin/python3 "$app_root/scripts/sign-app.py" "$app_bundle"
node "$app_root/tests/protocol/check.cjs"
node "$app_root/tests/backend/check-phrase-chunker.cjs"
node "$app_root/tests/backend/check-conversation.cjs"
node "$app_root/tests/backend/check-mind.cjs"
node "$app_root/tests/backend/check-reactions.cjs"
node "$app_root/tests/backend/check-mind-routes.cjs"
node "$app_root/tests/backend/check-phrase-scheduler.cjs"
node "$app_root/tests/backend/check-stt.cjs"
node "$app_root/tests/backend/check-provider-settings.cjs"
node "$app_root/tests/backend/check-pocket-tts.cjs"
node "$app_root/tests/backend/check-pocket-assets.cjs"
node "$app_root/tests/backend/check-pocket-packs.cjs"
node "$app_root/tests/backend/check-character-providers.cjs"
node "$app_root/tests/backend/check-claude.cjs"
node "$app_root/tests/backend/check-character-cache.cjs"
node "$app_root/tests/ui/check-character-roster.cjs"
node "$app_root/tests/ui/check-onboarding.cjs"
node "$app_root/tests/backend/check-edge-worker.cjs"
node "$app_root/tests/backend/check-voice-openings.cjs"
node "$app_root/tests/backend/check-voice-warmup.cjs"
PYTHONPYCACHEPREFIX=/private/tmp/mighty-voice-python-cache /usr/bin/python3 "$app_root/tests/backend/check-edge-connection.py"
node "$app_root/tests/ui/check-edge-defaults.cjs"
node "$app_root/tests/ui/check-pocket-settings.cjs"
node "$app_root/tests/ui/check-player-speech.cjs"
node "$app_root/tests/ui/check-idle-bridge-vm.cjs"
node "$app_root/tests/ui/check-animation-tuning-vm.cjs"
node "$app_root/tests/animation/check-pose-gizmo.cjs"
node "$app_root/tests/animation/check-character-physics.cjs"
node "$app_root/tests/animation/check-character-framing.cjs"
node "$app_root/tests/animation/check-appearance-editor.cjs"
node "$app_root/tests/animation/check-facial-expressions.cjs"
node "$app_root/tests/animation/check-face-motion.cjs"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Call/CallProtocol.swift" "$app_root/tests/protocol/check.swift" \
  -o "$output_root/check-protocol"
"$output_root/check-protocol" "$app_root/Shared/fixtures"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Call/CallState.swift" "$app_root/tests/call/check.swift" \
  -o "$output_root/check-call"
"$output_root/check-call"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Call/CallState.swift" "$app_root/Native/Call/CallSessionCoordinator.swift" \
  "$app_root/tests/call/check-coordinator.swift" -o "$output_root/check-coordinator"
"$output_root/check-coordinator"
clang -std=c11 -O2 "$app_root/Native/Audio/AudioRing.c" "$app_root/tests/audio/check-ring.c" -o "$output_root/check-ring"
"$output_root/check-ring"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Audio/EndpointController.swift" "$app_root/tests/audio/check-endpoint.swift" \
  -o "$output_root/check-endpoint"
"$output_root/check-endpoint"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Audio/InputLevelMeter.swift" "$app_root/tests/audio/check-input-level.swift" \
  -o "$output_root/check-input-level"
"$output_root/check-input-level"
xcrun swiftc -module-cache-path /private/tmp/mightychat-swift-cache \
  "$app_root/Native/Call/HoldToTalkKey.swift" "$app_root/tests/call/check-hold-key.swift" -o "$output_root/check-hold-key"
"$output_root/check-hold-key"
echo "Built: $app_bundle"
