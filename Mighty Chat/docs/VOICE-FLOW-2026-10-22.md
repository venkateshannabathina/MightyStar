# Continuous voice preface follow-up

Mode: Improve. Scope: the silence between cached voice filler and real answer, plus repetitive filler selection. Contract: keep Ava, current voice settings and chat/orb layout; cover controlled 0.1, 2, 4 and 6-second answer-readiness cases, then queue the reply at a natural clip boundary without stopping the native player. Preserve cancellation, mute/volume, answer captions and actual answer sample clock. Measure player queue continuity and PCM boundary silence separately from first acknowledgement and first answer timing. No claim that synthetic timing proves naturalness to a listener.

Environment: physical M2 Mac (Mac14,2), macOS 27.0.1, optimized Swift, real AVAudioEngine with muted synthetic output. No microphone or provider needed for timing fixtures. Current source/clip bank frozen under build/filler-flow-20261022/before. Baseline source proof: one filler (0.8–1.46 s) stops regardless of answer readiness; its played callback stops the player and restarts for real audio. With an answer at 4 s this necessarily leaves roughly 2.2–2.9 seconds unfilled. Prior tests exercised readiness during the filler, missing that case.

Design: a larger bank of short openers/continuations, per-turn exclusion and persistent recent-opening history; one queued continuation at most; queue the ready answer ahead of the boundary on the same player. Preserve a single sample origin across the preface and answer while reporting answer-relative positions. Cancel pending queues on generation changes. Bound abnormal waits rather than repeating filler indefinitely. Expanded tests must check actual scheduling/sample positions, silence at PCM joins, 4/6-second waits, readiness near boundaries, and interruption while more than one buffer is queued.

## Implemented changes

PlaybackEngine keeps one uninterrupted AVAudioPlayerNode timeline. It queues the next cached segment about 120 ms before the current end; if real audio is ready then, it queues the answer instead. There is no player stop or sample-clock reset at handoff. Answer chunk positions subtract the accumulated preface samples; actual-answer timing remains separate from acknowledgement timing. Only cancellation/end and final drain stop the player.

Sixteen newly recorded Ava clips use openers and continuations. A persistent six-opening recent history survives newly created call runtimes; each turn excludes every clip already used in that turn and prefers unused phrase families. This prevents exact clip repetition, rather than merely lowering its random probability. Long waits still involve several hesitations; smooth sample joins alone do not prove they sound natural or suit every topic. The bank is finite and abnormal waits error instead of looping indefinitely (12-second budget or bank exhaustion). A short ready answer may wait for the remainder of the current/committed segment; longest clip is 1.06 s.

External filler silence is trimmed to a 20 ms lead and 40 ms tail, with a short edge fade. First-answer decoder padding is trimmed while keeping 20 ms before detected speech, and the same time shift is applied to word/mouth timestamps and duration metadata. A sample-preservation test checks that the retained reply waveform is unchanged.

Changed runtime files: Native/Audio/PlaybackEngine.swift, Native/Call/LiveCallRuntime.swift, Sources/Fillers/*.wav and manifest.json. Asset recording/trimming scripts and scoped regression tests are updated. The existing UI files and voice provider/settings are preserved.

## First expanded validation

Optimized native muted-output test: answer readiness at 100, 550, 2,000, 4,000 and 6,000 ms. Fast 100 ms answer bypassed filler. Longer cases used 2, 3, 6 and 9 distinct clips respectively, with no within-turn repetition. All adjacent buffers were sample-contiguous and queued at least 79 ms ahead of their start. Maximum quiet across any tested PCM join was 60 ms, including the final handoff. Actual-answer first positive samples were 160, 1,428, 2,381, 4,411 and 6,224 ms respectively. The 550 ms case illustrates the real tradeoff: an already queued continuation delayed the ready answer by 878 ms instead of cutting its words.

Rotation was tested over 100 choices with history reconstructed each time; no first opening repeated within the preceding six. Cancellation during a prequeued continuation and before the initial timer, disabled speech and mismatched voice/speed passed. These tests use the real AVAudioEngine and positive sample clock, with muted output, without microphone/provider requests. Exported WAV previews use the queued PCM plus initial timer delay; they are constructed renderings, not recordings from the speakers. PCM silence and queue continuity are measured, not subjective listener ratings or live-network guarantees.

The staged app built/signed and passed the existing protocol, conversation, cancellation, phrase, STT/provider, worker, voice/UI bridge and native input checks. The first compile of the expanded test had a helper visibility error; it was corrected before passing.

## Final validation and installation

Full native voice-turn fixture with a 4,000 ms first-synthesis delay passed, acknowledgement at 360 ms and actual answer at 4,356 ms. The repeated five-case playback suite again passed: all joins were at most 60 ms quiet, with the smallest observed prequeue lead 68 ms. Separate native timing, lifecycle, coordinator, cancellation and exact-voice guards passed. Final raw results and audio previews are in `build/filler-flow-20261022/flow-playback.json` and `preview-*ms.wav`; `final-summary.json` and source hashes identify the final set. The expanded bank holds about 1.06 MB of decoded PCM.

Installed the staged native executable and expanded Fillers directory in both workspace app bundles, with backups in workspace `backups/before-continuous-voice-flow-20261022`. Both bundles retain their existing signing identity and pass deep/strict verification. Chat, orb and desktop HTML/CSS/JavaScript hashes were verified unchanged. No saved conversation or voice preference was changed.
