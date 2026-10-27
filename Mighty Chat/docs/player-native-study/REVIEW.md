# Player View: reference study and native rebuild

Sources: user-supplied 32.715-second Apple Music screen recording, Apple macOS 27 Sketch kit, and six earlier Apple Music captures. The iOS community SVG was excluded from desktop component decisions.

The recording shows an artwork-first square window. Controls and native traffic lights share a horizontal center line; they fade when inactive. The quoted speech bubble uses an approximately 16-point symbol. Coral selection is a 28-point circle inside a 36-point high capsule. The kit's standard three-button XL group is 110 × 36 points with 28 × 28 button contents inset by 4 points; Music's wider spacing produces approximately 120 × 36. The supplied expanded-volume still is approximately 164 × 36. See `measurements.json` for extracted source component data and `recording-contact.jpg` for the video timeline.

## Before / after review

| Before | After | Why |
| --- | --- | --- |
| Hand-drawn 22–24 px SVG approximations | Native SF Symbols at 16–17 pt | Accurate outlines, weight, optical bounds and Retina rendering |
| Oval 34 × 30 active buttons | 28 × 28 circles | Match the selected state instead of stretching it |
| CSS gray fill, border and stacked shadows | Native NSVisualEffectView HUD material | Let the system render the material, highlights and interaction response |
| Persistent controls and muddy bottom fade | Pointer-aware native chrome; subtitle gradient only while speech is visible | Keep the character as the content |
| Width animation causing layout and native region updates every frame | Immediate layout of the native volume control; short native opacity fades only | Keep repeated controls responsive and eliminate stretched content |
| HTML imitation menu and pointer relays across an iframe | Native NSMenu, NSSlider input, and window-coordinate hover tracking | Native keyboard, focus, tracking and dismissal behavior |
| Waist-up preview with large empty margins | Closer upper-body portrait framing | Fill the window as content without adding a music player |

## Motion verdict

The old layout-driven pill animation is removed from the native presentation. Native fades are 160 ms, remain interruptible, and honor Reduce Motion. Volume responds immediately while dragging. Native menu transitions and accessibility are owned by AppKit. The native review should pass only after frame-level appearance and interaction have been checked in the real window; browser button tests alone are insufficient.

Skills used as third-party guidance: apple-design, emil-design-eng, review-animations from the supplied skills-main folder. They are not treated as Apple specifications. No bundled skill installation or global configuration changes are required.

## Native verification status

The native toolbar is bounded to its actual 120/164 × 36 pt rectangle; traffic lights are separate native siblings. Player windows are created with their final style instead of changing the style of an existing borderless window. WebKit keeps transparent background drawing and uses a plain content host. The toolbar currently uses the established NSVisualEffectView HUD material rather than interactive NSGlassEffectView.

The installed app reported a visible, 467 × 467 player document and nonzero character silhouette data (13,650 occupied mask bytes). Browser rendering, captions, volume/mute messages, cancellation and view switching passed. Native capture remains inconsistent: some captures show the model while others show a blank surface. This is not treated as a completed visual acceptance check. Native provider speech has not been verified with a fresh external request; existing chat history contains HTTP 401 failures.

Recovery app: workspace `backups/Mighty Chat-before-native-player-20261018.app`. Original sources: `Mighty Chat/backups/before-player-native/`.

## Closer character selection camera

The user's subsequent head-to-hips reference is implemented in the selection framing only: vertical extent 0.66 character heights, target height 0.72, and a width guard for narrow previews. Existing selection rotation and zoom remain available. The renderer was rebuilt, a live-model browser capture reviewed, and the signed app updated without restarting the user's active editing session. The new default applies when the character preview is next created.
