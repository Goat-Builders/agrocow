"""Detección + tracking en un solo paso (YOLO11n + ByteTrack) con filtro EMA."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np

from .config import COW_CLASS_ID, AgroTrackConfig


@dataclass
class Detection:
    track_id: int
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    conf: float
    base: Tuple[float, float]  # B_t: punto basal crudo
    smooth: Tuple[float, float]  # S_t: punto basal suavizado (EMA)
    width: float  # W_t
    step_px: float  # desplazamiento efectivo (con deadband)
    is_new: bool  # primera observación del track (sin paso previo)


class DetectorTracker:
    def __init__(self, config: AgroTrackConfig) -> None:
        from ultralytics import YOLO  # import diferido: carga pesada

        self.config = config
        self.model = YOLO(config.model_name)
        self._smooth: Dict[int, np.ndarray] = {}

    def reset(self) -> None:
        """Reinicia el estado de tracking y EMA para procesar un video nuevo."""
        self._smooth.clear()
        # Reinicia los trackers en el lugar. Recrear el predictor registraría
        # callbacks duplicados y el tracker se actualizaría varias veces por frame.
        predictor = getattr(self.model, "predictor", None)
        for tracker in getattr(predictor, "trackers", None) or []:
            tracker.reset()

    def step(self, frame: np.ndarray) -> List[Detection]:
        results = self.model.track(
            frame,
            persist=True,
            tracker=self.config.tracker,
            classes=[COW_CLASS_ID],
            conf=self.config.conf_threshold,
            verbose=False,
        )
        if not results:
            return []
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0 or boxes.id is None:
            return []

        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        ids = boxes.id.cpu().numpy().astype(int)

        alpha = self.config.ema_alpha
        min_width = self.config.min_box_width_ratio * frame.shape[1]
        detections: List[Detection] = []
        seen = set()
        for box, conf, tid in zip(xyxy, confs, ids):
            tid = int(tid)
            if tid in seen:
                continue
            seen.add(tid)
            x1, y1, x2, y2 = (float(v) for v in box)
            width = x2 - x1
            if width < min_width:
                continue
            base = np.array([(x1 + x2) / 2.0, y2], dtype=np.float64)

            prev = self._smooth.get(tid)
            if prev is None:
                smooth = base.copy()
                step = 0.0
                is_new = True
            else:
                smooth = alpha * base + (1.0 - alpha) * prev
                delta = float(math.hypot(smooth[0] - prev[0], smooth[1] - prev[1]))
                step = 0.0 if delta < self.config.deadband_ratio * width else delta
                is_new = False
            self._smooth[tid] = smooth

            detections.append(
                Detection(
                    track_id=tid,
                    bbox=(x1, y1, x2, y2),
                    conf=float(conf),
                    base=(float(base[0]), float(base[1])),
                    smooth=(float(smooth[0]), float(smooth[1])),
                    width=float(width),
                    step_px=step,
                    is_new=is_new,
                )
            )
        return detections
