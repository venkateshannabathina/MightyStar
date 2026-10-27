The main app now has a shared face compositor: playback-clock lip sync, emotional brows/eyes, varied blinking and subtle idle brow detail. Mouth ownership prevents expressions from fighting speech shapes. Four MMD characters are supported; the current Hailey GLB needs a facial rig. See [architecture, limits and validation](docs/FACE-MOTION-2026-10-25.md).

The main typed-chat and live-call paths use the procedural Python mood engine. Anger, trust and grudges persist per character across restarts; neutral follow-ups retain mood and apologies soften it gradually. The Node bridge preserves existing JSON and sentence-stream formats and keeps emotion tags out of spoken text. See [integration and validation](docs/MIND-AND-WAIST-2026-10-25.md).

Lynae and female Rover now use a stable torso axis for pelvis retargeting: their nearly coincident upper/lower body pivots no longer invert the waist. Their authored gravity, cloth, hair and collision rigs remain available through **Animation → Physics**. Turn Physics on for the authored skirt chains to settle naturally.

Voice replies use at most one context-appropriate opening chosen by the reply model, then continue the same answer. Matching Ava openings use complete cached recordings; direct or uncached replies remain the model’s own words. The independent hesitation/filler loop has been removed. See `docs/CONTEXTUAL-VOICE-2026-10-22.md` for behavior, tests and latency tradeoffs.

The chat follows the Siri reference with one viewport per turn: each new typed or spoken question slides to the top, with its answer below. Earlier turns remain available by scrolling. The compact bottom input switches to a glass voice sphere with speaker and keyboard controls. The character header and sidebar retain their existing layout. See `docs/SIRI-CHAT-2026-10-22.md` for reference timings and validation.

Current runtime: normal UI, saved characters, idle animation, native bone/physics editing, appearance visibility, facial expression authoring and the new unified automatic face controller. Body gestures, the older performance director and character creation remain disabled. The older removed engines stay archived outside the app at `../backups/idle-only-20261022/removed-systems-and-sources.tgz`.

The sidebar always uses the compact icon-and-avatar layout. Sidebar expansion, sidebar search, and Create character buttons are removed; avatar selection, Home, Apps, Invite & Earn, Settings, and existing-character editing remain available.

The chat roster is **Lynae, female Rover, Hailey, Lucy (Cyberpunk: Edgerunners), and Evelyn Chevalier**. Detailed linguistic rules, emotion rules and original, non-canon conversations live in `Sources/chat-personas.js`. Startup uses fresh, isolated chat identities while retaining old profile backups and transcript records. Existing voice, provider and visual settings carry forward for matching appearances. The separate `Sources/catalog.js` appearance/asset catalog and animation systems remain unchanged. Memory is enabled by default; it supports durable scoped recall, provenance, rolling summaries, correction/forget commands and bounded context. See [character grounding, migration, validation and limitations](docs/CHAT-CHARACTERS-2026-10-24.md).

# MightyStar desktop app

Home shows a background across the right pane, with no greeting or floating controls. **Settings → Background** offers six bundled photos and **Add background** for your own JPEG, PNG, or HEIC image. Imported images are copied into Application Support and the selection is remembered across launches. Backgrounds appear only on Home; conversations and other screens keep their existing surfaces.

Character creation has been removed. Existing characters open in a native AppKit editor through the character’s name → **Edit character**. The renderer fills the window with a neutral gray sky, fading grid ground and a cast shadow. A compact dark 344-point inspector with 22-point corners contains an AppKit segmented control with gray capsule artwork for **About**, **Character**, **Animation**, **Memory**, and **Agent**. The editable name pill stays at the bottom left. About shows role, personality and response style; greeting, purpose and examples sit under More options. The card sizes to its contents instead of filling the window. Character uses five compact portrait columns with a pinned search field; the world remains visible around the character. Memory provides per-character learned facts, editing, deletion, export and backend-context forgetting. Agent settings choose a provider and model per character, manage shared keys in Keychain, and load Edge TTS languages and voices dynamically. Model IDs remain editable when discovery is unavailable. Native Back/Cancel discard the draft; Save commits by character ID while preserving conversations and other profile fields. Drag to orbit, scroll to zoom and double-click to reset the scene.

