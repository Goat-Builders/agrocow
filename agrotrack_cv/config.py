"""Configuración de hiperparámetros y zonas del motor AgroTrack CV."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import numpy as np

COW_CLASS_ID = 19  # COCO: "cow"

# Orden de prioridad para solapamientos (el primero que contiene el punto gana).
ZONE_PRIORITY: Tuple[str, ...] = ("feeding_zone", "hydration_zone", "general_zone")

NormalizedPolygon = List[Tuple[float, float]]


def _default_zones() -> Dict[str, NormalizedPolygon]:
    """Polígonos por defecto en coordenadas normalizadas [0.0, 1.0].

    - feeding_zone: franja superior (comedero).
    - hydration_zone: esquina lateral inferior derecha (bebedero).
    - general_zone: todo el corral. Como tiene la prioridad más baja,
      en la práctica representa "el resto del corral".
    """
    return {
        "feeding_zone": [(0.0, 0.0), (1.0, 0.0), (1.0, 0.25), (0.0, 0.25)],
        "hydration_zone": [(0.80, 0.55), (1.0, 0.55), (1.0, 1.0), (0.80, 1.0)],
        "general_zone": [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)],
    }


@dataclass
class AgroTrackConfig:
    # --- Modelo / detección ---
    model_name: str = "yolo11n.pt"
    conf_threshold: float = 0.30
    # Ancho mínimo de caja como fracción del ancho del frame; descarta animales
    # muy lejanos cuyo tracking es inestable. 0.0 desactiva el filtro.
    min_box_width_ratio: float = 0.04

    # --- Suavizado y ruido ---
    ema_alpha: float = 0.30
    deadband_ratio: float = 0.02

    # --- Zonas ---
    hysteresis_sec: float = 0.5

    # --- Eventos: animal aislado ---
    isolation_mult: float = 2.5
    isolation_min_sec: float = 10.0
    isolation_min_animals: int = 3

    # --- Eventos: inmovilidad prolongada ---
    immobility_window_sec: float = 15.0
    immobility_radius_ratio: float = 0.20

    # --- Eventos: cambio de actividad grupal ---
    group_shift_zscore: float = 3.0
    group_shift_min_sec: float = 2.0
    group_shift_window_sec: float = 30.0
    # Segundos mínimos de historial antes de evaluar el z-score.
    group_shift_warmup_sec: float = 5.0
    # Piso de sigma (en anchos de caja por segundo) para evitar z infinito
    # cuando el grupo estuvo completamente quieto.
    group_shift_min_sigma_ratio: float = 0.05

    # --- Tolerancia a frames perdidos consecutivos en condiciones de eventos ---
    lost_tolerance_frames: int = 5

    # --- Analítica ---
    trajectory_subsample_frames: int = 5
    counts_interval_sec: float = 0.5

    # --- Render ---
    trail_length: int = 30

    # --- Video ---
    fallback_fps: float = 30.0

    # --- Polígonos normalizados ---
    zones_normalized: Dict[str, NormalizedPolygon] = field(default_factory=_default_zones)

    def __post_init__(self) -> None:
        if not 0.0 < self.ema_alpha <= 1.0:
            raise ValueError("ema_alpha debe estar en (0, 1].")
        for name in ZONE_PRIORITY:
            if name not in self.zones_normalized:
                raise ValueError(f"Falta el polígono de la zona '{name}'.")
        for name, poly in self.zones_normalized.items():
            if len(poly) < 3:
                raise ValueError(f"La zona '{name}' necesita al menos 3 vértices.")
            for x, y in poly:
                if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
                    raise ValueError(
                        f"La zona '{name}' tiene un vértice fuera de [0, 1]: ({x}, {y})."
                    )

    def scaled_zones(self, width: int, height: int) -> Dict[str, np.ndarray]:
        """Escala los polígonos normalizados al tamaño real del video.

        Devuelve, por zona, un array float32 de forma (N, 1, 2) listo para
        ``cv2.pointPolygonTest`` y ``cv2.fillPoly`` (tras convertir a int32).
        """
        scale = np.array([float(width), float(height)], dtype=np.float32)
        zones: Dict[str, np.ndarray] = {}
        for name in ZONE_PRIORITY:
            pts = np.asarray(self.zones_normalized[name], dtype=np.float32) * scale
            zones[name] = pts.reshape(-1, 1, 2)
        return zones
