#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
for check in check-reply-latency check-memory-restart check-memory-recall-fallback check-fact-grounding check-embedding-lifecycle check-phrase-chunker check-phrase-scheduler check-conversation check-tag-parser check-tagged-conversation check-character-providers check-provider-settings check-claude check-stt check-turn-timing check-context-budget check-memory-jobs check-memory-store check-memory-routes check-stream-chat; do
 node "$app_root/tests/backend/$check.cjs"
done
for check in check-provider-timing check-conversation-timing check-perf-api; do
 if [ -f "$app_root/tests/performance/$check.cjs" ]; then node "$app_root/tests/performance/$check.cjs"; fi
done
node "$app_root/tests/protocol/check.cjs"
node "$app_root/tests/ui/check-stream-chat-ui.cjs"
node "$app_root/tests/ui/check-stream-submit.cjs"
node "$app_root/tests/ui/check-player-speech.cjs"
node "$app_root/tests/ui/check-memory-ui.cjs"

node "$app_root/tests/backend/check-voice-warmup.cjs"
PYTHONPYCACHEPREFIX=/private/tmp/mighty-voice-python-cache /usr/bin/python3 "$app_root/tests/backend/check-edge-connection.py"
