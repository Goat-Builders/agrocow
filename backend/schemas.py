"""Modelos Pydantic de la API."""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

VideoStatus = Literal["uploaded", "queued", "processing", "completed", "failed"]


class VideoOut(BaseModel):
    id: int
    filename: str
    size_bytes: int
    status: VideoStatus
    created_at: str
    finished_at: Optional[str] = None
    duration_sec: Optional[float] = None
    codec: Optional[str] = None
    unique_animals: Optional[int] = None
    max_heads: Optional[int] = None
    total_events: Optional[int] = None


class StatusOut(BaseModel):
    video_id: int
    filename: str
    status: VideoStatus
    error: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    has_output_video: bool = False
    codec: Optional[str] = None


class ProcessAccepted(BaseModel):
    video_id: int
    status: VideoStatus


class VideoMeta(BaseModel):
    video_id: int
    filename: str
    processed_at: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    duration_sec: Optional[float] = None


# --- dashboard ---------------------------------------------------------------
class DashboardSummary(BaseModel):
    videos_total: int
    videos_processed: int
    videos_failed: int
    videos_in_progress: int
    # Suma de ``unique_animals`` de cada video: los track_id se reinician por video,
    # por lo que NO equivale a animales distintos entre videos.
    total_unique_tracks: int
    max_simultaneous: int
    total_events: int
    critical_events: int


# --- analytics ---------------------------------------------------------------
class CountPoint(BaseModel):
    timestamp_sec: float
    count: int


class CountsVideo(VideoMeta):
    unique_animals: int
    max_heads: int
    avg_heads: float
    timeseries: List[CountPoint]


class CountsOut(BaseModel):
    videos: List[CountsVideo]


class AnimalTrack(BaseModel):
    track_id: int
    first_seen_sec: float
    last_seen_sec: float
    total_visible_sec: float
    distance_px: float
    avg_speed_px_s: float
    zones_visited: List[str]
    trajectory: List[List[float]]


class TrackingVideo(VideoMeta):
    animals: List[AnimalTrack]


class TrackingOut(BaseModel):
    videos: List[TrackingVideo]


class EventOut(BaseModel):
    video_id: int
    filename: str
    processed_at: Optional[str] = None
    event_id: int
    event_type: str
    track_id: Optional[int] = None
    severity: Literal["warning", "critical"]
    start_timestamp_sec: float
    end_timestamp_sec: float
    duration_seconds: float
    metric_value: float
    zone: Optional[str] = None
    description: str


class EventsOut(BaseModel):
    events: List[EventOut]


class ZoneStat(BaseModel):
    zone: str
    total_visits: int
    unique_animals: int
    total_dwell_sec: float
    avg_dwell_per_visit_sec: float
    per_animal_dwell_sec: Dict[str, float]


class ZonesVideo(VideoMeta):
    zones: List[ZoneStat]


class ZonesOut(BaseModel):
    videos: List[ZonesVideo]