The window button (or Command-K) opens companion view choices: **Chat, Overlay, Portrait, Player View, Screensaver, and Holographic**. Use Escape or **Ask · Open chat** from a companion menu to return to the conversation.

Selecting a character opens its 3D model in Overlay mode by default while keeping the chat available. The embedded character above the hold-to-talk button and the Docked view option are disabled.

The selected character also appears in the macOS menu bar beside the system status icons. Its menu provides Ask, character settings, idle pause/resume, and direct access to each view mode. Hold and drag the desktop character to move her. Right-click her (or click the shortcut pill) for the character menu. Right-click to reveal four short curved corner brackets, then drag a corner to resize proportionally. The desktop camera stays fixed; rotation, pan, and zoom remain available only in the character editor. Empty space around the Overlay character passes mouse input to the app beneath it.

The five chat characters use independent authored backend personas with explicit grounding and original examples. Learned user memory and chat history are stored separately for each character. Replies and live calls use the character’s selected Groq, OpenAI, Gemini or Anthropic provider/model, falling back to app defaults for older profiles. Gemini and Anthropic voice calls require a separate Groq or OpenAI transcription key. OpenAI and Edge voice choices are available through Voice settings when speech is enabled.

Spoken replies retain audio playback and word timestamps for captions. The body stays in its idle loop while the new face compositor blends saved Neutral, mood, mouth articulation and idle details. Speech gestures, the older performance director, Face Lab and Animation Lab remain disabled. The existing Facial editor's manual preview overrides automatic motion.

Choose **Settings → Account → AI & account setup** and configure your AI provider before chatting. The key is stored in macOS Keychain and is supplied only to the app's local backend. It is never written into the web interface or local storage. `GROQ_MODEL` can override the default `openai/gpt-oss-20b` model when the app is launched from an environment that sets it.

Local builds reuse a private signing identity under `~/Library/Application Support/MightyStar/Signing`, so Keychain recognizes the app across native rebuilds. Preserve this directory. The signing key lives in a dedicated keychain, its password file has user-only permissions, and no system-wide certificate trust is changed. `MIGHTY_SIGNING_IDENTITY` (and optionally `MIGHTY_SIGNING_KEYCHAIN`) selects an existing developer identity instead. Signing failures stop the build rather than reverting to an ad-hoc signature.

Saved API keys are owned by the stable, separately signed `Sources/credential-agent` rather than the changing UI executable. macOS can bind locally signed Keychain entries to an exact binary hash; the helper keeps that identity unchanged across app builds. The native app and helper verify each other's signatures before exchanging bounded private-pipe messages. Keys remain in Keychain, saves require a successful readback, blank fields preserve saved values, and the backend waits for all keys to load. The migration imports existing cached connections without exposing them to WebKit or writing plaintext files. `tests/keychain/check-agent.py` verifies access from rebuilt callers, replacement, untrusted-caller rejection, and locked-keychain behavior using synthetic keys. Preserve the helper binary; `scripts/build.sh` rejects missing or changed helper sources until a versioned migration is prepared.

The companion renderer is isolated in `Renderer/`. It reuses the Model Viewer PMX/BPMX loading, material setup and corrected idle retargeting, and loads bundled GLB models with Babylon's glTF loader. The native host starts a token-protected loopback backend for the renderer, Groq chat, and Edge TTS. Remote appearances download once to Application Support, including PMX textures, and reopen from disk; messages, personalities, memories, voices, and character choices remain in the existing local storage.

## Facial expression editor

Open the character's name → **Edit character → Editor → Facial**. Choose an
expression in the left list, inspect the face close-up, then combine the model's
actual keys in the right inspector. Check a key or move its slider; the numeric
field accepts an exact strength from 0 to 100. Search original names or the
author's English aliases, choose an anatomical group, collapse groups, or enable
**Active only** to inspect just the keys assigned to the expression.

The initial list contains **Neutral, Smiling, Sad, Angry, Happy, Surprised,
Closed, Closed (Right), Closed (Left), A, I, U, E and O**. Evelyn (the current
KON appearance) has 49 available keys and curated defaults for all 14 presets.
Other models receive starter mappings only for recognized keys they actually
contain. Unknown keys remain available for manual assignment; models without
morph targets report that no expression keys are available.

