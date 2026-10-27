# Clean public environment — 0.1.1

The original download reused `local.mightystar.chat`, the WebKit/preferences identity used during development, and hardcoded development memory/mood paths. On a development Mac a newly downloaded copy could therefore reopen existing test conversations. Re-downloading an app does not clear its local data.

The public app now uses stable bundle ID `org.mightystar.app`. macOS separates its default WebKit store and UserDefaults domain. Native startup pins backend memory, mood and character-cache roots under `~/Library/Application Support/MightyStar/Release`; inherited shell overrides cannot redirect public state to development. Custom backgrounds have a separate release directory. Public updates retain public state. No migration or deletion of development data occurs.

The release credential broker accepts the new signed public identity. Development packaging excludes that broker; the release packager recompiles it from source. The original development broker and Keychain service remain intact. The existing public credential service stays stable for connection continuity.

The release packager removes personal databases, database journals, logs, profile directories and signing material. It builds from the current validation output, rather than silently reusing the earlier 0.1 validation bundle.

Validation: existing signed app build/regressions; actual SQLite development/release separation and restart persistence; a native public-identity test proving inherited root overrides are replaced; clean bundle scan; bundled Python startup; deep strict codesign verification with local signing trust; DMG checksums/integrity; first launch showing the onboarding companion selection. Paid provider calls and physical microphone checks were not repeated for this storage change.
