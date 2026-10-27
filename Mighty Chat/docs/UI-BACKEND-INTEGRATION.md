# Character workspace integration

The app keeps a fixed navigation rail, a boxed character list, and the conversation. The settings button opens a dark panel inside the conversation. Character creation and editing use Identity → 3D Character → Personality → Review. Appearance changes reuse the character ID, profile and conversation history. Desktop model views no longer replace or resize the character list.

## Data and credentials

Characters, their voice profiles and conversations retain the existing local storage keys. The UI never requests a saved API key. New values are sent once to the native host, cleared from password fields immediately, and saved in macOS Keychain. Native settings accepts only Groq, OpenAI and Anthropic and validates the selected character before saving. Startup Keychain reads are noninteractive and cached. An inaccessible key produces a setup message instead of a password dialog. The native AI Setup menu remains available for explicit Keychain unlocking.

The app is currently ad hoc signed. A macOS Keychain item tied to an older app signature may require a deliberate unlock after replacing that build. A stable developer signing identity is needed for distribution; this change does not weaken Keychain access controls or store keys in plaintext.

## Replies and voice

The local backend binds to 127.0.0.1. Requests and voice sockets require a random per-launch token. Credentials are supplied by the native host, never by saved character records. Groq and OpenAI use their chat-completions APIs. Claude uses Anthropic Messages, with system instructions separated from user/assistant messages and its own streaming event parser. Reply requests have a 45-second timeout. Stream events are bounded to 256 KiB and parsed independently of network packet boundaries.

Claude is a reply provider, not a transcription provider. Claude voice sessions use Groq transcription when its key is available, otherwise OpenAI. Voice output uses each character's selected Edge or OpenAI voice, speed and delivery controls. Fn is the default shortcut for new configurations; an existing saved shortcut remains respected and can be changed in the panel.

The microphone button, call button and native shortcut share one call state. The circular view reflects actual connection, listening, thinking, speaking and error states. Releasing the circle or shortcut commits audio. Keyboard mode ends the call and restores the conversation. Changing characters stops the previous call and speech. Settings save ends the current call and restarts the backend so new requests use the new connection.

## Verification

The build runs protocol, conversation, phrase scheduling, transcription, provider routing, Claude streaming, audio-ring, native call state and shortcut tests. Network tests cover authenticated loopback transport, native WebSocket/binary audio upload, phrase decoding and live microphone/output diagnostics. Browser checks cover the boxed list, dark panel, creator steps and circular voice mode at the native 1240×820 default and 880×600 minimum.

Provider-routing tests use simulated responses. Actual Groq/OpenAI/Claude billing, key validity and model entitlement must be checked with the user's keys. Appearance assets still use the existing online model library. The browser preview cannot access native Keychain or native microphone sessions; these require the built macOS app.

Anthropic protocol reference: https://platform.claude.com/docs/en/build-with-claude/streaming