**New expression** creates a blank preset. **Expression options** also provides
duplicate, rename/delete for custom presets, restore suggested defaults and clear.
Undo/Redo is available for key edits and preset changes. **Compare neutral**
temporarily shows the resting expression; **Reframe** resets the face camera.

Edits remain in each expression when switching presets. Top-right **Save**
persists all expressions with the character; **Cancel** discards the entire
draft. Libraries are saved independently for each appearance within each
character. Original positional face settings migrate into Neutral. New mappings
use name-based key IDs, so reordering uniquely named morphs cannot change their
meaning. Author duplicates are disambiguated by occurrence.

The selected expression is an editor-only preview. Leaving Facial restores the
saved Neutral face, so a wink or vowel never gets stuck on the companion.
This release authors expressions; it does not add tracking or automatic lip sync.

See [reference review and plan](docs/facial-editor/PLAN.md) and
[validation](docs/facial-editor/VALIDATION.md).

## Visual pose editor

Open the character’s name → **Edit character → Animation**. The viewport frames
the whole character and displays green joint markers and connecting bone lines.
Click a joint to select it, then drag its red, green or blue rotation ring. The
selected joint is yellow. Drag the background to orbit and scroll to zoom.
**Show skeleton** hides the other markers while retaining the selected joint.
Controls are available for mapped body and finger bones; absent joints are
not shown in the viewport.

A ring drag freezes the current idle frame, applies the correction and resumes
the previous playback state on release. An already paused preview stays paused.
Each drag is one Undo step. **Precision rotation…** reveals local XYZ values;
strength, speed, bypass, Reset joint and Reset pose remain available. **Save**
keeps the draft on this character; Cancel discards it. Bone corrections follow
the character into all companion views and survive renderer reloads.

**Physics** enables the character's authored rigid bodies and spring joints.
**Jiggle physics** independently enables its authored soft-body joints while
hair and clothing keep simulating. Physics defaults off and both preferences
are saved with the character. Evelyn and Lynae include jiggle rigs; characters
without authored physics (including the current Hailey GLB) show the controls
as unavailable. The solver is bundled for offline use. Pause freezes physics;
ring drags suspend it and realign the bodies before resuming.

The editor also has **Snap 5°**, **Hand joints**, hover highlights, **Focus
joint**, **Reframe**, and a Space play/pause shortcut. Reset pose clears bone
corrections without turning off physics or changing playback speed.

This is a rotation editor; it does not yet provide IK hand/foot dragging or
anatomical joint limits. Manual leg edits can change foot contact. The shared
idle data and model bind poses are preserved.

See [implementation and validation](docs/ANIMATION-TUNING.md).

## Shared idle animation and Hailey

The main companion uses the browser prototype's three selectable idle base poses:
**Male**, **Female**, and **Female 2 (Dwarf Idle-2)**. Each pose keeps its own
breathing loop, with a smoothed ending and eased transitions between selections.
The app plays only the selected idle clip, without pointer tracking or added head motion. Pause freezes the idle loop; resume continues it.

Choose a pose in the character controls, the desktop character's **Idle style**
menu, or the native character editor. The selection is stored in
`character.profile.idleStyle` and follows that character across views and app
launches. Existing characters default to Female. The original clips are bundled
and retargeted through the existing proportional humanoid driver for GLB and
MMD rigs, preserving model scale and unmapped accessory bones. See
[`docs/IDLE-PRESETS-INTEGRATION.md`](docs/IDLE-PRESETS-INTEGRATION.md).

Hailey appears in the collection under **The First Descendant**, using the supplied photograph for the roster, chat avatar, editor, review, and desktop menu. Her model and portrait are bundled at `Sources/Characters/hailey/hailey.glb` and `Sources/Characters/hailey/portrait.jpeg`. The appearance key is `local/chars/hailey/hailey.glb`; both resources load offline through the authenticated asset route. The GLB embeds its textures. Exact asset identifiers, resolved resource paths, and embedded-resource validation prevent arbitrary local file access. The fixed roster includes this entry.

Rebuild the renderer after changing the idle engine or animation data. The regular app build copies the entire `Sources/Characters` folder into Resources; deployment must include that folder, the updated renderer bundle, and Backend assets.

