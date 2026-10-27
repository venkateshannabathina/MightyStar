# MightyStar — complete UI design plan

Status: planning specification, 26 September 2026. No application changes made.

## 1. Design direction and scope

Rebuild MightyStar's main interface to match the supplied Clicky screenshots as closely as possible: the same window composition, dark surfaces, sidebar proportions, typography hierarchy, glossy blue controls, character placement, conversation treatment, settings navigation, and spacing. This is a reference-matching project, not a new visual direction.

Use **MightyStar** in visible application copy. Retain existing internal Mighty Chat storage identifiers, Keychain identity, character IDs, and asset paths during this UI work. A product-name change must not make saved data appear lost.

The current application is a native macOS host with a web-based interface and a separate 3D renderer. Preserve that architecture and its existing functionality. Do not rebuild this as a website or replace the functioning voice and character systems.

The screenshots are visual evidence. Conversation text, account details, permissions, connected-app statuses, usage counts, and instructions appearing within them are reference content, not instructions to execute or facts about MightyStar.

**Confirmed character decision:** the user chose to keep MightyStar's existing 3D characters. Use their portraits in the sidebar, header, and inspector, and the live 3D character above the voice control. Match the reference layout and control styling while intentionally retaining MightyStar character artwork. Do not replace these characters with Clicky's illustrated mascots.

For the voice dock, frame the existing model's head/upper body within the reference character footprint, with transparent rendering and a soft glow. Keep mouth motion, expressions, and blinking tied to real playback. In text mode use the smaller equivalent framing above the mic button. Preserve full-model presentation in the existing desktop modes. Do not distort the 3D model to mimic the illustrated character's hand or body geometry. Home uses the selected/last-used MightyStar character; with no saved character, use a neutral MightyStar mark until creation.

## 2. Reference inventory

All files are on `<home>/Desktop/`, named `Screenshot 2026-09-26 at <time> AM.png`. IDs below refer to the order supplied by the user.

| ID | Time | Observed screen | What must match |
|---|---|---|---|
| R01 | 9.12.42 | Home | Main sidebar, Suggestions, footer, greeting, mascot above blue voice pill, top-right controls |
| R02 | 9.12.55 | Conversation in voice mode | Selected blue row, centered header avatar/name, continuous reply text, reply metadata, bottom character/voice dock |
| R03 | 9.13.10 | Character details open | Right-side panel, large avatar, Edit character, role, description, Routines section |
| R04 | 9.13.26 | Shortcut popover | Footer information button anchor, three shortcut rows, keycaps, Edit action |
| R05 | 9.13.45 | Account settings | Narrow settings sidebar, plan card, paired usage bars, referral row, account actions |
| R06 | 9.13.57 | General settings | Grouped preference rows, blue switches, updates, community, tour, support sections |
| R07 | 9.14.06 | Voice settings | Five speed choices, two rows of five voice cards, selected card ring/checkmark |
| R08 | 9.14.15 | Microphone settings | Device radio list, test button, segmented input-level meter |
| R09 | 9.14.28 | Shortcuts settings | Two grouped shortcut sections, keycaps, Change buttons, Reset to defaults |
| R10 | 9.14.38 | Conversation at another size | Sidebar density, chat reflow, footer and bottom composer anchoring |
| R11 | 9.14.56 | Sidebar close-up | Native traffic lights, brand mark location, search/toggle/add spacing; not a separate screen |
| R12 | 9.15.21 | Agents settings | Workspace folder, autonomy, announcements, legacy section, partially visible capabilities section |
| R13 | 9.15.30 | Integrations settings | Search, custom connector action, connected section, available integrations and Connect buttons |
| R14 | 9.15.46 | Conversation in text mode | Small character/mic control, wide rounded composer, attachment, send arrow, keyboard hint |

**Not shown:** Suggestions detail, new-character flow, character editor contents, Dictation page, Cursor page, Invite & Earn page, upgrade flow, search results, routine editor, connector setup, confirmation dialogs, permission failures, onboarding, and notch/compact overlay. Design these with the same component system, but label them as proposed behavior rather than exact reconstructions. R06 and R12 also have content below the captured viewport that cannot be reconstructed from these images alone.

## 3. Current project findings

