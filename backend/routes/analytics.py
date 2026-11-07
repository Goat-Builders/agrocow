"""Consultas históricas. Todos aceptan ``video_id`` opcional; sin él devuelven todos los videos completados."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from .. import schemas
from ..services import repository

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _videos(video_id: Optional[int]) -> list:
    videos = repository.completed_videos(video_id)
    if video_id is not None and not videos:
        raise HTTPException(404, f"El video {video_id} no existe o todavía no fue procesado.")
    return videos


def _meta(v: dict) -> dict:
    return {
        "video_id": v["id"], "filename": v["filename"], "processed_at": v["finished_at"],
        "width": v["width"], "height": v["height"], "fps": v["fps"], "duration_sec": v["duration_sec"],
    }


@router.get("/counts", response_model=schemas.CountsOut)
def counts(video_id: Optional[int] = None) -> dict:
    return {"videos": [
        {**_meta(v), "unique_animals": v["unique_animals"], "max_heads": v["max_heads"],
         "avg_heads": v["avg_heads"], "timeseries": repository.counts_for(v["id"])}
        for v in _videos(video_id)
    ]}


@router.get("/tracking", response_model=schemas.TrackingOut)
def tracking(video_id: Optional[int] = None) -> dict:
    return {"videos": [{**_meta(v), "animals": repository.animals_for(v["id"])} for v in _videos(video_id)]}


@router.get("/events", response_model=schemas.EventsOut)
def events(
    video_id: Optional[int] = None,
    severity: Optional[str] = Query(None, pattern="^(warning|critical)$"),
    event_type: Optional[str] = None,
) -> dict:
    if video_id is not None:
        _videos(video_id)
    return {"events": repository.events_list(video_id, severity, event_type)}


@router.get("/zones", response_model=schemas.ZonesOut)
def zones(video_id: Optional[int] = None) -> dict:
    return {"videos": [{**_meta(v), "zones": repository.zones_for(v["id"])} for v in _videos(video_id)]}
