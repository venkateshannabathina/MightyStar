# AI and voice settings

Open Mighty Chat → AI Setup (⌘,) or the settings button beside the phone button.

API connections apply across the app. Paste keys into masked native fields and save once; blank fields preserve existing keys. Keys remain in macOS Keychain. The native app talks over bounded stdin/stdout pipes to the stable, separately signed `credential-agent`; both sides verify the other's signing identity. Keys never enter WebKit, profiles, browser storage, logs, files, or command arguments. The native process supplies them only to its authenticated local backend through the environment. Reads, saves, and reloads disable system password dialogs. Saves are successful only after reading the stored value back. The backend starts only after a complete saved-key snapshot is available.

The broker owns entries under `local.mightystar.connections.agent.v1`. macOS bound this locally signed app's old entries to its exact binary hash, so changing the UI binary broke access despite using the same certificate. The broker binary stays unchanged across UI builds. Build checks prevent accidental regeneration; a future broker update requires a versioned migration. Do not replace it casually. An older running native app can migrate its cached keys via its signed backend's create-only import operation. The broker authenticates both backend and native ancestor and returns only status codes for import. Older entries stay untouched; the migration creates no plaintext secret files and changes no global Keychain permissions.

Test Connection checks the provider's models endpoint without saving an edited key. Once saved, newly opened settings show the connection as available after relaunch.

Choose Groq or OpenAI for replies and transcription. Defaults are `openai/gpt-oss-20b` with Groq Whisper, or `gpt-4.1-mini` with `gpt-4o-mini-transcribe`. A custom reply model must support Chat Completions and the request options used by the app. Saving restarts the local backend and ends an active call so its provider cannot change halfway through a turn.

Character voice settings apply to the character selected when settings opened. Edge supports voice, speed, and pitch. OpenAI supports its built-in voices, speed, and delivery instructions through `gpt-4o-mini-tts`. Preview uses the edited voice settings; save a new API key first. OpenAI previews consume API credits. All voices are AI-generated.

OpenAI speech currently returns audio-only performance metadata: this endpoint does not provide word/viseme timing, and the app does not fabricate timing. Edge retains its existing heuristic mouth cues. Natural expressions and validated hands-free echo cancellation remain separate follow-up work.

Verification: mocked provider tests assert fixed provider URLs, credential routing, model selection, voice/speed/instructions, MP3 storage, and transcription requests. They do not prove live OpenAI account billing or model access. Never paste an API key into a test fixture.

Official references: [OpenAI speech generation](https://developers.openai.com/api/docs/guides/text-to-speech), [transcription](https://developers.openai.com/api/docs/guides/speech-to-text), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Hold-to-talk shortcut

Settings → Hold to talk enables the global modifier shortcut. Fn is the default for new installations; saved shortcuts are preserved. Control, Option, Shift, and modifier combinations are also supported. Only modifier state is sampled, every 20 ms on the main run loop; ordinary typed keys are not captured. The shortcut pauses while settings are visible. These are modifier choices, not an arbitrary-key recorder.

Pressing the shortcut starts a conversation with the selected character if needed. On the first connection, wait for Listening in the menu bar before speaking; subsequent turns reuse the ready session. Hold to record, release to submit, and hold again to interrupt output locally. Releasing before connection completes clears the pending hold, preventing delayed recording. End the conversation from the menu bar to release the microphone. Sleep and app termination release the hold and end the call.

The shortcut is native and independent of the chat/companion window focus. The existing menu-bar item shows Ready, Listening, Replying, or Speaking and offers Start/End conversation. Existing on-screen call controls remain as an alternative.

## Voice repair — 2026-10-17

Bundled Edge TTS is pinned to 7.3.1 (the 7.2.8 client returned HTTP 403 in a live test). A live Ava synthesis test passed after updating. Model replies are now saved on response completion rather than depending on successful audio playback. Speech service errors preserve the connection and the remainder of the model reply; a failed reply or transcription leaves the session ready for the next hold. Empty model replies report an error. Saved keys can be reloaded silently and checked in AI & Voice Settings; Save settings applies them to the backend.

Credential regression coverage: `tests/keychain/check-agent.py` checks saved-value verification, replacements, unchanged broker access from rebuilt native callers, untrusted-caller rejection, and a locked scratch keychain. `check.py` retains legacy-storage regression coverage. No automatic password-unlock path remains.

## All-character Edge defaults and reliable startup

Existing profiles and the new-character voice default migrate to Edge TTS once. Their existing Edge voice IDs, speaking speed, pitch, memory, and mute choices are preserved. The main Voice cards now select Edge voices instead of silently switching engines to OpenAI. OpenAI remains an explicit advanced option.

Before spawning the backend, the native app completes a single saved-key snapshot. Superseded startup requests are cancelled by identity, so a backend cannot launch with only some keys loaded. Saving a key succeeds only after reading the stored value back from Keychain. Failed saves keep the typed value and report the Keychain error. Blank fields preserve saved keys.

`tests/ui/check-edge-defaults.cjs` exercises migration and voice-card routing. `tests/backend/check-live-voice.swift`, compiled with `MIGHTY_VOICE_TESTING` into a separately signed test bundle, runs a spoken Edge fixture through the real hold endpoint, live transcription and model, Edge synthesis, MP3 decode, native playback, and completion acknowledgement. This does not synthesize a physical Fn press or replace a user microphone test. The production build contains no fixture injection method.

Live verification on 2026-10-17 passed against the installed app: a fresh signed test caller loaded the migrated Groq key silently, started the microphone, submitted a resampled spoken fixture through the real hold endpoint, received a Groq transcript and reply, synthesized Edge audio, decoded MP3, and completed native playback. Transcript: “Hello, please stay ready.” Reply: “Ready. How can I assist you today?” Physical Fn and user microphone confirmation are separate from the fixture test. Run `scripts/test-live-voice.sh` for the live fixture check; it uses a small amount of provider API usage.