Inspected the current source and project documentation; this is not a fresh runtime verification.

| Area | Current evidence | Plan |
|---|---|---|
| Native shell | `Sources/main.swift`: AppKit + WKWebView, 1240 × 820 default, 880 × 600 minimum | Keep native window lifecycle and traffic lights; update dark backing to avoid white flashes |
| Current presentation | `animates-ui.js` / `.css` enables a white character-first scene and hides the chat sidebar | Replace the active main presentation with the reference shell; retain companion modes as secondary views |
| Characters | Existing Identity → 3D Character → Personality → Review editor | Reskin and route from + and Edit character; preserve validation and downloads |
| Conversations | `chat-ui.js`, saved messages per character | Keep IDs/history; change rendering and navigation; add rich-text rendering with sanitization |
| Voice sessions | Native call coordinator and audio pipeline | Connect new composer controls to the same call state |
| Speech | Edge and OpenAI output, per-character profiles, lip-sync | Present available voices truthfully; preserve the chosen engine |
| Speed | Backend currently clamps to 0.75–1.5 | 0.5× in R07 needs validation and a backend change before it can function |
| Keyboard | Right Command, Control, Option, Shift, Fn as single hold keys | Ctrl+Option chords and double-tap shortcuts need a native shortcut implementation |
| Microphone | Native discovery and fallback, but no settings device picker | Add selected-device persistence, live device changes, and real input-level reporting |
| Secure setup | Native Keychain + token-protected local backend | Retain credentials handling; expose AI connections from the new settings |
| Desktop views | Overlay, Portrait, Screensaver, Holographic, menu-bar entry | Keep accessible from companion/view controls |
| Cloud features | No implementation established for billing, referrals, OAuth integrations, or routines | Design complete flows, implement services separately; never simulate success in the shipping app |

The existing JavaScript layers wrap some global functions and the styles override one another. Consolidate presentation ownership instead of adding another permanent override layer.

## 4. Navigation and layout

### Main shell

Two columns: character sidebar + content. A character detail panel creates a third column when space permits.

Sidebar, top to bottom:

1. Native titlebar clearance, MightyStar mark, home Upgrade action when available.
2. Sidebar toggle, Search field, + button.
3. Suggestions row with gradient avatar and actual unread count.
4. Scrollable character list: portrait, name, latest message, timestamp, unread dot.
5. Fixed footer: Apps +, Invite & Earn, divider, user/profile, plan indicator, shortcut information, Settings.

Main content switches between Home, Suggestions, and the selected conversation. Settings replaces the shell with its own navigation. Closing a panel restores its originating conversation, scroll position, and draft.

A selected character uses the full glossy blue row with dark text. Hovered rows use a subtle neutral fill. Do not confuse hover and selected states in screenshots where two settings rows appear highlighted.

### Settings shell

Left column: Back, Settings heading, navigation groups, version at bottom.

- Account
- General
- Invite & Earn
- **MIGHTYSTAR:** Voice, Microphone, Dictation, Shortcuts, Cursor
- **WORK:** Agents, Integrations

Right column: top window controls, page title/subtitle, vertically scrolling grouped cards. Keep content left-aligned with an intentional empty right margin at large sizes. This is a full-window view, not the current floating character-settings panel.

AI connection controls remain available through a clearly labeled **AI connections** subsection in Agents and through native AI Setup. These are required by MightyStar even though they are not visible in the reference. Account settings must work before a character exists.

### Dimensions and scaling

The supplied originals are roughly 2× captures; do not treat image pixels as application points. The exact backing scale is not recorded. Start with these estimates, then calibrate against cropped reference windows at the same logical size.

| Element | Starting logical size |
|---|---|
| Main window | Existing 1240 × 820 default; retain 880 × 600 minimum |
| Chat sidebar | 320–330 pt at reference size |
| Settings sidebar | 238–245 pt |
| Detail panel | 310–320 pt |
| Chat avatar / header avatar | 44–46 pt / 42–44 pt |
| Character list row | 62–64 pt, with extra separation after Suggestions |
| Main search | 31–34 pt high |
| Settings content | About 600–620 pt wide; 30–34 pt inset from sidebar |
| Settings top content offset | About 98–108 pt |
| Settings grouped card | 14–16 pt radius; rows about 52–62 pt, growing for wrapped descriptions |
| Settings navigation row | 40–42 pt high; 8–10 pt radius |
| Conversation padding | About 52 pt from sidebar; tighter at minimum width |
| Voice pill | About 292 × 48 pt, plus character art above |
| Text composer | 48–52 pt high, expands for multiline input |

