"""Analítica de hato: conteo temporal e historial por animal."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from .config import AgroTrackConfig
from .detector_tracker import Detection


@dataclass
class _TrackRecord:
    first_frame: int
    last_frame: int
    visible_frames: int = 0
    distance_px: float = 0.0
    zones_visited: List[str] = field(default_factory=list)
    trajectory: List[List[float]] = field(default_factory=list)


class LivestockAnalytics:
    def __init__(self, config: AgroTrackConfig, fps: float) -> None:
        self.config = config
        self.fps = fps
        self._interval_frames = config.counts_interval_sec * fps
        self._next_sample_frame = 0.0
        self.counts_timeseries: List[dict] = []
        self._tracks: Dict[int, _TrackRecord] = {}
        self._heads_sum = 0
        self._max_heads = 0
        self._frames = 0

    def update(self, frame_idx: int, detections: List[Detection], zone_map: Dict[int, str]) -> None:
        count = len(detections)
        self._frames += 1
        self._heads_sum += count
        self._max_heads = max(self._max_heads, count)

        if frame_idx >= self._next_sample_frame:
            self.counts_timeseries.append(
                {
                    "frame": int(frame_idx),
                    "timestamp_sec": round(frame_idx / self.fps, 3),
                    "count": int(count),
                }
            )
            while self._next_sample_frame <= frame_idx:
                self._next_sample_frame += self._interval_frames

        step = max(1, self.config.trajectory_subsample_frames)
        for det in detections:
            rec = self._tracks.get(det.track_id)
            if rec is None:
                rec = _TrackRecord(first_frame=frame_idx, last_frame=frame_idx)
                self._tracks[det.track_id] = rec
            rec.last_frame = frame_idx
            rec.distance_px += det.step_px
            zone = zone_map.get(det.track_id)
            if zone is not None and zone not in rec.zones_visited:
                rec.zones_visited.append(zone)
            if rec.visible_frames % step == 0:
                rec.trajectory.append([round(det.smooth[0], 1), round(det.smooth[1], 1)])
            rec.visible_frames += 1

    def animals(self) -> List[dict]:
        out: List[dict] = []
        for tid in sorted(self._tracks):
            rec = self._tracks[tid]
            visible_sec = rec.visible_frames / self.fps
            out.append(
                {
                    "track_id": int(tid),
                    "first_seen_sec": round(rec.first_frame / self.fps, 3),
                    "last_seen_sec": round(rec.last_frame / self.fps, 3),
                    "total_visible_sec": round(visible_sec, 3),
                    "distance_px": round(rec.distance_px, 2),
                    "avg_speed_px_s": round(rec.distance_px / visible_sec, 2) if visible_sec > 0 else 0.0,
                    "zones_visited": list(rec.zones_visited),
                    "trajectory": rec.trajectory,
                }
            )
        return out

    def summary(self) -> dict:
        return {
            "max_heads": int(self._max_heads),
            "avg_heads": round(self._heads_sum / self._frames, 2) if self._frames else 0.0,
            "unique_animals": len(self._tracks),
        }
