"""FastAPI service. Run one worker to serialize concurrent turns safely."""
from __future__ import annotations

import asyncio
import math
import re
import time
from contextlib import asynccontextmanager
from dataclasses import asdict, replace
from typing import Annotated, AsyncIterator, Callable

from fastapi import FastAPI, HTTPException, Request
from groq import AsyncGroq
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import config as c
from .appraisal import HistoryMessage, appraise
from .engine import apply_appraisal, build_prompt_block, clamp, decay, emotion_label
from .state import MindState
from .store import Store


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: Annotated[str, Field(min_length=c.MIN_TEXT_LENGTH, max_length=c.MAX_USER_ID_LENGTH)]
    message: Annotated[str, Field(min_length=c.MIN_TEXT_LENGTH, max_length=c.MAX_MESSAGE_LENGTH)]
    history: list[HistoryMessage] = Field(default_factory=list, max_length=c.MAX_HISTORY_MESSAGES)

    @field_validator("user_id", "message")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class DebugState(BaseModel):
    valence: float
    anger: float
    trust: float
    grudges: list[dict[str, object]]


class ChatResponse(BaseModel):
    reply: str
    emotion: str
    intensity: float
    debug: DebugState


def parse_reply(raw: str, state: MindState, now: float) -> tuple[str, str, float]:
    fallback_label, fallback_intensity = emotion_label(state, now)
    label, intensity = fallback_label, fallback_intensity
    match = re.search(c.TAG_PATTERN, raw)
    if match:
        try:
            parsed_intensity = float(match.group("intensity"))
            if match.group("label") in c.EMOTION_LABELS and math.isfinite(parsed_intensity):
                label = match.group("label")
                intensity = clamp(parsed_intensity)
        except ValueError:
            pass
    if state.current_label is not None and now - state.label_since < c.LABEL_HOLD_SECONDS:
        label = fallback_label
        if match is None or label != match.group("label"):
            intensity = fallback_intensity
    return re.sub(c.TAG_LIKE_PATTERN, "", raw).strip(), label, intensity


def _consume_mention_allowance(state: MindState) -> MindState:
    if state.anger >= c.MID_ANGER:
        return state
    candidates = sorted(range(len(state.grudges)), key=lambda index: state.grudges[index].weight, reverse=True)[:c.TOP_GRUDGES]
    eligible = next((index for index in candidates
        if state.grudges[index].weight > c.COLD_GRUDGE_WEIGHT and not state.grudges[index].mentioned), None)
    if eligible is None:
        return state
    return replace(state, grudges=[replace(g, mentioned=True) if index == eligible else g
                                  for index, g in enumerate(state.grudges)])


def create_app(
    settings: c.Settings | None = None, *, client: AsyncGroq | None = None,
    clock: Callable[[], float] = time.time,
) -> FastAPI:
    settings = settings if settings is not None else c.Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if not settings.appraisal_model or not settings.reply_model:
            raise RuntimeError("Set GROQ_APPRAISAL_MODEL and GROQ_REPLY_MODEL")
        if client is None and not settings.api_key:
            raise RuntimeError("Set GROQ_API_KEY")
        app.state.persona = settings.persona_path.read_text(encoding="utf-8").replace("{name}", settings.name)
        app.state.store = Store(settings.database_path)
        app.state.client = client if client is not None else AsyncGroq(
            api_key=settings.api_key, timeout=c.GROQ_TIMEOUT_SECONDS, max_retries=c.GROQ_MAX_RETRIES)
        app.state.turn_lock = asyncio.Lock()
        try:
            yield
        finally:
            if client is None:
                await app.state.client.close()

    app = FastAPI(title="Companion Mind", lifespan=lifespan)

    @app.post("/chat", response_model=ChatResponse)
    async def chat(body: ChatRequest, request: Request) -> ChatResponse:
        runtime = request.app.state
        async with runtime.turn_lock:
            now = clock()
            state = decay(runtime.store.load(body.user_id, now), now)
            appraisal = await appraise(runtime.client, settings, body.message, body.history)
            state = apply_appraisal(state, appraisal.model_dump(), now)
            block = build_prompt_block(state, now)
            try:
                response = await runtime.client.chat.completions.create(
                    model=settings.reply_model, temperature=c.REPLY_TEMPERATURE,
                    max_completion_tokens=c.REPLY_MAX_TOKENS,
                    messages=[{"role": "system", "content": runtime.persona + "\n\n" + block},
                              *[item.model_dump() for item in body.history],
                              {"role": "user", "content": body.message}],
                )
                raw = response.choices[0].message.content
                if not isinstance(raw, str) or not raw.strip():
                    raise ValueError("empty reply")
                reply, label, intensity = parse_reply(raw, state, now)
                if not reply:
                    raise ValueError("reply contains only a tag")
            except Exception as error:
                runtime.store.save(body.user_id, state)
                raise HTTPException(status_code=c.HTTP_BAD_GATEWAY, detail="Companion reply unavailable") from error
            state = _consume_mention_allowance(state)
            runtime.store.save(body.user_id, state)
            return ChatResponse(reply=reply, emotion=label, intensity=intensity, debug=DebugState(
                valence=state.valence, anger=state.anger, trust=state.trust,
                grudges=[asdict(g) for g in state.grudges]))

    @app.get("/state/{user_id}")
    async def get_state(user_id: str, request: Request) -> dict[str, object]:
        runtime = request.app.state
        async with runtime.turn_lock:
            now = clock()
            state = decay(runtime.store.load(user_id, now), now)
            runtime.store.save(user_id, state)
            return {**asdict(state), "offense_count_recent": state.offense_count_recent}

    @app.post("/reset/{user_id}")
    async def reset(user_id: str, request: Request) -> dict[str, object]:
        runtime = request.app.state
        async with runtime.turn_lock:
            state = runtime.store.reset(user_id, clock())
            return {**asdict(state), "offense_count_recent": state.offense_count_recent}

    return app


def app() -> FastAPI:
    """Uvicorn factory keeps mutable module globals out of this service."""
    return create_app()
