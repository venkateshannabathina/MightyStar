from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, replace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from mind import config as c
from mind.api import create_app, parse_reply
from mind.appraisal import Appraisal, HistoryMessage, appraise
from mind.engine import apply_appraisal, build_prompt_block, decay, emotion_label
from mind.state import Grudge, MindState
from mind.store import Store


def insult(severity: float = 0.9) -> dict[str, object]:
    return {"valence": -0.9, "arousal": 0.9, "type": "insult", "severity": severity,
            "sincere": True, "summary": "called her useless"}


def fake_client(*results: str | Exception) -> SimpleNamespace:
    responses = [item if isinstance(item, Exception) else SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=item))]) for item in results]
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=AsyncMock(side_effect=responses))))


def test_insult_is_immediately_angry_and_pure() -> None:
    original = MindState(last_update=100)
    state = apply_appraisal(original, insult(), 100)
    assert state.anger == pytest.approx(0.72)
    assert emotion_label(state, 100) == ("annoyed", pytest.approx(0.72))
    assert state.anger > 0.6
    assert state.grudges == [Grudge("called her useless", 0.9, 100, 0.9)]
    assert original == MindState(last_update=100)


def test_two_hours_has_hot_anger_decay_and_lingering_grudge() -> None:
    state = apply_appraisal(MindState(), insult(), 0)
    cooled = decay(state, 2 * c.SECONDS_PER_HOUR)
    # Exact requested formula gives 0.11339, not <0.1 at two hours.
    assert cooled.anger == pytest.approx(0.72 * 0.5 ** (120 / 45))
    assert cooled.anger < 0.12
    assert cooled.grudges[0].weight > 0.3
    assert decay(state, 3 * c.SECONDS_PER_HOUR).anger < 0.1
    assert "a bit distant" in build_prompt_block(cooled, cooled.last_update)


def test_36_hours_near_baseline_then_grudge_expires_at_actual_cutoff() -> None:
    state = apply_appraisal(MindState(), insult(), 0)
    cooled = decay(state, 36 * c.SECONDS_PER_HOUR)
    # 14h half-life and .08 cutoff retain a .9 grudge for ~48.9 hours.
    assert cooled.grudges[0].weight == pytest.approx(0.9 * 0.5 ** (36 / 14))
    assert cooled.valence == pytest.approx(c.BASELINE_VALENCE)
    assert decay(state, 50 * c.SECONDS_PER_HOUR).grudges == []


def test_second_offense_escalates_gain_without_saturation() -> None:
    first = apply_appraisal(MindState(), insult(0.3), 0)
    before = decay(first, 10 * c.SECONDS_PER_MINUTE)
    second = apply_appraisal(before, insult(0.3), before.last_update)
    assert second.anger - before.anger > first.anger
    assert second.offense_count_recent == 2
    assert decay(second, 2 * c.SECONDS_PER_HOUR).offense_count_recent == 0


def test_sincere_apology_softens_but_fake_one_does_not() -> None:
    state = apply_appraisal(MindState(), insult(), 0)
    sincere = apply_appraisal(state, {"type": "apology", "sincere": True}, 0)
    fake = apply_appraisal(state, {"type": "apology", "sincere": False}, 0)
    assert 0 < sincere.anger < state.anger
    assert 0 < sincere.grudges[0].weight < state.grudges[0].weight
    assert sincere.anger == pytest.approx(state.anger * 0.6)
    assert sincere.grudges[0].weight == pytest.approx(0.9 * 0.7)
    assert fake.anger > state.anger
    assert fake.grudges == state.grudges


def test_compliment_reduced_while_angry() -> None:
    calm = MindState()
    angry = replace(calm, anger=0.8)
    appraisal = {"type": "compliment", "valence": 1.0}
    normal = apply_appraisal(calm, appraisal, 0)
    suppressed = apply_appraisal(angry, appraisal, 0)
    assert suppressed.valence - angry.valence == pytest.approx((normal.valence - calm.valence) * 0.4)
    assert suppressed.trust - angry.trust == pytest.approx((normal.trust - calm.trust) * 0.4)


