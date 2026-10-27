# Social reactions and visible expressions

This update keeps lip-sync scheduling, vowel blending and audio sampling intact. It fixes three reasons expressions appeared flat:

1. Closed-lip MMD grin keys (`にやり`) were not classified as smile corners, so they were heavily reduced at rest and removed during speech.
2. Happy mood selected a very weak smile pose. Happy reactions now combine the authored happy upper face with the authored closed-lip smile corners. A gentle happy smile narrows the eyes less than amused laughter.
3. Brow micro-motion used a maximum blend, so a stronger base eyebrow expression swallowed it. It now adds a small, smooth pulse to recognized central/left/right brow keys, respecting the current mood. Idle brows do not randomly switch into sadness. Tests measured a peak around 0.08 on each supported MMD model.

The backend separates persistent mood from a brief social reaction. It uses the existing validated appraisal: sincere compliments/affection can produce appreciation, positive humor can produce amusement, and negative news can produce concern. It does not look for words such as `sweet` or `funny` in the user message. Quoted or hypothetical praise remains neutral when the appraisal classifies it that way.

Reactions have a 3.5-second envelope and then settle to the actual underlying mood. Their ID prevents duplicate phase/performance events from retriggering them. The first real audio playback may start the reaction window once, so a slow TTS response does not lose the smile before the voice begins. Later chunks do not prolong it indefinitely.

Anger and grudges still govern the response. Praise during anger does not produce a cheerful grin; a lingering grudge permits only guarded appreciation. Sincere apologies soften the existing state rather than resetting it. The original standalone decay/update formulas remain intact.

Each of the five character prompts now has distinct social-response guidance and an original illustrative cadence example. Warm acknowledgment, light teasing, restraint and optional amusement vary by character. Examples are not stock lines to copy. Laughter is optional, not forced after every compliment, and no new laughter audio generator is introduced. Generated wording remains model-dependent.

Older saved character IDs use their explicit `profile.personaId` to find the same authored voice. Matching a display name alone does not replace a custom persona. A final social-response instruction also discourages generic service questions and professional-assistant self-descriptions while preserving honest disclosure that this is a fictional-character AI companion.

The full expression envelope now survives JSON/NDJSON reply completion, saved messages, the typed TTS endpoint, native voice chunks and cached voice completions. The renderer receives both the reaction and its ambient fallback. No extra appraisal or expression LLM call is added.

The configured GPT-OSS reasoning model also receives low reasoning effort and a 900-token appraisal allowance, because a 256-token total can be consumed by hidden reasoning and silently fall back to neutral. Other models keep the existing appraisal allowance. Model selection remains configured, and the appraisal system text is unchanged.

Validation:

- All 28 Python engine/persistence tests pass.
- Social-reaction tests cover compliments, humor, concern, fake praise, anger, apologies, lingering grudges, quoted-keyword neutrality and metadata sanitization.
- Both real main API formats pass insult → neutral → apology, compliment → smile, positive joke → amusement, and praise-while-angry scenarios using offline model fixtures.
- The canonical persona/memory/HTTP/WebSocket regression passes for all five text characters.
- Real-model WebGL checks confirm visible eye/corner smiles and subtle idle brow motion for Lynae, female Rover, Evelyn and Lucy. They also check speech/cancellation and bounded morph weights. Hailey's existing missing facial rig remains safely unsupported.
- Pure face tests check visible smile strength, simultaneous speech/corners, settling back to ambient mood and additive brows on top of an existing angry pose.

Evidence is under `build/face-motion-review/`. The update is delivered in the workspace-root `Mighty Chat.app` after copying the checked resources and signing with its existing identity.
