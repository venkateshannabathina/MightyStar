# Pinned Apple Music reference

These six screenshots, supplied on 18 October 2026, are the visual source of truth for Player View. The live character replaces album artwork. The bottom music player is excluded.

| Reference | Use |
| --- | --- |
| `01-window.png` | Rounded artwork window, native traffic lights, top-right glass capsule |
| `02-idle.png` | White icons, translucent neutral pill, subtle rim |
| `03-subtitles.png` | Coral circle behind the active quotation-bubble icon |
| `04-subtitles-hover.png` | Compact icon spacing and selected-state proportions |
| `05-inline-volume.png` | Volume replaces the first two buttons inside an expanded pill |
| `06-view-selection.png` | Coral circle on the view button, subdued hover on other buttons |

## Interaction flow

1. Open companion view modes and choose Player View. The selected character fills the square window.
2. Click the quotation bubble to enable/disable subtitles. Its coral circle reflects the saved state. Spoken text appears only while that character speaks.
3. Click the list icon to open view choices. Its coral circle stays visible while the menu is open. Select a view to switch; Escape dismisses the menu first.
4. Hover the speaker to expand the existing pill into the volume slider. Moving away collapses a hover-opened slider. Click the speaker to open and focus the slider directly.
5. Drag the thumb or use arrow keys to adjust voice output. Click the expanded speaker to mute/unmute. Clicking or dragging retains the expanded control until outside-click or Escape.
6. Returning to Chat keeps the same conversation and voice session. Player position, size, volume, mute and subtitle choices persist.

There is no album/song metadata, favorite button, overflow music menu, progress timeline, shuffle, previous/next, play/pause or repeat transport.
