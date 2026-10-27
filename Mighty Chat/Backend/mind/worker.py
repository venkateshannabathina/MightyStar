"""Private stdin/stdout bridge to the same deterministic Python mind engine."""
from __future__ import annotations

import json
import math
import os
import sqlite3
import sys
from dataclasses import asdict, replace

from mind import config as c
from mind.engine import apply_appraisal, build_prompt_block, decay, emotion_label
from mind.store import Store


def normalize(value: object) -> dict[str, object]:
    neutral = dict(valence=c.ZERO, arousal=c.ZERO, type="neutral", severity=c.ZERO, sincere=True, summary="")
    if not isinstance(value, dict) or not neutral.keys() <= value.keys():
        return neutral
    if not isinstance(value["sincere"], bool) or not isinstance(value["summary"], str) or not isinstance(value["type"], str):
        return neutral
    for key in ("valence", "arousal", "severity"):
        number = value[key]
        if isinstance(number, bool) or not isinstance(number, (float, int)) or not math.isfinite(number):
            return neutral
    return {**value, "type": value["type"] if value["type"] in c.APPRAISAL_TYPES else "neutral"}


def run(request: dict[str, object]) -> dict[str, object]:
    if request["action"] == "config":
        return dict(prompt=c.APPRAISAL_SYSTEM_PROMPT, timeout=c.GROQ_TIMEOUT_SECONDS,
                    maxTokens=c.APPRAISAL_MAX_TOKENS, reasoningMaxTokens=c.APPRAISAL_REASONING_MAX_TOKENS,
                    context=c.CONTEXT_MESSAGES, temperature=c.APPRAISAL_TEMPERATURE)
    now = float(request["now"])
    user_id = str(request["user_id"])
    store = Store(str(request["database"]))
    os.chmod(store.database_path, 0o600)
    state = decay(store.load(user_id, now), now)
    # Turn receipts prevent a failed provider/retry from counting an insult twice.
    with sqlite3.connect(store.database_path, timeout=c.SQLITE_TIMEOUT_SECONDS) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS mind_receipts (user_id TEXT, turn_id TEXT, PRIMARY KEY(user_id,turn_id))")
        if request["action"] == "prepare":
            receipt = conn.execute("SELECT 1 FROM mind_receipts WHERE user_id=? AND turn_id=?", (user_id, request["turn_id"])).fetchone()
            if receipt is None:
                state = apply_appraisal(state, normalize(request.get("appraisal")), now)
                # State and receipt commit atomically on this same connection.
                conn.execute("INSERT INTO mind_state VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json",
                             (user_id, json.dumps(asdict(state), allow_nan=False)))
                conn.execute("INSERT INTO mind_receipts VALUES(?,?)", (user_id, request["turn_id"]))
        elif request["action"] == "finish" and state.anger < c.MID_ANGER:
            top = sorted(state.grudges, key=lambda g: g.weight, reverse=True)[:c.TOP_GRUDGES]
            eligible = next((g for g in top if g.weight > c.COLD_GRUDGE_WEIGHT and not g.mentioned), None)
            if eligible:
                state = replace(state, grudges=[replace(g, mentioned=True) if g is eligible else g for g in state.grudges])
        elif request["action"] == "reset":
            state = store.reset(user_id, now)
            conn.execute("DELETE FROM mind_receipts WHERE user_id=?", (user_id,))
    store.save(user_id, state)
    label, intensity = emotion_label(state, now)
    return dict(state=asdict(state), label=label, intensity=intensity, prompt=build_prompt_block(state, now),
                appraisal=normalize(request.get("appraisal")))


if __name__ == "__main__":
    try:
        print(json.dumps(run(json.load(sys.stdin)), allow_nan=False))
    except Exception:
        print(json.dumps({"error": "Mind state unavailable"}))
        sys.exit(1)