GLB characters use neutral studio lighting, an original bundled HDR environment with prefiltered reflections, and ACES tone mapping in their PBR materials. Hailey's skin, suit, eyes and hair have separate reflection strengths; the embedded color, roughness, metallic and normal maps remain intact. Fine hair retains alpha blending with restrained reflections at transparent edges. A 512-pixel filtered shadow map adds subtle self shading from opaque character meshes, while companion canvases stay transparent. The character editor alone adds its gray grid environment and a separate shadow sun that does not change the character’s material lighting. Illustrated PMX/BPMX characters retain their original lights and material appearance. Bloom and ambient occlusion are disabled in this default profile. The rendering setup is independent of the shared idle sequence.

From the workspace root, run the focused checks below. The browser check requires Playwright and Google Chrome; set `NODE_PATH` to Playwright's `node_modules` directory if needed. Route/browser checks require loopback access; the native hover check briefly opens an invisible test panel without moving the pointer or changing app data.

```sh
node model-viewer-clean/src/scene/idleSequence.test.cjs
node model-viewer-clean/src/scene/idlePresets.test.cjs
node 'Mighty Chat/tests/ui/check-idle-bridge-vm.cjs'
node 'Mighty Chat/tests/backend/check-character-cache.cjs'
node 'Mighty Chat/tests/backend/check-character-routes.cjs'
node 'Mighty Chat/tests/ui/check-local-character.cjs'
node 'Mighty Chat/tests/ui/check-rendering-quality.cjs' baseline
node 'Mighty Chat/tests/ui/check-rendering-quality.cjs' after
xcrun swiftc -module-cache-path /private/tmp/mighty-hover-module-cache 'Mighty Chat/Native/Companion/CompanionInteraction.swift' 'Mighty Chat/tests/companion/check-hover.swift' -o 'Mighty Chat/build/check-hover'
'Mighty Chat/build/check-hover'
xcrun swiftc -parse-as-library -module-cache-path /private/tmp/mightychat-swift-cache -framework Cocoa -framework WebKit -framework CryptoKit 'Mighty Chat/tests/companion/check-idle-presets.swift' -o 'Mighty Chat/build/check-idle-presets'
'Mighty Chat/build/check-idle-presets'
```

`check-rendering-quality` captures Hailey, Lynae and Rover in full-body, portrait and selection views with identical paused poses and cameras. Run `baseline` before rebuilding; that resource snapshot is preserved on subsequent baseline runs. Run `after` after rebuilding, or pass a distinct label such as `after-balanced`. The offline check requires already cached Lynae/Rover assets and writes original transparent PNGs, neutral previews, before/after pairs and `quality-report.json` under `build/render-review/<label>`. It verifies lighting profiles, texture visibility, transparency, existing illustrated colors and active browser frame timing. It blocks remote asset requests and does not use the installed app.

`check-idle-presets` opens an isolated native WebKit renderer backed by the
local source bundle. It checks Hailey GLB and an already cached Lynae PMX, all
three idle styles, pose changes, finite skeleton transforms, and pause/resume.
Starting each new renderer with a saved style verifies the first binding uses
that style. Captures and the report are written under `build/idle-presets-review`.
It uses a temporary WebKit data store and does not alter installed app profiles.
The earlier `check-webkit` fixture documents the superseded two-clip sequence.


## Build

From the workspace root:

```sh
'Mighty Chat/scripts/build.sh'
```

This builds a separate ad hoc signed app at `Mighty Chat/build/Mighty Chat.app`,
including the native audio/call foundation, protocol fixtures, and renderer. Once
the renderer has built successfully, `build.sh --skip-renderer` speeds up native
iterations. `scripts/test-network.sh` runs the authenticated loopback transport
and native WebSocket handshake tests; the test requires local loopback access.
`MIGHTY_AUDIO_SPIKE=1` on the built executable runs an opt-in two-second native
microphone/output diagnostic and exits. The diagnostic may request microphone
permission. See `docs/LIVE-CONVERSATION-PROGRESS.md` for what the diagnostic has
actually verified and what remains to build.

`Sources/Companion` contains the built renderer. `Sources/EdgeTTS` contains the bundled `edge-tts` runtime and its license. The app bundles all Sources resources except main.swift, plus the Node runtime used by Model Viewer. The native host retains its file URL to preserve existing chats. The loopback server starts and stops with the app, binds only to `127.0.0.1`, and requires a fresh random token for every API request.