At wide sizes keep all three columns. Below approximately 1180 pt, use the detail panel as an overlay rather than squeezing conversation text. Below approximately 1040 pt, compact the main sidebar to 270–280 pt. At the minimum size, preserve the composer, scroll the content, and allow sidebar collapse. These narrower rules are proposed adaptations, not screenshot evidence. Voice cards reflow from five columns to three or two; never shrink labels until unreadable.

## 5. Visual system

All values here are initial estimates, not sampled/verified design tokens.

| Token | Initial target |
|---|---|
| Window / main background | `#1E1E1D` |
| Sidebar | `#1D1D1B` |
| Settings cards | `#282827` |
| Settings selected navigation | `#383837` |
| Subtle row separator | `#393938` |
| Primary text | `#EEEEED` |
| Secondary chat text | `#A1A1A0` |
| Settings descriptive text | Start near `#8E909B`; visually compare and maintain readable contrast |
| Blue unread | `#009EFF` |
| Destructive action | `#FF675E` |
| Connection success | `#43CB8B` |
| Blue control surface | White highlight → pale blue → sky blue, thin lavender-blue edge |
| Neutral control surface | White highlight → light gray, fine gray outline and lower inset edge |
| Referral surface | White highlight → pale mint with soft green lower edge |

Use the native system sans-serif stack. Start around 13–14 pt for ordinary labels, 15–16 pt for conversation content with generous line height, 22 pt for settings page titles, 11–12 pt for supporting text and uppercase section labels. Exact weights and line metrics require comparison in the native app.

The glossy treatment is essential: a flat blue fill is not sufficient. Use layered gradients, a narrow upper shine, fine outer edge, restrained inset shading, and a lower highlight. Apply the same recipe to blue buttons, selected character rows, selected speed pills, radio checks, and switches, with component-specific radii. Keep gloss clipped within each control.

Native traffic lights remain native. Use a consistent thin icon family/SF Symbols where available. Keep the reference's brand mark position; the actual MightyStar mark is a separate branding asset. Avoid emoji as substitutes for production icons or characters.

Reusable components: WindowChrome, CharacterSidebar, CharacterRow, Avatar, SearchField, GlossyButton, GlossySelection, VoiceDock, TextComposer, Transcript, ReplyMetadata, SuggestionChip, CharacterInspector, SettingsShell, SettingsSection, SettingsRow, Toggle, RadioRow, VoiceCard, ShortcutKeycap, ShortcutPopover, LevelMeter, IntegrationRow, EmptyState, InlineError, ConfirmationDialog.

Every interactive component needs default, hover, pressed, focused, disabled, busy, and error behavior where applicable. Selected controls need a checkmark or other non-color indicator. Give icon controls accessible names and maintain visible keyboard focus. Respect reduced motion.

## 6. Screen specifications

### Home — R01

Preserve the broad empty dark canvas. Center the mascot + blue voice action + time-based greeting within the content column, slightly below the window's vertical midpoint. Put one short shortcut instruction below. Do not add dashboards or cards. Populate the sidebar from real characters. With no characters, use this composition with a Create your first character action. Until a default assistant exists, Home voice routes to the last selected character, or to character selection; it must not send to an undefined assistant.

### Conversation / voice — R02, R10

Centered top avatar and name chip opens the inspector. A top black-to-transparent fade creates the reference header treatment, but reserve sufficient inset so current content is not unreadable behind it. Use a continuous transcript: assistant paragraphs, lists, headings, inline code, timestamp, elapsed duration if measured, copy action, and optional suggested follow-up chips. Existing messages are plain text; implement safe structured rendering before enabling markdown.

Keep user messages distinct within the same restrained visual language. Their exact appearance is not shown. Preserve a visible thinking/working state and Stop action. Track scroll position: follow new replies only when already near the bottom; otherwise show a new-message affordance.

