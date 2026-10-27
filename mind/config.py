"""All tuning constants and environment-backed service configuration."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ZERO = 0.0
ONE = 1.0
SIGNED_MIN = -1.0
HALF = 0.5
SECONDS_PER_MINUTE = 60.0
SECONDS_PER_HOUR = 3600.0
MOOD_HALF_LIFE = 20 * SECONDS_PER_MINUTE
ANGER_HALF_LIFE = 45 * SECONDS_PER_MINUTE
GRUDGE_HALF_LIFE = 14 * SECONDS_PER_HOUR
TRUST_HALF_LIFE = 24 * SECONDS_PER_HOUR
BASELINE_VALENCE = 0.2
BASELINE_AROUSAL = ZERO
BASELINE_TRUST = HALF
GRUDGE_DROP_WEIGHT = 0.08
RECENT_OFFENSE_WINDOW = SECONDS_PER_HOUR
NEGATIVE_TRIGGER = -0.4
ANGER_GAIN = 0.8
ESCALATION_GAIN = 0.25
NEGATIVE_VALENCE_GAIN = 0.6
TRUST_SENSITIVITY = 0.4
OFFENSE_AROUSAL_GAIN = 0.4
OFFENSE_TRUST_LOSS = 0.10
APOLOGY_ANGER_FACTOR = 0.6
APOLOGY_GRUDGE_FACTOR = 0.7
APOLOGY_VALENCE_GAIN = 0.15
APOLOGY_TRUST_GAIN = 0.02
FAKE_APOLOGY_ANGER_GAIN = 0.1
POSITIVE_VALENCE_GAIN = 0.3
POSITIVE_TRUST_GAIN = 0.03
POSITIVE_SUPPRESSION_THRESHOLD = 0.5
POSITIVE_WHILE_ANGRY_FACTOR = 0.4
JOKE_VALENCE_GAIN = 0.1
IGNORE_VALENCE_LOSS = 0.02
HIGH_ANGER = 0.6
MID_ANGER = 0.25
COLD_GRUDGE_WEIGHT = 0.3
EXCITED_VALENCE = 0.5
EXCITED_AROUSAL = 0.3
HAPPY_VALENCE = 0.15
NEUTRAL_VALENCE = -0.2
IRRITATED_AROUSAL = 0.2
MIN_INTENSITY = 0.2
LABEL_HOLD_SECONDS = 2.0
ANGRY_LABEL = "annoyed"
EMOTION_LABELS = frozenset({"neutral", "happy", "excited", "sad", "thinking", "surprised", "annoyed"})
APPRAISAL_TYPES = frozenset({"compliment", "insult", "apology", "affection", "neutral", "threat", "joke", "ignore"})
CONTEXT_MESSAGES = 3
TOP_GRUDGES = 2
SUMMARY_MAX_WORDS = 8
FALLBACK_SUMMARY = "the user behaved hurtfully"
APPRAISAL_TEMPERATURE = ZERO
REPLY_TEMPERATURE = 0.7
APPRAISAL_MAX_TOKENS = 256
APPRAISAL_REASONING_MAX_TOKENS = 900
REPLY_MAX_TOKENS = 512
GROQ_TIMEOUT_SECONDS = 30.0
GROQ_MAX_RETRIES = 1
SQLITE_TIMEOUT_SECONDS = 30.0
MAX_USER_ID_LENGTH = 200
MAX_MESSAGE_LENGTH = 20000
MAX_HISTORY_MESSAGES = 100
MIN_TEXT_LENGTH = 1
HTTP_BAD_GATEWAY = 502
TAG_PATTERN = r"(?:^|\n)\[emotion:(?P<label>[a-z]+),\s*intensity:(?P<intensity>[^\]\r\n]+)\]\s*\Z"
TAG_LIKE_PATTERN = r"(?:^|\n)\[emotion:[^\r\n]*\]\s*\Z"

APPRAISAL_SYSTEM_PROMPT = "You are an emotion appraisal engine for an AI companion named {name}. Read the user's latest message (with the previous 3 for context) and judge how it would emotionally affect {name} as a real person with feelings. Return ONLY valid JSON, no extra text, with keys valence, arousal, type, severity, sincere, summary. Judge intent and context, not keywords. Friendly teasing between friends is not an insult. Direct personal insults, slurs aimed at her, or swearing AT her (e.g. calling her a b*tch, useless, stupid) are insults with severity 0.6-1.0 depending on how harsh. Mild rudeness is severity 0.2-0.4. Sarcastic or fake apologies: sincere=false. Short neutral messages like 'ok' or 'hmm' are neutral with valence 0. Casual swearing not aimed at her (e.g. 'this code is f***ing broken') is NOT an insult. summary must be neutral and factual, e.g. 'called her a bitch'."


@dataclass(frozen=True)
class Settings:
    name: str = field(default_factory=lambda: os.getenv("COMPANION_NAME", "Mira"))
    appraisal_model: str = field(default_factory=lambda: os.getenv("GROQ_APPRAISAL_MODEL", ""))
    reply_model: str = field(default_factory=lambda: os.getenv("GROQ_REPLY_MODEL", ""))
    api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""), repr=False)
    database_path: str = field(default_factory=lambda: os.getenv("MIND_DATABASE_PATH", "mind.sqlite3"))
    persona_path: Path = field(default_factory=lambda: Path(__file__).with_name("persona.txt"))