## Verified

- Renderer production build and native Swift compilation.
- Lucy and Lynae model loading and idle appearance.
- Existing-character editing and camera hide/show in desktop preview.
- Existing conversation retained after appearance changes and camera toggles.
- Character-specific prompt, history, voice, and speech preferences persist independently.
- Local API authentication, missing-key handling, Edge TTS generation, and protected audio delivery.
- Caption timestamps, playback cancellation, and audio continuity across companion views.
- Native app launch retains existing characters and loads the companion preview.
- App signature verification.

Original app backup: `backups/Mighty Chat-before-companion.app` in the workspace root.

## Desktop character controls

Overlay hit testing follows the animated renderer's alpha silhouette, including transparent texture cutouts and gaps between limbs. A separate mask is sampled at up to 30 Hz at one sample per logical point (capped at 512 × 1024); the native panel checks pointer routing at 90 Hz. Rendering stays at up to 2× Retina resolution. The mask does not alter visible pixels. Very faint pixels below 16/255 alpha pass through. Edges can lag by approximately a rendered frame; these are sampled boundaries, not a claim of mathematically exact hit testing.

Hold the character to drag her window across displays. The native drag keeps ownership until release. Right-click opens the glass character menu at the click location; menus are clamped inside the window and expand by clicking, never by hovering. Click outside or press Escape to dismiss both the menu and resize brackets; outside clicks still reach the app underneath. The four short curved corner brackets resize proportionally around the opposite corner. Only the small handles capture input; the empty area between them stays click-through. Right-click reveals the handles; the size button or Show area clears the menu so all handles are reachable. Menu controls remain clickable while the rest of the overlay passes input through.

Talk starts recording with a click; click Send recording to finish. The configured keyboard shortcut continues to work as hold-to-talk. Ask opens text chat. Send file opens the existing text-attachment flow. Footer controls mute voice, pause idle animation, show the corner resize handles, edit the character, and dismiss the companion. Voice mute applies to both active native call playback and subsequent spoken replies. No Telegram integration is shown.

The app remembers position and size per desktop view. Restoring a position checks that the character remains reachable on a connected screen. `tests/ui/check-desktop.cjs` runs a real cached-model browser check for mask updates, margins, camera lock, menu actions, bounds and dismissal. `tests/companion/check-mask.swift` checks mask decoding, holes, bounds and native coordinate conversion. Actual OS click-through and window drag require a native desktop check.

## Character downloads

Selecting a character or a model downloads it to `~/Library/Application Support/Mighty Chat/Character Assets`. The same files serve previews, chat companions, and desktop views. “Saved on this Mac” means the model and its texture dependencies are complete. Failed downloads can be retried by selecting the character again. Files survive app updates and backend restarts. Initial downloads need a connection; cached models still need local decoding and GPU setup when a view opens.

`tests/backend/check-character-cache.cjs` verifies disk reuse, PMX texture discovery, retries, bundled GLB/portrait loading, embedded resources, and path/symlink bounds. `tests/backend/check-character-routes.cjs` verifies authenticated model/portrait delivery, MIME types, HEAD requests, and traversal rejection. Cache reuse is checked with isolated model and texture fixtures.


## Desktop design system

The Apple Music-inspired palette uses coral `#FC3C44` and `#F94C57`, cool grey `#C2CAD7`, charcoal conversation surfaces and a deeper sidebar. Buttons, toggles, focus rings, character selection and desktop companion menus share these colours. Navigation icons stay grey and turn coral only when selected. Filled coral actions use dark labels for readability; voice identity colours and character artwork remain distinct.

The main window loads `design-tokens.css`, `mightystar-ui.css`, and `character-editor.css`. Shared tokens define the dark palette, spacing scale, type hierarchy, geometry, and motion. The old light-theme `companion.css` is no longer loaded by the main window. The 3D renderer and transparent desktop companion controls remain isolated.

See `docs/UI-POLISH-STATUS.md` for the delivered UI, validation, and service limitations. The reference plan and full navigation/state workflows are in `docs/MIGHTYSTAR-UI-PLAN.md` and `docs/MIGHTYSTAR-UI-WORKFLOWS.md`.

The isolated browser check is `tests/ui/check-reference-ui.cjs`; serve `Sources` on localhost port 8765 and run it with Playwright available. It checks the existing UI at four desktop sizes without connecting accounts, sending AI requests, or altering the native app's saved data.