Anchor character art above the left end of the large blue hold-to-talk pill. Place the outlined Type… control to its right and Release to send below. Reserve vertical space so the art/composer never covers the last message. Labels follow the actual configured shortcut and session state.

### Conversation / text — R14

Replace the large voice dock with a small character above a glossy mic button and one wide rounded input. Add attachment on the left and send arrow on the right. Enter sends; Shift+Enter adds a line. Disabled send is visibly inactive. Keep unsent drafts per character. The attachment picker, queued files, remove, upload failure, unsupported file, and provider capability checks require new support; do not wire the reference paperclip to unrelated existing actions.

### Character inspector — R03

Right-aligned dark panel with divider, close control, large portrait, white glossy Edit character button, name, role, description, and Routines. Empty routine card explains the scheduling entry point. Routine rows, editor, run history, pause/resume, and removal are proposed extensions. Opening details leaves the conversation and composer usable at wide sizes.

Edit character opens the existing four-step wizard in the new dark/glossy treatment. Keep the original character ID and conversation during edits. A failed model download must allow retry and retain the previous working appearance. Save waits for validation; cancel leaves saved data unchanged.

### Shortcut popover — R04

Anchor above the sidebar information button. Show Talk, Text, and Dictate with real keycaps and an Edit action leading to Shortcuts. Escape/outside click closes it; return focus to the trigger. Its values always come from saved preferences.

### Account — R05

Match Plan, Referrals, and Account groups. If cloud account services exist, use actual usage/reset information and account identity. Current local installs show an honest local-account state in the same card structure. The reference's Free plan, 25-message limits, reset clock, user email, billing, and referral earnings are not MightyStar data. Design upgrade, sign-in/out, deletion, and failure states; activate them only with real services. Quit invokes native quit. Destructive account/data actions require a scoped confirmation.

### General — R06

Match Behavior, Updates, Community, Welcome Tour, and Support groups. Behavior includes Show in Dock, Show in screen recordings, and Quick peek on notch hover. Each needs actual native behavior before being enabled. Update check shows checking/current/update available/error. Community and support use verified MightyStar destinations. Tour replays onboarding without removing existing characters. Notch behavior needs a separately specified compact view and a fallback for displays without a notch.

### Voice — R07

Match speed chips at 0.5×, 0.75×, 1×, 1.25×, 1.5× and the observed ten-card order: Cedar, Marin, Alloy, Ash, Ballad / Coral, Echo, Sage, Shimmer, Verse. These names correspond to the existing OpenAI voice options in source, but actual availability depends on the configured engine/account. Keep Edge voices available in a consistent secondary engine selector/list. Do not relabel Edge audio as a reference voice.

Selecting a voice previews it, stops the prior preview, and updates the selected checkmark after successful saving. Show scope clearly: selected character, or defaults for new characters when none is selected. Retain existing per-character voice settings. Speed changes apply to subsequent speech, not by restarting a currently spoken reply. A failed preview keeps the choice recoverable and explains the error. Verify 0.5× end-to-end before enabling it.

### Microphone — R08

Show System Default plus currently available devices by their actual names. Selected radio reflects stored device identity, not a guessed label. Test microphone starts a real local meter with an obvious stop control and stops when leaving the page. It does not submit a chat request. Handle denied permission, no devices, unplugged selected device, and default-device changes with an explicit fallback indicator.

### Shortcuts — R09

Match Talk to MightyStar and Dictation groups. Reference defaults: hold Control+Option to talk; double-tap Control for text; hold Control+Fn to dictate; repeat Control+Fn chord for hands-free dictation. Keep existing users' saved shortcuts during migration. Change enters a capture dialog with Save/Cancel, conflict detection, and unsupported-combination feedback. Reset requires confirmation and affects shortcuts only. Suppress activation while capturing shortcuts or editing settings. Native support must precede display of working combined shortcuts.

### Agents — R12

Match Workspace, Autonomy, Announcements, and Legacy groups. Workspace row opens a real native folder picker. Proposed capability section lists only capabilities actually supported. Extra usage, computer access, suggestions, spoken announcements, and cursor updates are distinct preferences backed by real services. Do not interpret a saved UI toggle as blanket permission for unrelated actions. Preserve quiet behavior during system suppression states when that integration exists. Hide or explain the legacy empty state when no migration data exists.

