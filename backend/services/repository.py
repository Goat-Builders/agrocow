"""Acceso a datos: todas las consultas SQL viven acá."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..database import get_conn


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _row(r: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return dict(r) if r is not None else None


# --- videos -----------------------------------------------------------------
def create_video(filename: str, stored_path: str, size_bytes: int) -> int:
    with get_conn() as c:
        cur = c.execute(
            "INSERT INTO videos (filename, stored_path, size_bytes, created_at) VALUES (?,?,?,?)",
            (filename, stored_path, size_bytes, now_iso()),
        )
        return int(cur.lastrowid)


def get_video(video_id: int) -> Optional[Dict[str, Any]]:
    with get_conn() as c:
        return _row(c.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone())


def list_videos() -> List[Dict[str, Any]]:
    with get_conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM videos ORDER BY id DESC")]


def try_enqueue(video_id: int) -> bool:
    """Pasa a 'queued' de forma atómica; False si ya está en cola o procesando."""
    with get_conn() as c:
        cur = c.execute(
            "UPDATE videos SET status='queued', error=NULL, started_at=NULL, finished_at=NULL "
            "WHERE id = ? AND status NOT IN ('queued','processing')",
            (video_id,),
        )
        return cur.rowcount == 1


def mark_processing(video_id: int) -> None:
    with get_conn() as c:
        c.execute("UPDATE videos SET status='processing', started_at=? WHERE id=?", (now_iso(), video_id))


def mark_failed(video_id: int, error: str) -> None:
    with get_conn() as c:
        c.execute(
            "UPDATE videos SET status='failed', error=?, finished_at=? WHERE id=?",
            (error[:2000], now_iso(), video_id),
        )


def fail_interrupted() -> int:
    """Al arrancar: lo que quedó en cola/procesando no se va a completar solo."""
    with get_conn() as c:
        cur = c.execute(
            "UPDATE videos SET status='failed', finished_at=?, error=? "
            "WHERE status IN ('queued','processing')",
            (now_iso(), "Procesamiento interrumpido por reinicio del servidor. Volvé a procesar el video."),
        )
        return cur.rowcount


def save_result(video_id: int, output_path: str, result: Dict[str, Any]) -> None:
    """Guarda en una sola transacción el resultado del motor (reemplaza corridas previas)."""
    v, s = result["video"], result["summary"]
    with get_conn() as c:
        for table in ("counts", "animals", "zone_stats", "events"):
            c.execute(f"DELETE FROM {table} WHERE video_id = ?", (video_id,))
        c.executemany(
            "INSERT INTO counts (video_id, frame, timestamp_sec, count) VALUES (?,?,?,?)",
            [(video_id, p["frame"], p["timestamp_sec"], p["count"]) for p in result["counts_timeseries"]],
        )
        c.executemany(
            "INSERT INTO animals VALUES (?,?,?,?,?,?,?,?,?)",
            [
                (video_id, a["track_id"], a["first_seen_sec"], a["last_seen_sec"], a["total_visible_sec"],
                 a["distance_px"], a["avg_speed_px_s"], json.dumps(a["zones_visited"]),
                 json.dumps(a["trajectory"]))
                for a in result["animals"]
            ],
        )
        c.executemany(
            "INSERT INTO zone_stats VALUES (?,?,?,?,?,?,?)",
            [
                (video_id, zone, z["total_visits"], z["unique_animals"], z["total_dwell_sec"],
                 z["avg_dwell_per_visit_sec"], json.dumps(z["per_animal_dwell_sec"]))
                for zone, z in result["zones"].items()
            ],
        )
        c.executemany(
            "INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (video_id, e["event_id"], e["event_type"], e["track_id"], e["severity"],
                 e["start_timestamp_sec"], e["end_timestamp_sec"], e["duration_seconds"],
                 e["metric_value"], e["zone"], e["start_frame"], e["end_frame"], e["description"])
                for e in result["events"]
            ],
        )
        c.execute(
            "UPDATE videos SET status='completed', error=NULL, finished_at=?, output_path=?, width=?, "
            "height=?, fps=?, total_frames=?, duration_sec=?, codec=?, zone_polygons_px=?, "
            "unique_animals=?, max_heads=?, avg_heads=?, total_events=?, critical_events=? WHERE id=?",
            (now_iso(), output_path, v["width"], v["height"], v["fps"], v["total_frames"],
             v["duration_sec"], v["codec"], json.dumps(v["zone_polygons_px"]), s["unique_animals"],
             s["max_heads"], s["avg_heads"], s["total_events"], s["critical_events"], video_id),
        )


# --- consultas de analítica ---------------------------------------------------
def completed_videos(video_id: Optional[int] = None) -> List[Dict[str, Any]]:
    sql = "SELECT * FROM videos WHERE status='completed'"
    args: tuple = ()
    if video_id is not None:
        sql += " AND id = ?"
        args = (video_id,)
    with get_conn() as c:
        return [dict(r) for r in c.execute(sql + " ORDER BY id", args)]


def dashboard_summary() -> Dict[str, int]:
    with get_conn() as c:
        r = c.execute(
            """SELECT COUNT(*) AS total,
                      SUM(status='completed') AS done,
                      SUM(status='failed') AS failed,
                      SUM(status IN ('queued','processing')) AS running,
                      COALESCE(SUM(CASE WHEN status='completed' THEN unique_animals END),0) AS tracks,
                      COALESCE(MAX(CASE WHEN status='completed' THEN max_heads END),0) AS maxh,
                      COALESCE(SUM(CASE WHEN status='completed' THEN total_events END),0) AS events,
                      COALESCE(SUM(CASE WHEN status='completed' THEN critical_events END),0) AS crit
               FROM videos"""
        ).fetchone()
    return {
        "videos_total": r["total"] or 0,
        "videos_processed": r["done"] or 0,
        "videos_failed": r["failed"] or 0,
        "videos_in_progress": r["running"] or 0,
        "total_unique_tracks": r["tracks"],
        "max_simultaneous": r["maxh"],
        "total_events": r["events"],
        "critical_events": r["crit"],
    }


def counts_for(video_id: int) -> List[Dict[str, Any]]:
    with get_conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT timestamp_sec, count FROM counts WHERE video_id=? ORDER BY timestamp_sec", (video_id,))]


def animals_for(video_id: int) -> List[Dict[str, Any]]:
    with get_conn() as c:
        rows = c.execute("SELECT * FROM animals WHERE video_id=? ORDER BY track_id", (video_id,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["zones_visited"] = json.loads(d["zones_visited"] or "[]")
        d["trajectory"] = json.loads(d["trajectory"] or "[]")
        out.append(d)
    return out


def zones_for(video_id: int) -> List[Dict[str, Any]]:
    with get_conn() as c:
        rows = c.execute("SELECT * FROM zone_stats WHERE video_id=?", (video_id,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["per_animal_dwell_sec"] = json.loads(d["per_animal_dwell_sec"] or "{}")
        out.append(d)
    return out


def events_list(video_id: Optional[int], severity: Optional[str], event_type: Optional[str]) -> List[Dict[str, Any]]:
    sql = ("SELECT e.*, v.filename, v.finished_at AS processed_at FROM events e "
           "JOIN videos v ON v.id = e.video_id WHERE v.status='completed'")
    args: List[Any] = []
    for col, val in (("e.video_id", video_id), ("e.severity", severity), ("e.event_type", event_type)):
        if val is not None:
            sql += f" AND {col} = ?"
            args.append(val)
    sql += " ORDER BY e.video_id DESC, e.start_timestamp_sec"
    with get_conn() as c:
        return [dict(r) for r in c.execute(sql, args)]
