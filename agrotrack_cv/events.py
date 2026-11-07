"""Inteligencia conductual: eventos consolidados (sin diagnósticos veterinarios)."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np

from .config import AgroTrackConfig
from .detector_tracker import Detection

ISOLATED = "isolated_animal"
IMMOBILITY = "prolonged_immobility"
GROUP_SHIFT = "group_activity_shift"

_SEVERITY_RANK = {"normal": 0, "warning": 1, "critical": 2}


@dataclass
class _Condition:
    start_frame: int
    last_true_frame: int
    misses: int = 0
    event: Optional[dict] = None


class EventEngine:
    def __init__(self, config: AgroTrackConfig, fps: float) -> None:
        self.config = config
        self.fps = fps
        self.tol = config.lost_tolerance_frames
        self.events: List[dict] = []
        self._conds: Dict[Tuple[str, Optional[int]], _Condition] = {}
        self._windows: Dict[int, Deque[Tuple[int, float, float]]] = {}
        self._window_frames = max(1, math.ceil(config.immobility_window_sec * fps))
        group_frames = max(1, math.ceil(config.group_shift_window_sec * fps))
        self._group_hist: Deque[float] = deque(maxlen=group_frames)
        self._group_warmup = max(2, math.ceil(config.group_shift_warmup_sec * fps))

    # ------------------------------------------------------------------ API
    def update(
        self, frame_idx: int, detections: List[Detection], zone_map: Dict[int, str]
    ) -> Tuple[Dict[int, str], int]:
        """Evalúa reglas y devuelve ({track_id: severidad activa}, nº de alertas activas)."""
        present = {d.track_id: d for d in detections}
        wbar = float(np.mean([d.width for d in detections])) if detections else 0.0

        self._eval_isolation(frame_idx, detections, present, wbar, zone_map)
        self._eval_immobility(frame_idx, present, zone_map)
        self._eval_group_shift(frame_idx, detections, wbar)

        severity_by_track: Dict[int, str] = {}
        alerts = 0
        for (etype, tid), cond in self._conds.items():
            if cond.event is None:
                continue
            alerts += 1
            if tid is None:
                continue
            sev = cond.event["severity"]
            if _SEVERITY_RANK[sev] > _SEVERITY_RANK.get(severity_by_track.get(tid, "normal"), 0):
                severity_by_track[tid] = sev
        return severity_by_track, alerts

    def finalize(self) -> List[dict]:
        out: List[dict] = []
        for ev in sorted(self.events, key=lambda e: (e["start_frame"], e["event_id"])):
            item = dict(ev)
            item["description"] = self._describe(item)
            out.append(item)
        return out

    # ---------------------------------------------------------------- reglas
    def _eval_isolation(self, frame_idx, detections, present, wbar, zone_map) -> None:
        values: Dict[int, float] = {}
        flags: Dict[int, bool] = {}
        if len(detections) >= self.config.isolation_min_animals and wbar > 0:
            pts = np.array([d.smooth for d in detections], dtype=np.float64)
            diff = pts[:, None, :] - pts[None, :, :]
            dist = np.sqrt((diff ** 2).sum(axis=2))
            np.fill_diagonal(dist, np.inf)
            nn = dist.min(axis=1)
            for det, d_nn in zip(detections, nn):
                values[det.track_id] = float(d_nn) / wbar
                flags[det.track_id] = bool(d_nn > self.config.isolation_mult * wbar)

        keys = {tid for (etype, tid) in self._conds if etype == ISOLATED and tid is not None}
        for tid in keys | set(flags):
            self._advance(
                (ISOLATED, tid),
                flags.get(tid, False),
                frame_idx,
                values.get(tid, 0.0),
                self.config.isolation_min_sec,
                zone_map.get(tid),
            )

    def _eval_immobility(self, frame_idx, present, zone_map) -> None:
        cfg = self.config
        gap_limit = max(cfg.lost_tolerance_frames, int(round(self.fps)))
        results: Dict[int, Tuple[bool, float]] = {}

        for tid, det in present.items():
            win = self._windows.get(tid)
            if win is not None and frame_idx - win[-1][0] > gap_limit:
                win.clear()
            if win is None:
                win = deque()
                self._windows[tid] = win
            win.append((frame_idx, det.smooth[0], det.smooth[1]))
            horizon = frame_idx - self._window_frames
            while win and win[0][0] < horizon:
                win.popleft()

            covers = len(win) >= 2 and (win[0][0] - horizon) <= cfg.lost_tolerance_frames
            if not covers:
                results[tid] = (False, 0.0)
                continue
            pts = np.array([(x, y) for _, x, y in win], dtype=np.float64)
            centroid = pts.mean(axis=0)
            radius = float(np.sqrt(((pts - centroid) ** 2).sum(axis=1)).max())
            width = max(det.width, 1e-6)
            results[tid] = (radius < cfg.immobility_radius_ratio * width, radius / width)

        for tid in list(self._windows):
            if tid not in present and frame_idx - self._windows[tid][-1][0] > self._window_frames:
                del self._windows[tid]

        keys = {tid for (etype, tid) in self._conds if etype == IMMOBILITY and tid is not None}
        for tid in keys | set(results):
            ok, val = results.get(tid, (False, 0.0))
            self._advance(
                (IMMOBILITY, tid),
                ok,
                frame_idx,
                val,
                cfg.immobility_window_sec,
                zone_map.get(tid),
                start_override=frame_idx - self._window_frames,
            )

    def _eval_group_shift(self, frame_idx, detections, wbar) -> None:
        cfg = self.config
        speeds = [d.step_px * self.fps for d in detections if not d.is_new]
        cond, z = False, 0.0
        if speeds:
            group_speed = float(np.mean(speeds))
            if len(self._group_hist) >= self._group_warmup:
                hist = np.fromiter(self._group_hist, dtype=np.float64)
                mu = float(hist.mean())
                sigma = max(float(hist.std()), cfg.group_shift_min_sigma_ratio * wbar, 1e-9)
                z = (group_speed - mu) / sigma
                cond = group_speed > mu + cfg.group_shift_zscore * sigma
            self._group_hist.append(group_speed)
        self._advance((GROUP_SHIFT, None), cond, frame_idx, z, cfg.group_shift_min_sec, None)

    # ------------------------------------------------------- consolidación
    def _advance(
        self,
        key: Tuple[str, Optional[int]],
        cond: bool,
        frame_idx: int,
        value: float,
        min_sec: float,
        zone: Optional[str],
        start_override: Optional[int] = None,
    ) -> None:
        state = self._conds.get(key)
        if not cond:
            if state is not None:
                state.misses += 1
                if state.misses > self.tol:
                    del self._conds[key]
            return

        if state is None:
            start = frame_idx if start_override is None else max(0, start_override)
            state = _Condition(start_frame=start, last_true_frame=frame_idx)
            self._conds[key] = state
        else:
            state.last_true_frame = frame_idx
            state.misses = 0

        duration = (frame_idx - state.start_frame) / self.fps
        if duration + 1e-9 < min_sec:
            return

        severity = "critical" if duration > 2.0 * min_sec else "warning"
        if state.event is None:
            state.event = {
                "event_id": len(self.events) + 1,
                "event_type": key[0],
                "track_id": key[1],
                "severity": severity,
                "start_timestamp_sec": round(state.start_frame / self.fps, 3),
                "end_timestamp_sec": 0.0,
                "duration_seconds": 0.0,
                "metric_value": 0.0,
                "zone": zone,
                "start_frame": int(state.start_frame),
                "end_frame": int(frame_idx),
            }
            self.events.append(state.event)
        ev = state.event
        ev["severity"] = severity
        ev["end_timestamp_sec"] = round(frame_idx / self.fps, 3)
        ev["duration_seconds"] = round(duration, 3)
        ev["metric_value"] = round(float(value), 3)
        ev["end_frame"] = int(frame_idx)
        if zone is not None:
            ev["zone"] = zone

    @staticmethod
    def _describe(ev: dict) -> str:
        dur = ev["duration_seconds"]
        who = f"El animal {ev['track_id']}" if ev["track_id"] is not None else "El grupo"
        if ev["event_type"] == ISOLATED:
            return (
                f"{who} se mantuvo separado del resto del grupo durante {dur:.1f} s "
                f"(distancia al vecino más cercano: {ev['metric_value']:.2f} anchos de animal)."
            )
        if ev["event_type"] == IMMOBILITY:
            return (
                f"{who} permaneció con movimiento mínimo durante {dur:.1f} s "
                f"(radio de movimiento: {ev['metric_value']:.2f} anchos de animal)."
            )
        return (
            f"Aumento sostenido de la actividad grupal durante {dur:.1f} s "
            f"(z-score de velocidad: {ev['metric_value']:.2f})."
        )