### Integrations — R13

Match the search-and-action header, Connected section, Available integrations rows, logos, descriptions, and glossy Connect actions. Reference examples are YouTube, Notion, Linear, GitHub, Google Docs, Google Calendar, LinkedIn, and Slack. Treat these as catalog design examples until each connector is implemented; the connected YouTube account in the image is not this user's MightyStar connection.

Full flow: select app → connection details/scopes → authorization → callback verification → connected state. Support cancelled authorization, expired credentials, retry, disconnect, empty search, and provider outage. Custom connector form needs endpoint validation, authentication choice, secure secret storage, test connection, and save. Native API provider keys remain separate from third-party app authorization.

### Proposed screens missing from the references

| Screen | Same-system design | Required workflow |
|---|---|---|
| Suggestions | Gradient identity, simple task rows/cards within main canvas | Open → inspect suggestion → choose character → start → chat; dismiss updates count |
| Dictation | Settings grouped rows for shortcut, language/format preferences, permissions | Start → listen → transcribe → insert at focus; recover to copyable text if insertion fails |
| Cursor | Preview and preference rows for companion/status near pointer | Toggle → supported native behavior → dismiss; never intercept normal pointer clicks |
| Invite & Earn | Mint accent, referral-link card, actual invitation/reward status | Copy/share → track real events; no invented earnings |
| Upgrade | Compact plan comparison and billing status | Select plan → checkout → confirmed entitlement; cancellation and failure recovery |
| Routine editor | Character identity, task text, schedule/time zone, next run | Review schedule → save → list → run status → pause/edit/delete |
| First run | Short welcome, character setup, AI connection setup, optional mic setup | Reach Home without forcing microphone permission for text-only use |
| Search | Existing search field with inline result list and empty state | Search names/messages → select result → jump to matching conversation |
| Compact companion | Small character/status surface using existing desktop renderer | Open chat, change view, resume conversation, close back to prior state |

## 7. Interaction and data rules

Separate navigation state from audio state. Selecting Text is not equivalent to receiving a backend idle event. The native call state remains authoritative; presentation may summarize it but must not infer success from button clicks.

Maintain character selection, per-character history/draft/voice profile, scroll positions, sidebar state, settings route, actual connection state, and microphone identity separately. New routine and connector records require their own durable storage; do not overload character personality fields.

Use typed native messages for new window, microphone, shortcut, folder, and preference operations. Check selected character and response identity before applying async updates. A late reply for character A must not appear in character B. On character switch, stop previous recording/playback and reject stale call events while allowing a pending text reply to save to its original history.

On opening settings, finish/cancel the current recording according to an explicit rule (default: cancel unsent recording), stop previews, and preserve drafts. Restore the originating view on Back. Simple preference changes show saving/saved/error and roll back on failure. Multi-field editors use explicit Save/Cancel. External account changes never imply success until confirmed.

Keep all existing secrets native and in Keychain. Display presence/status only. Keep the file-based web origin stable until a migration has been tested. Existing storage includes `mightyCharacters` and `mightyCharacterMessages`; retain them.

## 8. Implementation work packages

| Phase | Deliverable | Completion evidence |
|---|---|---|
| 0 — Baseline | Capture current working app/data behavior; reference crop/size matrix; asset choice | Restore path exists; source/reference inventory complete |
| 1 — Foundations | Dark native backing, tokens, glossy controls, icons, typography, layout primitives | Reference-scale component comparisons; keyboard focus and contrast reviewed |
| 2 — Main shell | Home, sidebar, search, selected rows, footer, navigation | R01/R11 structure matches; real characters and unread states; resizing verified |
| 3 — Conversation | Transcript, header, voice dock, text composer, inspector, shortcut popover | R02/R03/R04/R10/R14 comparisons; draft/history and audio regressions checked |
| 4 — Settings UI | All nine settings destinations and new AI connections location | R05–R09/R12/R13 comparisons; proposed pages visibly consistent |
| 5 — Native behavior | Device selection/test, shortcut chords, preference/window behavior, folder picker | Native tests plus manual device/keyboard/lifecycle checks |
| 6 — New services | Routines, suggestions, attachments, integrations, accounts/billing/referrals | Actual persistence, authorization, failures and end-to-end success paths |
| 7 — Final fidelity | Asset/motion integration, all viewports, accessibility, cleanup | Screenshot review per state; no lost data, disconnected controls, or false status |

