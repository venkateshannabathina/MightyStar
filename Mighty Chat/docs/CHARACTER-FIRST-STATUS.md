# Character-first interface

Reference inspected: installed Animates 1.0.14 (64), September 25, 2026.

Implemented in Mighty Chat:
- Character-first scene using the existing PMX/BPMX renderer and stored character.
- Floating hold-to-talk prompt with live conversation status.
- Character menu, quick-message composer, and scene/overlay/portrait/screensaver/holographic routing.
- Dark settings with Preferences, Companion, and API connections.
- Existing name/character editor, character switcher, TTS controls, and Keychain-backed API settings.
- Right Command added to hold-to-talk choices; existing Fn/Control/Option/Shift preserved.
- Desktop companion status and styling updated.

Validation: native build, existing protocol/audio/call/provider/cache checks passed. Running app scene, menu, and Preferences controls were inspected. No paid API requests or microphone recording were made for validation. This is not an exact A-to-Z replica.

Remaining differences:
- Proprietary models, animations, rendering, cloud behavior and response timing are not reproduced.
- Telegram integration, screen/camera/file sharing and subscription/account services are not implemented.
- Reference audio device selection, volume, launch-at-login, configurable view shortcuts and background controls are not implemented in this interface.
- Settings are an in-app panel rather than the reference's independent native settings window.
- Exact pixel matching across sizes and every reference state remains unverified.

Original changed files are in `backups/before-character-first` within the Mighty Chat project. Existing character/chat data and Keychain service identity are preserved.
