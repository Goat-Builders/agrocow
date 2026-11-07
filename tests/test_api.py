"""Pruebas de la API de punta a punta.

El motor real (YOLO) no corre acá: se inyecta un motor de PRUEBA que cumple el contrato
de ``backend/services/engine_adapter.py``. Sirve solo para verificar la integración
backend <-> SQLite <-> API. La aplicación en sí nunca fabrica resultados.
"""

from __future__ import annotations

import time

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient


class ContractEngine:
    def process_video(self, input_path, output_path):
        with open(output_path, "wb") as fh:
            fh.write(b"fake-mp4")
        zone = {"total_visits": 2, "unique_animals": 1, "total_dwell_sec": 4.0,
                "avg_dwell_per_visit_sec": 2.0, "per_animal_dwell_sec": {"1": 4.0}}
        return {
            "video": {"width": 640, "height": 360, "fps": 25.0, "total_frames": 50, "duration_sec": 2.0,
                      "codec": "avc1", "zone_polygons_px": {"feeding_zone": [[0, 0], [640, 0], [640, 90], [0, 90]]}},
            "summary": {"max_heads": 2, "avg_heads": 1.5, "unique_animals": 2, "total_events": 1,
                        "critical_events": 0},
            "counts_timeseries": [{"frame": 0, "timestamp_sec": 0.0, "count": 1},
                                  {"frame": 12, "timestamp_sec": 0.5, "count": 2}],
            "zones": {"feeding_zone": zone, "hydration_zone": zone, "general_zone": zone},
            "animals": [{"track_id": 1, "first_seen_sec": 0.0, "last_seen_sec": 2.0, "total_visible_sec": 2.0,
                         "distance_px": 10.0, "avg_speed_px_s": 5.0, "zones_visited": ["general_zone"],
                         "trajectory": [[10.0, 20.0], [12.0, 22.0]]}],
            "events": [{"event_id": 1, "event_type": "isolated_animal", "track_id": 1, "severity": "warning",
                        "start_timestamp_sec": 0.5, "end_timestamp_sec": 1.5, "duration_seconds": 1.0,
                        "metric_value": 3.0, "zone": "general_zone", "start_frame": 12, "end_frame": 37,
                        "description": "evento de prueba"}],
        }


class BrokenEngine:
    def process_video(self, input_path, output_path):
        return {"video": {}}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from backend import settings
    from backend.services import engine_adapter

    monkeypatch.setattr(settings, "UPLOADS_DIR", tmp_path / "uploads")
    monkeypatch.setattr(settings, "OUTPUTS_DIR", tmp_path / "outputs")
    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(engine_adapter, "_engine", ContractEngine())
    from backend.main import app

    with TestClient(app) as c:
        yield c


def _mp4(tmp_path):
    path = tmp_path / "in.mp4"
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 5, (64, 48))
    for _ in range(5):
        w.write(np.zeros((48, 64, 3), np.uint8))
    w.release()
    return path.read_bytes()


def _wait(client, vid, target):
    for _ in range(100):
        st = client.get(f"/api/videos/{vid}/status").json()
        if st["status"] in target:
            return st
        time.sleep(0.05)
    raise AssertionError(st)


def test_empty_states(client):
    s = client.get("/api/dashboard/summary").json()
    assert s["videos_processed"] == 0 and s["total_events"] == 0
    assert client.get("/api/analytics/counts").json() == {"videos": []}
    assert client.get("/api/analytics/events").json() == {"events": []}


def test_end_to_end(client, tmp_path):
    data = _mp4(tmp_path)
    r = client.post("/api/videos/upload", files={"file": ("corral.mp4", data, "video/mp4")})
    assert r.status_code == 201
    vid = r.json()["id"]
    assert client.get(f"/api/videos/{vid}/status").json()["status"] == "uploaded"

    assert client.post(f"/api/videos/{vid}/process").status_code == 202
    assert _wait(client, vid, {"completed", "failed"})["status"] == "completed"

    s = client.get("/api/dashboard/summary").json()
    assert (s["videos_processed"], s["total_unique_tracks"], s["max_simultaneous"], s["total_events"]) == (1, 2, 2, 1)
    assert client.get("/api/analytics/counts").json()["videos"][0]["timeseries"][1]["count"] == 2
    assert client.get(f"/api/analytics/tracking?video_id={vid}").json()["videos"][0]["animals"][0]["trajectory"][0] == [10.0, 20.0]
    assert client.get("/api/analytics/events?severity=critical").json()["events"] == []
    assert client.get("/api/analytics/events?severity=warning").json()["events"][0]["event_type"] == "isolated_animal"
    zones = client.get("/api/analytics/zones").json()["videos"][0]["zones"]
    assert {z["zone"] for z in zones} == {"feeding_zone", "hydration_zone", "general_zone"}
    assert client.get(f"/api/videos/{vid}/output").content == b"fake-mp4"
    # reprocesar reemplaza resultados, no los duplica
    client.post(f"/api/videos/{vid}/process")
    _wait(client, vid, {"completed", "failed"})
    assert len(client.get("/api/analytics/events").json()["events"]) == 1


def test_validation_and_errors(client, tmp_path):
    assert client.post("/api/videos/upload", files={"file": ("a.avi", b"x", "video/x-msvideo")}).status_code == 415
    assert client.post("/api/videos/upload", files={"file": ("a.mp4", b"", "video/mp4")}).status_code == 400
    assert client.post("/api/videos/99/process").status_code == 404
    assert client.get("/api/videos/99/status").status_code == 404
    assert client.get("/api/analytics/counts?video_id=99").status_code == 404


def test_contract_violation_marks_failed(client, tmp_path, monkeypatch):
    from backend.services import engine_adapter

    monkeypatch.setattr(engine_adapter, "_engine", BrokenEngine())
    vid = client.post("/api/videos/upload", files={"file": ("a.mp4", _mp4(tmp_path), "video/mp4")}).json()["id"]
    client.post(f"/api/videos/{vid}/process")
    st = _wait(client, vid, {"completed", "failed"})
    assert st["status"] == "failed" and "falta" in st["error"].lower()
    assert client.get("/api/dashboard/summary").json()["videos_failed"] == 1
