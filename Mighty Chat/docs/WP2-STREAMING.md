# WP2 — tagged streaming

Implemented 2026-10-19, awaiting owner review. `MIGHTY_STREAM_CHAT=1` enables the new path; unset/other values keep legacy chat JSON and plain call streaming. Memory remains independently controlled by `MIGHTY_MEMORY_V1`. No WP3/Director/face/gesture driver work is included.

## Behavior

`Backend/call/TaggedPrompt.cjs` supplies shared identity/style/directive rules and three short examples with emotion changes, plus a fourth from the character’s saved voice examples when a User/character pair is available. It uses the compiled persona when available, preserves identity and output-format isolation, and adds the live-call suffix only for calls. Character voice examples preserved in the persona remain character context.

`Backend/call/TagParser.cjs` handles arbitrarily split brackets, discards incomplete directives, clamps values, maps concerned to worried, rejects thinking as an emotion while allowing the documented thinking gesture, and keeps the first directive per sentence. Tagged text streams immediately after the directive, with `sentence.start` first. Missing tags wait for a production PhraseChunker boundary (without timed/clause flushing); the fallback applies monotonic two-second half-life decay, an exclamation bump, and low skeptical intensity for a question only with no active emotion. Unknown gestures become `-`. Malformed oversized directives/sentences fail with bounded buffers.

Typed chat uses authenticated `/api/chat` with newline-delimited JSON events: `sentence.start`, `assistant.delta`, then `response.complete` or `response.error`. Its browser reader handles split UTF-8/frame boundaries, cached JSON responses, early EOF and error cleanup. Rendering is limited to animation-frame cadence; completion saves one assistant row and speaks its clean reply once through the existing typed speech path. Calls use the same prompt/parser in the existing version-2 WebSocket/phrase/speech path, retaining acknowledgements, cancellation and generation fences. No directive reaches assistant display text, captions, TTS input or stored assistant content.

Sentence events are stored in backend assistant turn `meta` when memory is enabled (private turn metadata is omitted), and in typed display message `meta`. Native calls forward allowlisted sentence fields to display-cache `meta.turns`, including when memory is disabled. This bridge saves metadata only; renderer speech contract version 1 remains unchanged and no expressions are driven here. Cached call retries replay clean text/metadata without repeating audio.

For the supported Groq/OpenAI tokenizers, memory mode pools the existing 900+300+120 static allowance: the complete tagged format/examples fit first, and the card uses the remaining space. It never truncates directive grammar. With 2,000 stored rows the streaming context check measured 1,959 token units, or 2,458 with filled dynamic slots, within 2,827. The unknown-tokenizer byte-bound exception is recorded in SPEC-DEVIATIONS.

## Verification

New checks pass:

- `tests/backend/check-tag-parser.cjs`: 200 tagged sentences across 200 seeded random split patterns yield identical text and event sequences; split delimiters, duplicates, clamping, legacy mapping, absent tags/decay/punctuation, abbreviations, truncated tags and bounds.
- `tests/backend/check-tagged-conversation.cjs`: clean TTS phrases and saved text, sentence metadata, prompts, completion, cancellation/stale-generation suppression.
- `tests/backend/check-stream-chat.cjs`: real local HTTP/WebSocket transports with deterministic providers and real local memory embeddings; default-off JSON, authentication, feature discovery, streaming with memory off/on, retry cache, SQLite meta, provider-error recovery and clean speech chunks.
- `tests/ui/check-stream-chat-ui.cjs`: byte-split UTF-8/NDJSON, callbacks, token header, cached JSON, early termination/error, rollback.
- `tests/ui/check-stream-submit.cjs`: one saved row/speech request, metadata, failure cleanup, pending-state recovery, call metadata bridge/idempotency.
- Existing context-budget check also passes with `MIGHTY_STREAM_CHAT=1`.

Related existing checks pass: conversation; character providers; provider settings; Claude; STT; phrase chunker/scheduler; JavaScript protocol; turn timing; memory store/jobs/context/routes/UI; player speech; idle bridge; browser player layout, renderer and subtitles. `scripts/test-network.sh` passes source and existing packaged transport checks, authenticated character routes, native WebSocket upload, MP3 decode and actual native output. Full native source typecheck passes with existing deprecation warnings. The pre-existing editor portrait-count failure recorded in WP1 is unchanged; that unrelated editor suite was not rerun for WP2.

The first streaming context-budget run exposed slow repeated tokenization of an oversized fallback persona. Computing available card space before truncation fixed it; the final existing check passes unchanged. New route tests require localhost permission and reject external access in fixture mode.

## Real provider sample

`scripts/test-stream-live.sh` builds an isolated signed harness, reads the saved Groq key through the existing credential broker, and uses only synthetic inputs. It retains counts/timing diagnostics, no keys or reply text. [live-compliance.json](wp2-evidence/live-compliance.json) records five chat-mode plus five call-mode Groq `openai/gpt-oss-20b` streams: **21/21 sentences had explicit directives**, zero fallback or duplicate directives. Two clean replies produced nonempty real Edge MP3 output (`en-US-AvaMultilingualNeural`). These calls test the real provider/parser/TTS modules; HTTP/WebSocket transport combinations are checked with fixtures. They do not establish population compliance, subjective quality, physical microphone behavior, or a latency improvement. Diagnostic completion times include Edge synthesis on case 1 and must not be compared to WP0 playback baselines.

The installed app and credential configuration were not replaced. Stop for review before WP3.
