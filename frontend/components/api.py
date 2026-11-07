"""Cliente HTTP del backend (``requests``)."""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import requests

API_URL = os.getenv("AGROTRACK_API_URL", "http://localhost:8000").rstrip("/")
# URL con la que el NAVEGADOR llega al backend (para reproducir el video). Por defecto, la misma.
PUBLIC_API_URL = os.getenv("AGROTRACK_PUBLIC_API_URL", API_URL).rstrip("/")


class ApiError(Exception):
    pass


def _request(method: str, path: str, **kwargs: Any) -> Any:
    try:
        resp = requests.request(method, f"{API_URL}{path}", timeout=kwargs.pop("timeout", 30), **kwargs)
    except requests.RequestException as exc:
        raise ApiError(
            f"No se pudo conectar con el backend en {API_URL}. "
            "Iniciálo con: uvicorn backend.main:app --reload"
        ) from exc
    if not resp.ok:
        try:
            detail = resp.json().get("detail", resp.text)
        except ValueError:
            detail = resp.text
        raise ApiError(f"{detail} (HTTP {resp.status_code})")
    return resp.json()


def _params(**kw: Optional[Any]) -> Dict[str, Any]:
    return {k: v for k, v in kw.items() if v is not None}


def upload_video(filename: str, data: bytes) -> dict:
    return _request("POST", "/api/videos/upload", files={"file": (filename, data, "video/mp4")}, timeout=600)


def list_videos() -> list:
    return _request("GET", "/api/videos")


def process_video(video_id: int) -> dict:
    return _request("POST", f"/api/videos/{video_id}/process")


def video_status(video_id: int) -> dict:
    return _request("GET", f"/api/videos/{video_id}/status")


def output_url(video_id: int) -> str:
    return f"{PUBLIC_API_URL}/api/videos/{video_id}/output"


def summary() -> dict:
    return _request("GET", "/api/dashboard/summary")


def counts(video_id: Optional[int] = None) -> dict:
    return _request("GET", "/api/analytics/counts", params=_params(video_id=video_id))


def tracking(video_id: Optional[int] = None) -> dict:
    return _request("GET", "/api/analytics/tracking", params=_params(video_id=video_id))


def events(video_id: Optional[int] = None, severity: Optional[str] = None) -> dict:
    return _request("GET", "/api/analytics/events", params=_params(video_id=video_id, severity=severity))


def zones(video_id: Optional[int] = None) -> dict:
    return _request("GET", "/api/analytics/zones", params=_params(video_id=video_id))
