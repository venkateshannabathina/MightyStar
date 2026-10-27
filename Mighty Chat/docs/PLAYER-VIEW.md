# Player View — 18 October 2026

## Delivered checklist

- [x] Add Player View to companion, desktop and macOS menu-bar view menus.
- [x] Match the reference’s square window, 28 px corners, glass utility pill and lower fade.
- [x] Use the selected live model with a dedicated portrait camera; preserve existing animation and facial playback.
- [x] Provide native close, minimize and zoom controls, header dragging and proportional resizing.
- [x] Route volume/mute to current and future browser speech and native live-call output.
- [x] Add playback-clock subtitles, word-timed phrase grouping and a fallback for untimed voices.
- [x] Clear captions on interruption/end, reject stale snapshots and reset on character changes.
- [x] Keep speech/calls running when changing presentation; Player → Chat bypasses the old call-ending Ask action.
- [x] Persist window frame, voice volume/mute and subtitle preference.
- [x] Verify keyboard focus, Escape, popover placement and 320–700 px window sizes.
- [x] Build with the existing stable signing identity and preserve a recovery app.

## Implementation

The existing `desktop.html` / `desktop.js` host now supports `player`. A separate `player-view.js` owns toolbar, popovers and caption presentation. The native host retains the same call and backend while the same desktop renderer changes framing. Standard native traffic lights are used instead of HTML imitation dots. The reference desktop wallpaper remains outside the app.

Volume is an app-wide voice output preference, independent of the character’s speech-enabled setting. Browser media uses its volume/muted properties; AudioHost combines remembered gain and mute at its AVAudioPlayerNode. Subtitles travel with speech performance metadata rather than unrelated conversation text. Audio without word boundaries displays its supplied utterance text; it does not claim precise word timing. Browser audio snapshots use a timer so hiding the chat window does not tie captions to the hidden window’s animation frames. Native buffering pauses caption display while retaining the utterance for resumption.

## Validation

- Signed macOS build and bundled backend, protocol, call, audio and shortcut checks passed.
- `check-player-view.cjs`: real Hailey GLB, toolbar, volume/mute bridge, caption timing/toggle/fallback, stale turns, view menu, character changes and window sizes passed.
- `check-player-speech.cjs`: real speech functions with deterministic media fixtures, actual media clock relay, current playback gain/mute, uninterrupted view changes and stale TTS cancellation passed.
- `check-desktop.cjs`: real animated PMX character, full-body camera, silhouettes, click-through regions, menu, resize gestures and dismissal passed.
- `check-desktop-talk.cjs`: hold-to-talk waveform, release, hint memory, hit regions, keyboard access and reduced motion passed.
- `check-idle-bridge-vm.cjs`: idle persistence, draft isolation, menu/pause and pointer lifecycle passed.
- Native installed app: Hailey loaded in Player View; toolbar and volume popover were accessible; keyboard volume input updated the displayed value.

Automated captions use speech fixtures; no new AI conversation or external speech request was required for these checks. Live microphone/provider quality was not re-tested in this change.

Preview: `build/player-review/player-hailey.png`.
Recovery: workspace `backups/Mighty Chat-before-player-view-20261018.app`; original edited sources in `Mighty Chat/backups/before-player-view/`.


## Apple Music reference redesign

The six user-supplied captures are pinned as the local reference set in `docs/references/apple-music-player/`. The toolbar uses a 124 × 38 point glass capsule, white quotation-bubble/list/speaker icons and coral `#FF2D50` active circles. On speaker hover it expands to 166 points, replacing the first two controls with the white volume track and circular thumb. Leaving a hover-opened slider collapses it; clicking or dragging retains it until outside-click/Escape. Clicking the expanded speaker toggles mute. There is no separate volume card, track title, seek bar or music transport. The lower vignette is restrained to keep more of the character visible.

State captures are saved in `build/player-review/toolbar-{idle,subtitles,view-selected,volume}.png`. The browser regression covers both hover expansion/collapse and click/keyboard volume operation. Native header dragging excludes the live toolbar bounds throughout its width animation.
