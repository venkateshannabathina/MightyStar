# Facial expression editor

Build on the current native Editor → Face / Bone Animation / Clothes in
`Mighty Chat/build/Mighty Chat.app`, not the older workspace-root app.
Current character: KON, using Evelyn Chevalier's PMX (49 morphs).

## Reference review — all 18 images, in filename order

1. Neutral and the three-column architecture: expression, face, parameters.
2. Feminine eyebrow controls; one expression combines several independent keys.
3. Masculine eyebrow controls; the categories describe the source model.
4. Eye emotion shapes, separate left/right smile and wide eyes.
5. Blinks, winks, iris size, iris visibility, highlights and stylized pupils.
6. Same eye controls with the lower part of the group visible.
7. Mouth emotion/vowel shapes, numeric values and partial strength (38.767).
8. Smiling: narrower eyes and a subtle smile.
9. Sad: worried brows, lowered eyelids and an open, downturned mouth.
10. Angry: brows down/in and a downturned mouth.
11. Happy: closed smiling eyes and a broad open smile.
12. Surprised: wide eyes, raised brows and a round mouth.
13. Both eyes closed with the rest of the face at rest.
14. Right-eye closure independently.
15. Left-eye closure independently.
16. A mouth shape.
17. I mouth shape.
18. U mouth shape. E and O remain visible in the list throughout.

## Implementation sequence

1. Discover the actual PMX/BPMX or GLB morph inventory. Preserve original names,
   author English aliases and source categories. Store expression weights by
   stable name-based IDs, with duplicate-name disambiguation, rather than using
   an ARKit-only schema or positional IDs. Keep older raw face settings readable.
2. Seed Neutral, Smiling, Sad, Angry, Happy, Surprised, Closed, Closed (Right),
   Closed (Left), A, I, U, E and O. Curate Evelyn against the actual key inventory;
   other models get conservative defaults only for known available keys. Empty
   mappings remain editable and are explicitly identified in the UI.
3. Add a native preset list at left and a dedicated face crop in the viewport.
   Keep the existing inspector at right. Add custom expression creation,
   duplication, renaming, removal, key search, anatomical grouping, active-key
   filter, continuous sliders with exact numeric values, and clear/default reset.
4. Each preset owns its weights. Switching presets retains edits in the character
   draft. Top-level Save persists every expression with the whole
   character. Cancel discards it. Preview selection and neutral comparison are
   temporary and never freeze a wink or vowel into the companion's resting face.
   Neutral is the saved resting face. Save libraries separately by appearance
   within each character profile so switching models cannot corrupt mappings.
5. Validate real morph application, default mappings, old-settings migration,
   reorder stability, model/profile isolation, sanitization, preview/reset,
   custom presets, native save/reopen/cancel and production builds. Capture
   Evelyn's reference expressions and the final native editor for visual review.

This iteration authors expressions. Automatic conversational expression choice,
face tracking and audio lip sync are separate features.
