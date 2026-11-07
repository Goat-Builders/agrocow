"""Monitoreo de zonas con histéresis temporal."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Set

import cv2
import numpy as np

from .config import ZONE_PRIORITY, AgroTrackConfig
from .detector_tracker import Detection


@dataclass
class _AnimalZoneState:
    confirmed: Optional[str] = None
    candidate: Optional[str] = None
    candidate_frames: int = 0
    last_frame: int = -1


class ZoneMonitor:
    def __init__(self, config: AgroTrackConfig, zones_px: Dict[str, np.ndarray], fps: float) -> None:
        self.config = config
        self.zones_px = zones_px
        self.fps = fps
        self.hysteresis_frames = max(1, int(config.hysteresis_sec * fps))
        self._states: Dict[int, _AnimalZoneState] = {}
        self._visits: Dict[str, int] = {z: 0 for z in ZONE_PRIORITY}
        self._dwell: Dict[str, float] = {z: 0.0 for z in ZONE_PRIORITY}
        self._animals: Dict[str, Set[int]] = {z: set() for z in ZONE_PRIORITY}
        self._per_animal: Dict[str, Dict[int, float]] = {z: {} for z in ZONE_PRIORITY}

    def classify(self, point_xy) -> str:
        """Zona cruda del punto según prioridad feeding > hydration > general."""
        pt = (float(point_xy[0]), float(point_xy[1]))
        for name in ZONE_PRIORITY:
            if cv2.pointPolygonTest(self.zones_px[name], pt, False) >= 0:
                return name
        return ZONE_PRIORITY[-1]

    def update(self, frame_idx: int, detections: List[Detection]) -> Dict[int, str]:
        """Actualiza la máquina de estados y devuelve {track_id: zona convalidada}."""
        tol = self.config.lost_tolerance_frames
        zone_map: Dict[int, str] = {}
        dt = 1.0 / self.fps

        for det in detections:
            tid = det.track_id
            raw = self.classify(det.smooth)
            st = self._states.get(tid)
            if st is None:
                st = _AnimalZoneState()
                self._states[tid] = st

            if st.confirmed is None:
                self._confirm(st, tid, raw)
            else:
                # La continuidad se rompe si el track estuvo ausente demasiado tiempo.
                if frame_idx - st.last_frame > tol:
                    st.candidate, st.candidate_frames = None, 0
                if raw == st.confirmed:
                    st.candidate, st.candidate_frames = None, 0
                else:
                    if raw == st.candidate:
                        st.candidate_frames += 1
                    else:
                        st.candidate, st.candidate_frames = raw, 1
                    if st.candidate_frames >= self.hysteresis_frames:
                        self._confirm(st, tid, raw)
            st.last_frame = frame_idx

            zone = st.confirmed  # type: ignore[assignment]
            self._dwell[zone] += dt
            self._per_animal[zone][tid] = self._per_animal[zone].get(tid, 0.0) + dt
            zone_map[tid] = zone
        return zone_map

    def _confirm(self, st: _AnimalZoneState, tid: int, zone: str) -> None:
        st.confirmed = zone
        st.candidate, st.candidate_frames = None, 0
        self._visits[zone] += 1
        self._animals[zone].add(tid)

    def stats(self) -> Dict[str, dict]:
        out: Dict[str, dict] = {}
        for zone in ZONE_PRIORITY:
            visits = self._visits[zone]
            dwell = self._dwell[zone]
            out[zone] = {
                "total_visits": int(visits),
                "unique_animals": len(self._animals[zone]),
                "total_dwell_sec": round(dwell, 3),
                "avg_dwell_per_visit_sec": round(dwell / visits, 3) if visits else 0.0,
                "per_animal_dwell_sec": {
                    str(tid): round(sec, 3) for tid, sec in sorted(self._per_animal[zone].items())
                },
            }
        return out