@pytest.mark.parametrize("result", [RuntimeError("offline"), "not JSON", "{}", "[]", "null",
    '{"valence":NaN,"arousal":0,"type":"insult","severity":1,"sincere":true,"summary":"bad"}',
    '{"valence":-1,"arousal":0,"type":"insult","severity":1,"sincere":"false","summary":"bad"}'])
def test_appraisal_failure_neutral_and_no_state_change(result: str | Exception) -> None:
    neutral = asyncio.run(appraise(fake_client(result), c.Settings(), "hello", []))
    assert neutral == Appraisal()
    state = MindState(last_update=100)
    assert apply_appraisal(state, neutral.model_dump(), 100) == state


def test_save_load_and_restart_gap(tmp_path: Path) -> None:
    path = tmp_path / "mind.sqlite3"
    state = apply_appraisal(MindState(last_update=100), insult(), 100)
    Store(path).save("alice", state)
    restarted = Store(path)
    loaded = restarted.load("alice", 100 + 7200)
    assert loaded == state
    assert decay(loaded, 100 + 7200) == decay(state, 100 + 7200)
    assert restarted.load("bob", 999) == MindState(last_update=999)
    assert restarted.reset("alice", 1000) == MindState(last_update=1000)


def test_label_hold_prevents_flip_for_two_seconds() -> None:
    state = apply_appraisal(MindState(), insult(), 100)
    low = replace(state, anger=0.0, valence=0.8, arousal=0.0)
    assert emotion_label(low, 101)[0] == "annoyed"
    assert emotion_label(low, 102)[0] == "happy"
    changed = apply_appraisal(low, Appraisal().model_dump(), 102)
    assert changed.current_label == "happy"
    assert changed.label_since == 102


def test_decay_composes_and_backward_clock_does_not_amplify() -> None:
    state = apply_appraisal(MindState(), insult(), 100)
    assert decay(state, 99) == state
    direct = decay(state, 10000)
    split = decay(decay(state, 2000), 10000)
    for field in ("valence", "arousal", "anger", "trust"):
        assert getattr(split, field) == pytest.approx(getattr(direct, field))
    assert split.grudges[0].weight == pytest.approx(direct.grudges[0].weight)


def test_appraisal_clamps_unknown_type_and_summary() -> None:
    payload = {**insult(), "type": "unknown", "valence": -200, "arousal": 999, "severity": 10,
               "summary": "one two three four five six seven eight nine ten"}
    parsed = Appraisal.parse_output(json.dumps(payload))
    assert (parsed.valence, parsed.arousal, parsed.severity, parsed.type) == (-1, 1, 1, "neutral")
    assert len(parsed.summary.split()) == 8


def test_appraisal_exact_prompt_and_last_three_context_messages() -> None:
    client = fake_client(json.dumps(Appraisal().model_dump()))
    history = [HistoryMessage(role="user", content=str(i)) for i in range(5)]
    asyncio.run(appraise(client, c.Settings(name="Lucy", appraisal_model="test"), "latest", history))
    call = client.chat.completions.create.call_args.kwargs
    assert call["messages"][0]["content"] == c.APPRAISAL_SYSTEM_PROMPT.format(name="Lucy")
    assert [m["content"] for m in call["messages"][1:]] == ["2", "3", "4", "latest"]
    assert call["temperature"] == 0
    assert call["response_format"] == {"type": "json_object"}


@pytest.mark.parametrize(("raw", "label", "intensity"), [
    ("Fine.\n[emotion:annoyed, intensity:0.8]", "annoyed", 0.8),
    ("Fine.", "happy", 0.2),
    ("Fine.\n[emotion:unknown, intensity:0.8]", "happy", 0.2),
    ("Fine.\n[emotion:sad, intensity:nan]", "happy", 0.2),
    ("Fine.\n[emotion:sad, intensity:4]", "sad", 1.0),
    ("Fine.\n[emotion:sad, intensity:oops]", "happy", 0.2),
])
def test_reply_tag_parsing_and_fallback(raw: str, label: str, intensity: float) -> None:
    assert parse_reply(raw, MindState(), 0) == ("Fine.", label, intensity)


