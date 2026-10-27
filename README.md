# MightyStar

Native macOS character companion: chat, durable character memory, deterministic mood, voice calls, animation and expression editors, onboarding, and overlay/player views.

## Layout

- `Mighty Chat/Native` and `Mighty Chat/Sources/main.swift`: native app, Keychain connections and desktop surfaces.
- `Mighty Chat/Renderer`: Babylon renderer, face and body performance.
- `Mighty Chat/Backend`: local providers, memory, mood and call services.
- `model-viewer-clean/src`: customized viewer and idle engine; upstream MIT license retained.
- `mind`: standalone deterministic Python engine and API; see its README.
- Animation work folders: Blender tooling and asset preparation scripts.
- `Mighty Chat/docs` and tests: architecture, implementation notes and regressions.

## Build on Apple Silicon macOS

Install Xcode command line tools, Node 22+ (with `node:sqlite`), Python 3.11+, and GitHub CLI. Run `npm ci --prefix model-viewer-clean`. Bootstrap the large pinned runtime from the public release with `bash scripts/bootstrap-runtime.sh`, then run `bash "Mighty Chat/scripts/build.sh"`. Node must be on PATH. Build output is under `Mighty Chat/build`.

The runtime bootstrap copies Python, voice resources, native inference dependencies and prebuilt browser assets from the exact published DMG, rather than committing generated binaries and hundreds of MB of model weights. It creates a development credential broker from source if needed. The signer creates a private local development identity on first build; never publish its private key or password. This is a source snapshot; a fresh checkout build has not yet been validated end to end.

## Fresh release environment

Public downloads use bundle ID `org.mightystar.app`, separate WebKit storage and preferences, and `~/Library/Application Support/MightyStar/Release` for memory, mood, downloaded models and backgrounds. Development keeps its original identity and locations. There is no automatic import of development chats. Public updates retain public history; reinstalling is not a data reset.

API credentials remain in macOS Keychain. The release broker only accepts the signed public app. Runtime data, personal chats, credentials, signing keys, backups, logs, downloaded reference collections, duplicate upstream checkouts, and generated builds are excluded from this public repository. Original local files have been preserved. Large editable Blender projects are distributed separately as an asset archive.

## Checks

`node "Mighty Chat/tests/environment/check-isolation.cjs"` checks actual SQLite separation and persistence. The app build runs its protocol, backend, UI, animation and audio regression suites. Tests under `tests/` cover the standalone Python mind engine. The signed DMG is verified separately before release.

Third-party code and assets retain their original license/attribution files. No blanket license is asserted over third-party character assets.
