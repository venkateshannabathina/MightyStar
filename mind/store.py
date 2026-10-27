"""SQLite snapshots. One connection per transaction; timestamps survive restart."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Iterator

from . import config as c
from .state import Grudge, MindState


class Store:
    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        if self.database_path == ":memory:":
            raise ValueError("Use a filesystem database; connections are transaction scoped")
        Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS mind_state (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL)")

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.database_path, timeout=c.SQLITE_TIMEOUT_SECONDS)
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def load(self, user_id: str, now: float) -> MindState:
        with self._connection() as conn:
            row = conn.execute("SELECT state_json FROM mind_state WHERE user_id = ?", (user_id,)).fetchone()
        if row is None:
            return MindState(last_update=now)
        values = json.loads(row[0])
        values["grudges"] = [Grudge(**grudge) for grudge in values["grudges"]]
        return MindState(**values)

    def save(self, user_id: str, state: MindState) -> None:
        payload = json.dumps(asdict(state), allow_nan=False)
        with self._connection() as conn:
            conn.execute(
                "INSERT INTO mind_state(user_id, state_json) VALUES (?, ?) "
                "ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json",
                (user_id, payload),
            )

    def reset(self, user_id: str, now: float) -> MindState:
        state = MindState(last_update=now)
        self.save(user_id, state)
        return state
