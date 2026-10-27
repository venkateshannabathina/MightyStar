"""Immutable state snapshots; engine operations return new snapshots."""
from __future__ import annotations

from dataclasses import dataclass, field

from . import config as c


@dataclass(frozen=True)
class Grudge:
    summary: str
    severity: float
    created_at: float
    weight: float
    mentioned: bool = False


@dataclass(frozen=True)
class MindState:
    valence: float = c.BASELINE_VALENCE
    arousal: float = c.BASELINE_AROUSAL
    trust: float = c.BASELINE_TRUST
    anger: float = c.ZERO
    grudges: list[Grudge] = field(default_factory=list)
    last_update: float = c.ZERO
    current_label: str | None = None
    label_since: float = c.ZERO

    @property
    def offense_count_recent(self) -> int:
        return sum(
            c.ZERO <= self.last_update - grudge.created_at <= c.RECENT_OFFENSE_WINDOW
            for grudge in self.grudges
        )
