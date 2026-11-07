"""Renderizado de video anotado y exportación MP4."""

from __future__ import annotations

import os
from collections import deque
from typing import Deque, Dict, List, Tuple

import cv2
import numpy as np

from .config import ZONE_PRIORITY, AgroTrackConfig
from .detector_tracker import Detection

# Colores BGR
_SEVERITY_COLOR = {
    "normal": (60, 200, 60),  # verde
    "warning": (0, 165, 255),  # naranja
    "critical": (40, 40, 230),  # rojo
}
_ZONE_COLOR = {
    "feeding_zone": (60, 200, 90),
    "hydration_zone": (230, 150, 40),
    "general_zone": (190, 190, 190),
}
_CODECS = ("avc1", "mp4v")


class OutputWriter:
    """VideoWriter MP4: intenta H.264 ('avc1') y cae a 'mp4v' si no está disponible."""

    def __init__(self, path: str, fps: float, size: Tuple[int, int]) -> None:
        directory = os.path.dirname(os.path.abspath(path))
        os.makedirs(directory, exist_ok=True)
        self.codec = ""
        self._writer = None
        for codec in _CODECS:
            writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*codec), fps, size)
            if writer.isOpened():
                self._writer = writer
                self.codec = codec
                break
            writer.release()
        if self._writer is None:
            raise RuntimeError(f"No se pudo abrir el escritor de video para '{path}' con {_CODECS}.")

    def write(self, frame: np.ndarray) -> None:
        self._writer.write(frame)

    def release(self) -> None:
        if self._writer is not None:
            self._writer.release()
            self._writer = None


class FrameRenderer:
    def __init__(self, config: AgroTrackConfig, zones_px: Dict[str, np.ndarray], size: Tuple[int, int]) -> None:
        self.config = config
        self.zones_int = {name: pts.astype(np.int32) for name, pts in zones_px.items()}
        self.width, self.height = size
        self.scale = max(0.5, self.width / 1280.0)
        self._trails: Dict[int, Deque[Tuple[int, int]]] = {}
        self._trail_last: Dict[int, int] = {}

    def render(
        self,
        frame: np.ndarray,
        frame_idx: int,
        fps: float,
        detections: List[Detection],
        zone_map: Dict[int, str],
        severity_map: Dict[int, str],
        active_alerts: int,
    ) -> np.ndarray:
        self._draw_zones(frame)
        self._update_trails(frame_idx, detections)

        font_scale = 0.5 * self.scale
        thick = max(1, int(round(2 * self.scale)))
        for det in detections:
            color = _SEVERITY_COLOR[severity_map.get(det.track_id, "normal")]
            trail = self._trails.get(det.track_id)
            if trail is not None and len(trail) > 1:
                pts = np.array(trail, dtype=np.int32).reshape(-1, 1, 2)
                cv2.polylines(frame, [pts], False, color, max(1, thick - 1), cv2.LINE_AA)

            x1, y1, x2, y2 = (int(round(v)) for v in det.bbox)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, thick)
            sx, sy = int(round(det.smooth[0])), int(round(det.smooth[1]))
            cv2.circle(frame, (sx, sy), max(3, int(round(5 * self.scale))), color, -1, cv2.LINE_AA)
            cv2.circle(frame, (sx, sy), max(4, int(round(6 * self.scale))), (255, 255, 255), 1, cv2.LINE_AA)

            label = f"ID:{det.track_id} | {det.conf:.2f} | {zone_map.get(det.track_id, '-')}"
            (tw, th), base = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
            ty = max(y1, th + base + 2)
            cv2.rectangle(frame, (x1, ty - th - base - 2), (x1 + tw + 4, ty), color, -1)
            cv2.putText(frame, label, (x1 + 2, ty - base - 1), cv2.FONT_HERSHEY_SIMPLEX,
                        font_scale, (255, 255, 255), 1, cv2.LINE_AA)

        feeding = sum(1 for z in zone_map.values() if z == "feeding_zone")
        hydration = sum(1 for z in zone_map.values() if z == "hydration_zone")
        self._draw_hud(
            frame,
            f"Frame: {frame_idx} | Time: {frame_idx / fps:.2f}s | Heads: {len(detections)} | "
            f"Feeding: {feeding} | Hydration: {hydration} | Active Alerts: {active_alerts}",
        )
        return frame

    # ------------------------------------------------------------- helpers
    def _draw_zones(self, frame: np.ndarray) -> None:
        # La zona general (todo el corral) va con opacidad muy baja para no lavar la imagen.
        for name, alpha in (("general_zone", 0.05), ("hydration_zone", 0.22), ("feeding_zone", 0.22)):
            overlay = frame.copy()
            cv2.fillPoly(overlay, [self.zones_int[name]], _ZONE_COLOR[name])
            cv2.addWeighted(overlay, alpha, frame, 1.0 - alpha, 0, dst=frame)
        for name in ZONE_PRIORITY:
            if name == "general_zone":
                continue
            cv2.polylines(frame, [self.zones_int[name]], True, _ZONE_COLOR[name], 1, cv2.LINE_AA)

    def _update_trails(self, frame_idx: int, detections: List[Detection]) -> None:
        for det in detections:
            trail = self._trails.setdefault(det.track_id, deque(maxlen=self.config.trail_length))
            trail.append((int(round(det.smooth[0])), int(round(det.smooth[1]))))
            self._trail_last[det.track_id] = frame_idx
        for tid in [t for t, last in self._trail_last.items() if frame_idx - last > self.config.trail_length]:
            self._trails.pop(tid, None)
            self._trail_last.pop(tid, None)

    def _draw_hud(self, frame: np.ndarray, text: str) -> None:
        hud_h = max(28, int(round(34 * self.scale)))
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (self.width, hud_h), (20, 20, 20), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, dst=frame)
        cv2.putText(frame, text, (10, int(hud_h * 0.68)), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55 * self.scale, (255, 255, 255), 1, cv2.LINE_AA)
