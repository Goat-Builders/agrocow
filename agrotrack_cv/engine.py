"""Fachada pública del motor: ``AgroTrackEngine.process_video``."""

from __future__ import annotations

import math
import os
import threading
from typing import Optional

import cv2

from .analytics import LivestockAnalytics
from .config import AgroTrackConfig
from .detector_tracker import DetectorTracker
from .events import EventEngine
from .video_processor import FrameRenderer, OutputWriter
from .zones import ZoneMonitor


class AgroTrackEngine:
    def __init__(self, config: Optional[AgroTrackConfig] = None) -> None:
        self.config = config if config is not None else AgroTrackConfig()
        self._detector: Optional[DetectorTracker] = None
        self._lock = threading.Lock()  # el modelo/tracker mantiene estado: un video a la vez

    def process_video(self, input_path: str, output_path: str) -> dict:
        """Procesa un video y escribe el MP4 anotado en ``output_path``.

        Devuelve un diccionario JSON-serializable con las claves:
        ``video``, ``summary``, ``counts_timeseries``, ``zones``, ``animals``, ``events``.
        """
        if not os.path.isfile(input_path):
            raise FileNotFoundError(f"No existe el video de entrada: {input_path}")
        with self._lock:
            return self._process(input_path, output_path)

    def _process(self, input_path: str, output_path: str) -> dict:
        cfg = self.config
        if self._detector is None:
            self._detector = DetectorTracker(cfg)
        detector = self._detector
        detector.reset()

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise ValueError(f"No se pudo abrir el video: {input_path}")
        writer: Optional[OutputWriter] = None
        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            if not math.isfinite(fps) or fps <= 0:
                fps = cfg.fallback_fps

            ok, frame = cap.read()
            if not ok or frame is None:
                raise ValueError(f"El video no contiene frames legibles: {input_path}")
            height, width = frame.shape[:2]

            zones_px = cfg.scaled_zones(width, height)
            zone_monitor = ZoneMonitor(cfg, zones_px, fps)
            analytics = LivestockAnalytics(cfg, fps)
            events = EventEngine(cfg, fps)
            renderer = FrameRenderer(cfg, zones_px, (width, height))
            writer = OutputWriter(output_path, fps, (width, height))

            frame_idx = 0
            while ok and frame is not None:
                detections = detector.step(frame)
                zone_map = zone_monitor.update(frame_idx, detections)
                analytics.update(frame_idx, detections, zone_map)
                severity_map, alerts = events.update(frame_idx, detections, zone_map)
                renderer.render(frame, frame_idx, fps, detections, zone_map, severity_map, alerts)
                writer.write(frame)
                frame_idx += 1
                ok, frame = cap.read()

            total_frames = frame_idx
            event_list = events.finalize()
            summary = analytics.summary()
            summary["total_events"] = len(event_list)
            summary["critical_events"] = sum(1 for e in event_list if e["severity"] == "critical")

            return {
                "video": {
                    "input_path": input_path,
                    "output_path": output_path,
                    "width": int(width),
                    "height": int(height),
                    "fps": round(fps, 3),
                    "total_frames": int(total_frames),
                    "duration_sec": round(total_frames / fps, 3),
                    "codec": writer.codec,
                    "zone_polygons_px": {
                        name: [[round(float(x), 1), round(float(y), 1)] for x, y in pts.reshape(-1, 2)]
                        for name, pts in zones_px.items()
                    },
                },
                "summary": summary,
                "counts_timeseries": analytics.counts_timeseries,
                "zones": zone_monitor.stats(),
                "animals": analytics.animals(),
                "events": event_list,
            }
        finally:
            cap.release()
            if writer is not None:
                writer.release()