`tests/ui/check-native-editor-bridge.cjs` verifies native draft isolation, identity-based persistence, existing profile/history preservation, invalid draft rejection and rollback when storage fails. `tests/backend/check-character-providers.cjs` verifies per-character model isolation, Gemini routing and transcription fallback. The browser creation fallback and wizard have been deleted. `tests/ui/check-idle-only.cjs` checks the normal UI/settings, removed endpoints with legacy feature flags enabled, and real GLB/PMX idle rendering with neutral faces. Older facial, gesture, director, and creation tests under `tests/` are historical and no longer describe the supported app.

## App used on this Mac

The 16 October optimization pass reuses silhouette buffers/encoded masks,
simplifies facial blending and avoids repeated native shortcut/hover work while
keeping the existing rendering and interaction settings. It also restores the
local HTTP server's bundled sidebar/background resources. See
[`docs/OPTIMIZATION-2026-10-16.md`](docs/OPTIMIZATION-2026-10-16.md) for measured
CPU results, visual/native validation, focused checks and the recovery backup.

The running app is the workspace-root `Mighty Chat.app`, which retains the existing file URL and saved data. `scripts/build.sh` creates a separate copy under `Mighty Chat/build/`; updating that build alone does not update the running app. After validation, quit the active app, back up and copy changed resources into the workspace-root app, re-sign and verify it, then reopen that exact path and check the changed workflow in WKWebView. Character roster scrolling uses standard `auto` behavior for programmatic positioning because the native host rejects the `instant` value accepted by Chromium.


## Player View

Choose **Companion view modes → Player View** for the Apple Music inspired square window. The selected live character replaces artwork, with portrait framing, rounded corners, native macOS window buttons, a glass utility pill and a lower vignette. The header can be dragged; window edges resize proportionally. Position and size are remembered separately from other views.

The utility pill contains **Subtitles**, **Change view**, and **Voice volume**, with coral active circles. Hover or click the speaker to reveal an inline volume slider in the same pill; click the expanded speaker to mute/unmute. Volume and mute affect both current/subsequent spoken chat replies and native live-call audio without changing macOS system volume or the character’s speech-enabled preference. The slider, mute and subtitle preferences persist across launches. Edge word timings drive short caption phrases using the actual playback clock. Providers without word metadata display the spoken phrase/reply during playback. Ending or cancelling speech clears captions; switching characters clears old speech. Player → Chat and Escape return to the same conversation without ending the voice session. The close button also returns to Chat; the existing desktop Dismiss character action still ends the call.

`tests/ui/check-player-speech.cjs` checks the real speech bridge with deterministic media fixtures: timestamp forwarding, playback clock, active volume/mute, view continuity and cancellation before audio arrives. It runs during builds. `tests/ui/check-player-view.cjs` loads the real bundled Hailey model in Chrome and checks layout from 320–700 px, toolbar access, volume/mute messages, timed subtitle phrases, stale playback, character changes and view selection. It uses synthetic speech metadata without contacting an AI or voice provider. The existing desktop and talk UI regressions also passed. See `docs/PLAYER-VIEW.md` for the checklist and validation details.

### Native Player View refinement

The installed desktop Player View uses `Native/Companion/PlayerChromeView.swift`: native clear glass on macOS 26+, SF Symbols, native window button rendering, NSSlider input, and NSMenu view choices. Earlier systems use NSVisualEffectView. It follows the supplied Music recording and macOS kit measurements (120 × 36 pt compact controls, 164 × 36 pt volume, 28 pt selection circles). Native pointer tracking owns reveal/fade and volume hover; the HTML toolbar is hidden in the native presentation. The browser toolbar remains a fallback. The character uses closer upper-body framing, and subtitle shading appears only while text is visible.

The study, extracted kit measurements, video contact sheet and Before/After review are in `docs/player-native-study/`. `tests/companion/check-player-native.swift` runs an isolated WebKit/native preview with bundled Hailey, control-geometry checks and sample caption timing, without modifying saved chats or contacting an AI provider. It is compiled alongside CompanionInteraction.swift and PlayerChromeView.swift with Cocoa and WebKit. `--stay-open` leaves it available for native visual inspection.
