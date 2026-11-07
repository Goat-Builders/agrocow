"""Tablas SQLite del módulo blockchain, en la misma base del backend.

`cattle` guarda, por vaca o lote, el `token_id` del NFT y la dirección del contrato (`contract_address`).
`track_assignments` dice qué caravana es cada `track_id` de un video: el motor no reconoce a la misma
vaca entre videos, así que esa asignación la hace una persona (o, a futuro, la lectura de caravanas).
"""

from __future__ import annotations

import sqlite3
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS cattle (
    caravana_id       TEXT PRIMARY KEY,
    owner_wallet      TEXT NOT NULL,
    registered_at     TEXT NOT NULL,
    token_id          INTEGER,
    contract_address  TEXT,
    chain_id          INTEGER,
    metadata_uri      TEXT,
    history_url       TEXT,
    status            TEXT NOT NULL DEFAULT 'registered',  -- registered|behavior_ok_7d|commercial_ready|critical_alert
    last_attested_end TEXT,
    last_tx_hash      TEXT,
    updated_at        TEXT
);
CREATE TABLE IF NOT EXISTS track_assignments (
    video_id    INTEGER NOT NULL,
    track_id    INTEGER NOT NULL,
    caravana_id TEXT NOT NULL REFERENCES cattle(caravana_id),
    observed_on TEXT NOT NULL,
    PRIMARY KEY (video_id, track_id)
);
CREATE TABLE IF NOT EXISTS observations (
    caravana_id     TEXT NOT NULL REFERENCES cattle(caravana_id),
    observed_on     TEXT NOT NULL,
    video_id        INTEGER NOT NULL,
    observed_sec    REAL NOT NULL,
    isolated_events INTEGER NOT NULL,
    critical_events INTEGER NOT NULL,
    PRIMARY KEY (caravana_id, observed_on, video_id)
);
CREATE TABLE IF NOT EXISTS chain_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT NOT NULL,
    caravana_id TEXT,
    action      TEXT NOT NULL,
    tx_hash     TEXT,
    ok          INTEGER NOT NULL,
    detail      TEXT
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)


def upsert_cattle(conn: sqlite3.Connection, caravana_id: str, owner_wallet: str, registered_at: str) -> None:
    conn.execute(
        "INSERT INTO cattle (caravana_id, owner_wallet, registered_at, updated_at) VALUES (?,?,?,?) "
        "ON CONFLICT(caravana_id) DO NOTHING",
        (caravana_id, owner_wallet, registered_at, now_iso()),
    )


def update_cattle(conn: sqlite3.Connection, caravana_id: str, **fields: Any) -> None:
    if not fields:
        return
    fields["updated_at"] = now_iso()
    cols = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(f"UPDATE cattle SET {cols} WHERE caravana_id = ?", (*fields.values(), caravana_id))


def get_cattle(conn: sqlite3.Connection, caravana_id: str) -> Optional[Dict[str, Any]]:
    r = conn.execute("SELECT * FROM cattle WHERE caravana_id = ?", (caravana_id,)).fetchone()
    return dict(r) if r else None


def list_cattle(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    return [dict(r) for r in conn.execute("SELECT * FROM cattle ORDER BY caravana_id")]


def assign(conn: sqlite3.Connection, video_id: int, track_id: int, caravana_id: str, observed_on: date) -> None:
    conn.execute(
        "INSERT INTO track_assignments (video_id, track_id, caravana_id, observed_on) VALUES (?,?,?,?) "
        "ON CONFLICT(video_id, track_id) DO UPDATE SET caravana_id = excluded.caravana_id, observed_on = excluded.observed_on",
        (video_id, track_id, caravana_id, observed_on.isoformat()),
    )


def assignments_for(conn: sqlite3.Connection, video_id: int) -> List[Dict[str, Any]]:
    return [dict(r) for r in conn.execute("SELECT * FROM track_assignments WHERE video_id = ?", (video_id,))]


def put_observation(conn: sqlite3.Connection, caravana_id: str, observed_on: str, video_id: int,
                    observed_sec: float, isolated: int, critical: int) -> None:
    conn.execute(
        "INSERT INTO observations VALUES (?,?,?,?,?,?) ON CONFLICT(caravana_id, observed_on, video_id) DO UPDATE SET "
        "observed_sec = excluded.observed_sec, isolated_events = excluded.isolated_events, critical_events = excluded.critical_events",
        (caravana_id, observed_on, video_id, observed_sec, isolated, critical),
    )


def observations_for(conn: sqlite3.Connection, caravana_id: str) -> List[Dict[str, Any]]:
    return [dict(r) for r in conn.execute(
        "SELECT * FROM observations WHERE caravana_id = ? ORDER BY observed_on, video_id", (caravana_id,))]


def log(conn: sqlite3.Connection, action: str, ok: bool, caravana_id: Optional[str] = None,
        tx_hash: Optional[str] = None, detail: str = "") -> None:
    conn.execute("INSERT INTO chain_log (ts, caravana_id, action, tx_hash, ok, detail) VALUES (?,?,?,?,?,?)",
                 (now_iso(), caravana_id, action, tx_hash, int(ok), detail[:2000]))


def log_for(conn: sqlite3.Connection, caravana_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    if caravana_id:
        rows = conn.execute("SELECT * FROM chain_log WHERE caravana_id = ? ORDER BY id DESC LIMIT ?", (caravana_id, limit))
    else:
        rows = conn.execute("SELECT * FROM chain_log ORDER BY id DESC LIMIT ?", (limit,))
    return [dict(r) for r in rows]
