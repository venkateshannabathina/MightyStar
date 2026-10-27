# Companion mind engine

A Python 3.11+ module with FastAPI endpoints for procedural mood, anger, trust and decaying grudges. Mighty Star's main app now also uses the same pure engine through `Mighty Chat/Backend/mind/`; see `Mighty Chat/docs/MIND-AND-WAIST-2026-10-25.md` for the native integration and model repair.

## Run

```sh
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
export GROQ_API_KEY='your-key'
export GROQ_APPRAISAL_MODEL='your-json-mode-capable-model-id'
export GROQ_REPLY_MODEL='your-chat-model-id'
export COMPANION_NAME='Mira'              # optional
export MIND_DATABASE_PATH='mind.sqlite3'  # optional
uvicorn mind.api:app --factory --workers 1
```

Choose currently available Groq model IDs. There is no hardcoded model default. Missing models or API key fail at startup. `mind/persona.txt` is read at startup; `{name}` is substituted. All tuning values and service defaults live in `mind/config.py`.

```sh
curl -s http://127.0.0.1:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"demo","message":"You are useless","history":[]}'
curl -s http://127.0.0.1:8000/state/demo
curl -s -X POST http://127.0.0.1:8000/reset/demo
python -m pytest -q
```

`/chat` returns `reply`, `emotion`, `intensity` and `debug` containing valence, anger, trust and grudges. The trailing emotion tag is stripped from `reply`. `/state/{user_id}` returns the full decayed snapshot, including derived `offense_count_recent`. `/reset/{user_id}` persists and returns a fresh baseline.

## Direct module use

```python
from mind.engine import apply_appraisal, build_prompt_block, decay, emotion_label
from mind.state import MindState

now = 1_000.0
state = MindState(last_update=now)
state = apply_appraisal(state, {
    "type": "insult", "valence": -0.9, "arousal": 0.8,
    "severity": 0.9, "sincere": True, "summary": "called her useless",
}, now)
label, intensity = emotion_label(state, now)
system_prompt_fragment = build_prompt_block(state, now)
later = decay(state, now + 2 * 3600)
```

Engine functions never read the clock, perform I/O, call an LLM, or mutate the input. `decay` and `apply_appraisal` return fresh dataclass snapshots. Callers supply finite Unix timestamps and create initial state with `last_update=now`. `emotion_label` and `build_prompt_block` take `now` too. Freeze applies to dataclass fields; callers should treat the grudge list as immutable.

## Resolved ambiguities and limits

- **The requested formula conflicts with two requested test thresholds.** A severity-0.9 insult starts anger at 0.72. With a 45-minute half-life, anger at 2 hours is **0.11339**, crossing below 0.1 at about **2.136 hours**. With a 14-hour half-life, grudge weight at 36 hours is **0.15141**, crossing below the 0.08 removal cutoff at about **48.891 hours**. The implementation preserves the exact decay formulas and cutoff; tests check the actual values, anger below 0.1 at 3 hours, and grudge removal at 50 hours. At 36 hours mood is back at baseline and the weak memory is not mentioned. A severity-1 grudge can survive about 51 hours.
- Recent offenses are retained grudges created within the previous hour, including the boundary. Escalation counts earlier offenses before appending the current offense. Apologies do not delete offense history immediately; normal decay removes weak grudges later.
- Compliment/affection valence gain is `0.3 * max(0, appraisal.valence)`. While anger exceeds 0.5, both valence and trust gains are multiplied by 0.4. Jokes add `0.1 * trust`; ignoring subtracts 0.02 valence. Appraisal arousal is validated but direct arousal changes follow the specified offense rule only. Trust decays toward 0.5 from either direction.
- Unknown appraisal types become `neutral`; the independent `valence < -0.4` offense rule still applies. Any transport, JSON, missing-field, invalid-type, nonfinite-number or SDK failure produces a fully neutral appraisal. Numbers are clamped, sincere must be a JSON boolean, and summaries are truncated to eight words. Neutral input changes no emotional values beyond elapsed-time decay.
- Labels initialize on the first non-neutral appraisal. Later changes are recorded by `apply_appraisal`, with a two-second hold. `emotion_label` is a pure read and never changes `label_since`; decay does not restart the hold. A new insult during an existing hold changes anger immediately, but its visible label waits until the hold expires. Engine intensity is clamped to 0.2–1; valid model tag intensity is clamped to 0–1. Invalid/missing tags fall back to the engine; held labels take precedence over a conflicting model tag.
- `current_label`/`label_since` support the hold. An extra persisted `Grudge.mentioned` flag allocates one opportunity per incident to mention it in the distant phase. The prompt permits one eligible incident per reply; its allowance is consumed after a successful reply, even if the LLM elects not to mention it. Failed replies do not consume the allowance. All other phases prohibit mentioning memories. Grudge summaries are quoted as data, never instructions.
- `history` is prior messages only, in chronological order, with `user`/`assistant` roles. Appraisal receives its last three entries plus the latest message. Reply generation receives the supplied history plus the latest message. Conversation history itself is caller-owned; SQLite stores only mind state.
- One worker is required. An app-scoped async lock serializes chat, state and reset operations, including the two model calls, to prevent lost updates with bounded lock memory. Independent server processes sharing the same database are unsupported. GET state persists decay, so restarts and repeated reads do not double-count elapsed time. Backward clock changes freeze elapsed time until the clock catches up. SQLite connections are transaction-scoped and closed; use a file database, not `:memory:`.
- If reply generation fails, the app persists the appraisal's emotional effect and returns HTTP 502. Retry is a new turn, so resending an insult will count it again. Appraisal failure alone is neutral and does not prevent a reply attempt.
- Mood and memory math are deterministic. Generated phrasing, model compliance with tone/safety/mention instructions, and appraisal accuracy remain model-dependent; tests mock Groq and make no network calls. No UI, animation, TTS or auth is included.

The Groq SDK calls follow its [official client interface](https://github.com/groq/groq-python); appraisal requests use JSON object response mode and temperature zero.
