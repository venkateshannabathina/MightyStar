"""Groq appraisal boundary; malformed responses fail closed to neutral."""
from __future__ import annotations

import math
from typing import Annotated, Literal, Sequence

from groq import AsyncGroq
from pydantic import BaseModel, ConfigDict, Field, StrictBool, ValidationInfo, field_validator

from . import config as c
from .engine import clamp


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=c.MIN_TEXT_LENGTH, max_length=c.MAX_MESSAGE_LENGTH)]


class Appraisal(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    valence: float = c.ZERO
    arousal: float = c.ZERO
    type: str = "neutral"
    severity: float = c.ZERO
    sincere: StrictBool = True
    summary: str = ""

    @field_validator("valence", "arousal", "severity", mode="before")
    @classmethod
    def bounded_number(cls, value: object, info: ValidationInfo) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError("expected a finite JSON number")
        return clamp(float(value), c.ZERO if info.field_name == "severity" else c.SIGNED_MIN)

    @field_validator("type")
    @classmethod
    def known_type(cls, value: str) -> str:
        return value if value in c.APPRAISAL_TYPES else "neutral"

    @field_validator("summary")
    @classmethod
    def short_summary(cls, value: str) -> str:
        return " ".join(value.split()[:c.SUMMARY_MAX_WORDS])

    @classmethod
    def parse_output(cls, raw: str) -> Appraisal:
        parsed = cls.model_validate_json(raw)
        if parsed.model_fields_set != set(cls.model_fields):
            raise ValueError("appraisal JSON is missing required keys")
        return parsed


async def appraise(
    client: AsyncGroq, settings: c.Settings, message: str,
    history: Sequence[HistoryMessage],
) -> Appraisal:
    try:
        response = await client.chat.completions.create(
            model=settings.appraisal_model,
            temperature=c.APPRAISAL_TEMPERATURE,
            response_format={"type": "json_object"},
            max_completion_tokens=c.APPRAISAL_MAX_TOKENS,
            messages=[
                {"role": "system", "content": c.APPRAISAL_SYSTEM_PROMPT.format(name=settings.name)},
                *[item.model_dump() for item in history[-c.CONTEXT_MESSAGES:]],
                {"role": "user", "content": message},
            ],
        )
        return Appraisal.parse_output(response.choices[0].message.content or "")
    except Exception:
        return Appraisal()
