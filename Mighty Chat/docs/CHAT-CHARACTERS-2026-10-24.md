# Chat characters and scoped memory — 24 October 2026

The chat roster is Lynae, female Rover, Hailey, Lucy (Cyberpunk: Edgerunners), and Evelyn Chevalier. `Sources/chat-personas.js` is the shared browser/backend source for these identities. It contains a linguistic profile, emotion rules, evidence status, source links, and five original illustrative conversations per character. The examples are explicitly **not canon quotes**. Backends load this file in both source and packaged Resources layouts.

The earlier conversation reference supplied no readable assistant research or usable dialogue corpus. This implementation uses the following primary/public character material and marks interpretations rather than treating the prior conversation as verified evidence.

| Character | Grounding | Limits |
|---|---|---|
| Lynae | [Publisher character introduction](https://wutheringwaves.notion.site/Introduction-695ef7f91e4b82f5bbab01470cbf908c?pvs=21): bold, colorful, free-spirited, focused interior. Short published line: “Don't blink... you'll miss the best part!” | Everyday cadence and emotion intensities are adaptation choices. |
| Female Rover | [Kuro Games publishing overview](https://blog.playstation.com/?p=412034): protagonist investigating an unfamiliar region. | No complete verified female dialogue transcript was obtained. Calm curiosity and dry humor are provisional; player dialogue choices vary. |
| Hailey | [Nexon character profile](https://tfd.nexon.com/en/library/descendants/101000021): ranged combatant and sniper cannon. | This gameplay profile does not establish a personal speech style. Reserved kindness and mild off-duty hesitation are explicitly unverified adaptation choices. |
| Lucy | [CD PROJEKT RED character guide](https://cdn-s-cyberpunk.cdprojektred.com/cosplay-guides/LUCY_COSPLAY_GUIDE_EN.pdf): cool, quiet, mysterious netrunner. | Based on the indexed character description; the full large PDF was not ingested. Guarded cadence and dry irony are interpretations. The existing crossover appearance is retained without changing her Edgerunners identity. |
| Evelyn | [HoYoverse profile](https://zenless.hoyoverse.com/en-us/character) and [official demo page](https://zenless.hoyoverse.com/m/en-us/news/129782): decisive, professional, protective of privacy. Short published line: “Miss Yao is currently enjoying her private time and will not be taking any interviews.” | Full demo audio was not transcribed. Everyday cadence, warmth and emotion intensities remain interpretations. |

## Migration and scope

Startup creates exactly five stable `mighty-chat-v1-*` IDs. Old profiles are backed up once under `mightyChatRosterBackupV1`; old `mightyCharacterMessages` records are left intact, outside the active five chats. New IDs intentionally start fresh: old user memory, personality fields and compiled cards are not imported. Provider, voice, idle, appearance-specific expression, pose and other settings are carried forward from a matching existing appearance. Existing appearance variants for Lynae and female Rover can carry forward. Missing characters use the bundled catalog's default appearance.

`Sources/catalog.js`, model files, renderer code, animation behavior, account settings and credential helper are unchanged. The appearance editor keeps its existing catalog, including male Rover as an appearance option; the **chat identity** remains female Rover. This separation is deliberate. Backend canonical character rules are authoritative even if a saved profile contains another personality or an obsolete compiled card.

## Memory behavior

Memory is enabled by default in the server and native call/editor paths. `MIGHTY_MEMORY_V1=0` is the explicit rollback switch; it must apply to the whole app process so native and backend paths agree. Streaming retains its existing flag. Normal startup uses the existing authenticated compact request with character ID, client turn ID and current message. The browser does not upload the whole display transcript. Even the legacy rollback path now sends at most 24 recent messages.

The existing SQLite database persists turns, compiled cards, learned facts and rolling summaries under Application Support. Retrieval combines character-scoped lexical matches with local BGE semantic retrieval. Streaming keeps the existing 20 ms semantic retrieval cutoff and lexical fallback. Non-streaming waits for embedding completion or failure. If embedding fails, newly extracted/edited facts remain available to lexical retrieval with a zero-vector fallback. Similar-looking facts with different wording are no longer silently merged by embedding similarity alone.

Learned facts carry source-turn IDs, exact evidence from the user's statement, origin and timestamps. Explicit edits are marked `user_edit` and retain the original source-turn reference. Old facts gain an empty provenance object without losing their content. Exports include facts plus the summary watermark, context floor and revision. Summary instructions distinguish user statements from assistant suggestions. The summary is a model-generated approximation, not an authoritative fact store.

The native Memory editor supports viewing, correcting, deleting and exporting facts, plus forgetting this character's backend context. The same operations are available without model interpretation through these chat commands:

- `/memories` — list this character's facts and IDs.
- `/correct <id> <new fact>` — replace an existing fact.
- `/forget <id>` — remove one learned fact from recall.
- `/forget all` — remove this character's backend turns, facts, summary and request cache.

These commands return service confirmations without making an AI call. They are intentionally excluded from model history. They do not erase the visible transcript stored in the UI. Single-fact edit/delete also clears the rolling summary and excludes all earlier backend turns from subsequent prompts and summary folding; retained unrelated facts remain available. This conservative reset prevents an old transcript or summary from restoring a corrected/deleted fact, at the cost of losing some short-term conversational continuity. Epoch fencing rejects stale completions and prevents in-flight learning jobs from restoring forgotten data.

## Context and speech

The accepted current message, including attachments, is limited to 7,000 UTF-8 bytes and is preserved in full after redaction. Oversized inputs are rejected, not silently truncated. Earlier context uses at most nine turns with a shared budget; prompts include only the persona, bounded core/retrieved facts, a bounded summary, state and those recent turns. Slot caps live in `Backend/memory/Budget.cjs`. Known tokenizers use exact token counts with conservative slot allowances; unknown models use byte ceilings. Prompt size stays independent of total history length. Arbitrary custom model context windows are not automatically discovered; very small windows may need smaller caps.

Canonical cards are deterministic authored text, never model-compressed. JSON chat output and tagged streaming/call output retain their existing protocols. Character voice prose is shared between them. Generic cached acknowledgement choices are bypassed for the five canonical characters so they cannot flatten their distinct phrasing; ordinary synthesis, saved voice choices, cancellation and captions remain in place. These are linguistic characterizations, not actor voice clones. Automatic conversation animation remains disabled as before.

The default-on worker exposed an existing abrupt-shutdown problem. Server shutdown now awaits the memory worker's safe close before exiting, including cold startup.

## Validation and remaining gaps

The change is covered by 40 passing test scripts: new persona, 1,000-turn conversation, isolation, provenance, mutation fencing, additive database migration and installed-layout checks; existing real local BGE 500-turn recall, memory routes, streaming, WebSocket speech fixtures, provider routing, cached openings, cancellation, resource delivery, native editor browser bridge, physics/framing/appearance/facial logic and protocol checks. The 18 application Swift sources pass type checking with existing deprecation warnings. Tests use synthetic user data and offline AI/TTS fixtures; the local BGE checks use the actual bundled embedding model.

This validates routing, storage and context behavior. It does **not** validate perfect canon fidelity or the quality of real model output. Complete verified English dialogue corpora, blind character-voice evaluation, and physical-microphone checks remain outstanding. Subsequent signed rebuild, live provider, generated-speech and native audio checks passed as recorded below. Extraction and summaries depend on the selected provider and can fail; their background job queue is in-process and is not replayed after a crash. Evidence quotations support auditing but do not prove that every model paraphrase is entailed. Automatic semantic conflict resolution is not implemented; use explicit correction commands or the native Memory editor. Semantic recall is English-focused (BGE small English) and lexical fallback depends on word overlap. No cloud multi-user identity or cross-device synchronization was added.

The repository was initially entirely untracked in Git. A changed-file manifest and unified patch are therefore supplied separately rather than reporting an empty Git diff. The subsequent rebuild was installed at the original app path and launched successfully. The original pre-update app was backed up before installation.


## Signed rebuild and live verification

The 24 October follow-up completed the signed native build and all checks included in `scripts/build.sh --skip-renderer`, retaining the existing renderer. The original app path was updated and launched, with its previous bundle backed up and its exact credential-helper binary preserved. The native app displayed the five-character roster, Hailey's model, and the working Memory editor.

All five characters returned live Groq replies. A separate synthetic database passed fact extraction with provenance, retry reuse, recall after backend restart, cross-character isolation, correction, deletion and forgetting. Groq temporarily returned HTTP 429 during parallel checks; paced requests succeeded after cooldown. Existing user chats were not used for these tests.

Generated speech fixtures passed live transcription, reply generation, real Edge/Pocket speech synthesis, decoding and native playback. Physical microphone recording was bypassed. The Pocket test used muted playback; Edge exercised audible output.

All five default models loaded and animated; pause/resume and finite skeletal transforms were checked. These checks uncovered a hosted texture-directory mismatch: Lynae and female Rover PMX references use `Tex`, while the hosted directory is `tex`. `Backend/assets/CharacterCache.cjs` now retries only that specific case mismatch on HTTP 404, on the same allowed origin, and retains the original cache key. The new `tests/backend/check-character-texture-case.cjs` covers both models, offline reuse and failure bounds. Existing cache, route and packaged-persona checks also passed after the fix.