Sequence: 0 → 1 → 2 → 3 → 4; phase 5 connects the settings controls; phase 6 completes service-dependent flows; phase 7 is the final gate. UI-only review can happen after phase 4 with clearly identified fixtures. Full workflow completion requires phases 5 and 6 where applicable.

### File-level approach

- `Sources/index.html`: replace active shell markup and script/style entry points; maintain service/renderer integration anchors through an adapter.
- Proposed `Sources/mightystar-ui.css`: one token/component/layout owner for the new shell.
- Proposed `Sources/mightystar-ui.js`: navigation and view rendering, without wrapping global functions repeatedly.
- `Sources/chat-ui.js`: preserve conversation operations; separate data operations from DOM rendering; safe rich text and drafts.
- `Sources/studio.js`: split settings into page views and native preference operations; retain AI connection and voice behavior.
- `Sources/companion-ui.js`: preserve editor, model loading, speech relay, and view routing; adapt character mount points.
- `Sources/animates-ui.js` / `.css`: remove from main-shell entry after parity; retain any useful desktop presentation intentionally rather than relying on global overrides.
- `Sources/main.swift`, `Native/Settings/`, `Native/Audio/`, `Native/Call/`: native preference/device/shortcut contracts, dark startup and visible branding.
- `Sources/desktop.html`, existing desktop controls, `Renderer/`: preserve four companion modes and synchronized expression/playback; adjust only as needed for the selected art placement.
- New service modules: routine scheduling, connector registry, attachment processing, account/entitlement integration; interfaces and failure states first, then actual providers.

Do not rename storage folders, purge old characters, reset saved shortcuts, move credentials into JavaScript, or remove desktop modes to simplify the redesign.

## 9. Verification and definition of done

For each unique reference state, capture the implementation at the corresponding cropped window size. Align app content bounds before overlaying images. Compare column edges, vertical landmarks, text baselines, gradients, radii, icon scale, and character crop. Mask only deliberate content/art/native rendering differences and report them; never describe masked differences as exact matching. Use a target of roughly 2 logical points for major layout landmarks after scale calibration, plus visual review for typography and gloss. The supplied screenshot resizes make raw whole-image pixel scores insufficient.

Review all 14 references, treating R10/R11 as additional evidence rather than extra pages. Test at default 1240 × 820, minimum 880 × 600, reference-equivalent sizes, and a larger window; include long names, many characters, no characters, long replies, no search results, and offline/error states.

Run existing build and relevant protocol/call/provider/cache checks when implementation changes land. Add meaningful checks for chord transitions, shortcut conflicts, selected-device disappearance, draft restoration, stale character events, settings persistence, safe transcript rendering, and routines/connectors when implemented. Browser previews cannot verify native audio, Keychain, global shortcuts, or macOS window behavior; those require the built app.

**Done means:** the referenced layouts are matched and reviewed; missing-reference extensions are documented; all enabled controls perform their stated action; the new services return real states; character data and credentials survive the change; keyboard and voice flows recover from errors; remaining asset/platform differences are listed explicitly. A screen that merely looks connected or scheduled is not a completed workflow.

## 10. Outstanding decisions, with working defaults

1. Artwork — resolved: keep existing MightyStar 3D characters and portraits, as explicitly selected by the user. Character framing and expression fidelity still require native visual review.
2. Account model: retain local/BYOK behavior until a real MightyStar account service is selected; plan the reference account UI without inventing subscription terms.
3. Unseen pages: use the proposed same-system layouts above; further references can replace those assumptions later.
4. Shortcut migration: preserve current users' values; use reference defaults for new users only after native chord support passes tests.
5. Brand: visible MightyStar text and existing brand asset if available; a new mark is not inferred from the Clicky mark.

Companion document: [MIGHTYSTAR-UI-WORKFLOWS.md](MIGHTYSTAR-UI-WORKFLOWS.md).
