# Character roster cleanup — 21 October 2026

The active MightyStar roster now contains only **Lynae, Lucy (Wuthering Waves), Rover, Hailey, and Evelyn (Zenless Zone Zero)**. ZZZ Lucy is excluded from both the selector and backend asset routes. Rover retains both male and female forms. The selector contains ten appearances: three Lynae looks, Wuthering Waves Lucy, Evelyn, four Rover looks, and Hailey. Two former Rover model paths remain accepted for saved-profile compatibility; they do not add selector entries. Existing Wuthering Waves Lucy profiles with the old display metadata `Lucy (WuWa)` resolve to the correct model and keep their IDs, settings and history.

The user clarified Lucy’s game and added Evelyn after the initial cleanup. The shared app catalog, both viewer catalogs/defaults, asset restrictions, regression fixtures, README, production bundles and separate signed app build have all been updated for this final five-character roster.

## Changes

- Replaced the 396-entry bundled catalog with a fixed shared roster in `Sources/catalog.js`. Browser validation and backend model/asset routing use the same entries. Removed the online catalog refresh that could reintroduce other characters.
- Restricted the backend to approved model files, their own character texture trees, and approved portraits. Kept generic PMX parsing, texture dependency loading, cache reuse, concurrency, retry, path validation, shared rigs, animation, lighting, voice, and chat infrastructure.
- Startup removes unsupported appearances from active saved contacts and clears a removed last selection. Retained contacts keep their IDs, customized display names, personalities, settings and conversation history. Catalog metadata is restored from trusted entries. Historical message/draft/memory records and downloaded user caches are not erased.
- Pruned base/skin/extra catalogs in both viewer source trees and their served resources. Viewers now read bundled catalogs, default to Lucy, and expose only populated character groups. Removed obsolete mascot selectors and character-specific loader exceptions. Replaced loading/toolbar mascot artwork with the existing app icon.
- Removed 32 portrait/loading-artwork files across editable and served resources, plus three empty calibration records for removed models. Hailey’s bundled GLB/portrait and all shared animation/stage/filter assets remain.
- Updated real-model test references to retained characters. Preserved shared morph engine coverage using anonymous morph-only fixtures with no character asset paths; real rendering fixtures now use the supported roster.
- Added `tests/ui/check-character-roster.cjs` to the normal build checks. Rebuilt the companion renderer, animation lab, both viewer production outputs, and a separate signed native app.

The file manifest is [changes.json](roster-cleanup/changes.json). Original edited/deleted source files were snapshotted under `/private/tmp/mighty-roster-before` because this workspace had no tracked Git files to provide a baseline. Generated output directories are recorded separately in the manifest.

## Validation

Passed:

- Full native app build, persistent signature verification, and all checks run by `scripts/build.sh --skip-renderer`: provider/chat/voice routing, cache, protocols, calls, audio, player speech and idle bridge.
- New roster regression: exact identities, all model entries and legacy paths, rejection of unsupported model/assets, saved-profile migration, personality/history preservation, and every editable/served viewer catalog.
- Authenticated bundled asset routes, MIME/HEAD handling, path traversal and invalid-token rejection.
- Native editor bridge: isolated draft, identity-based save, profile/history preservation and storage rollback.
- Browser editor: all ten appearances, preview, cancel/save, persistence, creation flow, focus, portrait handling and six window sizes.
- Hailey UI: authenticated portrait, preview/review, saved conversation/profile preservation, native view handoff and desktop hover behavior.
- Sidebar navigation, persisted state, scrolling, accessibility and runtime error checks.
- Real Hailey GPU Player View at 320–700 px, volume/mute, subtitles, stale speech handling and view/character changes.
- Real Hailey skeletal motion for all idle styles; cached Lynae PMX pointer direction; 36,000 expression-engine frames over 50 anonymous morph fixtures.
- JavaScript syntax, renderer/clean-viewer TypeScript checks, fixture regeneration/checks, and both viewer production builds. Upstream viewer checks/build used `skipLibCheck` for pre-existing dependency declaration incompatibilities; source code was still type-checked. Existing dependency casing, bundle-size and native deprecation warnings remain.
- Packaged backend resolves the packaged shared roster and accepts all ten shipped appearances.

The validated separate build is `Mighty Chat/build/Mighty Chat.app`. The current workspace-root `Mighty Chat.app` has now been updated in place and restarted. Its native Character editor was inspected and shows exactly ten allowed appearance buttons covering the final five-character roster. The existing executable and credential helper were preserved; the three roster/UI scripts and backend character cache module were updated, and the app signature was renewed and verified. The pre-update app was backed up; see [current-app-install.json](roster-cleanup/current-app-install.json). Recovery and older backup copies remain unchanged.

## Unresolved references and preserved history

**Lynae upstream textures:** all nine remote retained model files and their five distinct portrait URLs responded successfully. The final asset report combines 58 model, portrait and texture URL checks, including all 23 URLs from the actual Lucy and Evelyn PMX texture tables and their model/portrait URLs. Lucy and Evelyn had no unavailable or rejected paths. These five existing Lynae texture URLs still return HTTP 404 under `ww/chars/Lynae/Lynae/Tex/`:

- `sink22.png`
- `skin.bmp`
- `hair spa.png`
- `hair hi light.png`
- `cheek_00.tga`

A fresh default Lynae download can therefore fail during texture preparation. No substitute textures were invented. [asset-status.json](roster-cleanup/asset-status.json) records the exact paths and responses. Rover’s texture tables and Lynae’s alternate looks were not exhaustively downloaded; successful model/portrait URLs do not establish complete texture availability.

**Historical references:** old names/assets remain in backups, recovery app bundles, historical documentation/evidence under `Mighty Chat/docs`, root architecture/face-inventory documents, and the `face-reference` research collection. These are not character registries or runtime resource inputs for the new app. The historical face-inventory document remains the provenance input for anonymous shared morph test fixtures. Independent Blender/source-art research was preserved. Purging these records would remove historical/recovery material beyond the active code and shipped-resource cleanup.

**Shared voice:** the reference scan’s only old-name literal in active source was `Natasha`, an Edge TTS voice label. It remains because it is shared voice functionality, not a character registration.
