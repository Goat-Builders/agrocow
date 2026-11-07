"""SQLite: esquema y acceso. Se usa ``sqlite3`` de la librería estándar."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from . import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    filename        TEXT NOT NULL,
    stored_path     TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'uploaded',   -- uploaded|queued|processing|completed|failed
    error           TEXT,
    created_at      TEXT NOT NULL,
    started_at      TEXT,
    finished_at     TEXT,
    output_path     TEXT,
    width           INTEGER,
    height          INTEGER,
    fps             REAL,
    total_frames    INTEGER,
    duration_sec    REAL,
    codec           TEXT,
    zone_polygons_px TEXT,                              -- JSON
    unique_animals  INTEGER,
    max_heads       INTEGER,
    avg_heads       REAL,
    total_events    INTEGER,
    critical_events INTEGER
);

CREATE TABLE IF NOT EXISTS counts (
    video_id      INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    frame         INTEGER NOT NULL,
    timestamp_sec REAL NOT NULL,
    count         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS animals (
    video_id         INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    track_id         INTEGER NOT NULL,
    first_seen_sec   REAL,
    last_seen_sec    REAL,
    total_visible_sec REAL,
    distance_px      REAL,
    avg_speed_px_s   REAL,
    zones_visited    TEXT,                              -- JSON
    trajectory       TEXT,                              -- JSON [[x, y], ...]
    PRIMARY KEY (video_id, track_id)
);

CREATE TABLE IF NOT EXISTS zone_stats (
    video_id              INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    zone                  TEXT NOT NULL,
    total_visits          INTEGER,
    unique_animals        INTEGER,
    total_dwell_sec       REAL,
    avg_dwell_per_visit_sec REAL,
    per_animal_dwell_sec  TEXT,                         -- JSON {track_id: sec}
    PRIMARY KEY (video_id, zone)
);

CREATE TABLE IF NOT EXISTS events (
    video_id            INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    event_id            INTEGER NOT NULL,
    event_type          TEXT NOT NULL,
    track_id            INTEGER,
    severity            TEXT NOT NULL,
    start_timestamp_sec REAL,
    end_timestamp_sec   REAL,
    duration_seconds    REAL,
    metric_value        REAL,
    zone                TEXT,
    start_frame         INTEGER,
    end_frame           INTEGER,
    description         TEXT,
    PRIMARY KEY (video_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_counts_video ON counts(video_id);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    """Conexión por operación: commit al salir bien, rollback si hay excepción."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    settings.ensure_dirs()
    with get_conn() as conn:
        conn.executescript(SCHEMA)