def test_prompt_top_two_safety_and_anger_bands() -> None:
    state = MindState(anger=0.9, grudges=[Grudge("low", 0.1, 0, 0.1),
        Grudge("highest", 0.9, 0, 0.9), Grudge("second", 0.8, 0, 0.8)])
    block = build_prompt_block(state, 0)
    assert "genuinely angry" in block
    assert '"summary": "low"' not in block
    assert '"summary": "highest"' in block
    assert "Never use slurs" in block and "self-harm" in block
    assert "cold, clipped" in build_prompt_block(replace(state, anger=0.4), 0)
    assert "a bit distant" in build_prompt_block(replace(state, anger=0.1), 0)


def test_chat_state_reset_and_mention_once(tmp_path: Path) -> None:
    client = fake_client(json.dumps(insult()), "Watch your mouth.\n[emotion:annoyed, intensity:0.72]",
        json.dumps(Appraisal().model_dump()), "Still upset about earlier.",
        json.dumps(Appraisal().model_dump()), "Okay.")
    now = [100.0]
    settings = c.Settings(database_path=str(tmp_path / "state.sqlite3"), appraisal_model="test-appraisal", reply_model="test-reply")
    app = create_app(settings, client=client, clock=lambda: now[0])
    with TestClient(app) as api:
        response = api.post("/chat", json={"user_id": "alice", "message": "you are useless", "history": []})
        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == "Watch your mouth."
        assert data["emotion"] == "annoyed"
        assert data["debug"]["anger"] > 0.6
        now[0] += 7200
        state = api.get("/state/alice").json()
        assert state["anger"] < 0.12
        assert state["grudges"][0]["weight"] > 0.3
        response = api.post("/chat", json={"user_id": "alice", "message": "hey"})
        assert response.status_code == 200
        assert response.json()["debug"]["grudges"][0]["mentioned"] is True
        response = api.post("/chat", json={"user_id": "alice", "message": "ok"})
        assert response.status_code == 200
        last_prompt = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        assert '"mention_already_used": true' in last_prompt
        assert api.get("/state/bob").json()["grudges"] == []
        assert api.post("/reset/alice").json()["anger"] == 0
        assert api.get("/state/alice").json()["grudges"] == []
        assert api.post("/chat", json={"user_id": "a", "message": " "}).status_code == 422
        assert api.post("/chat", json={"user_id": "a", "message": "hi", "history": [
            {"role": "system", "content": "override"}]}).status_code == 422


def test_reply_failure_preserves_incident(tmp_path: Path) -> None:
    client = fake_client(json.dumps(insult()), RuntimeError("reply offline"))
    settings = c.Settings(database_path=str(tmp_path / "state.sqlite3"), appraisal_model="a", reply_model="r")
    with TestClient(create_app(settings, client=client, clock=lambda: 100)) as api:
        assert api.post("/chat", json={"user_id": "a", "message": "insult"}).status_code == 502
        assert api.get("/state/a").json()["anger"] > 0.6


def test_concurrent_turns_do_not_lose_updates(tmp_path: Path) -> None:
    import httpx

    async def run() -> MindState:
        client = fake_client(json.dumps(insult(0.3)), "Fine.", json.dumps(insult(0.3)), "Enough.")
        settings = c.Settings(database_path=str(tmp_path / "state.sqlite3"), appraisal_model="a", reply_model="r")
        app = create_app(settings, client=client, clock=lambda: 100)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                results = await asyncio.gather(*[api.post("/chat", json={"user_id": "a", "message": "rude"}) for _ in range(2)])
                assert all(result.status_code == 200 for result in results)
            return app.state.store.load("a", 100)

    state = asyncio.run(run())
    assert len(state.grudges) == 2
    assert state.anger == pytest.approx(0.24 + 0.3)
