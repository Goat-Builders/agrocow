"""Adaptador entre el backend y el motor de Computer Vision.

CONTRATO DE INTEGRACIÓN (ver README, sección "Contrato con el motor")
=====================================================================
El backend solo conoce esta interfaz pública, que es la que expone hoy
``agrotrack_cv``::

    from agrotrack_cv import AgroTrackEngine
    result: dict = AgroTrackEngine().process_video(input_path, output_path)

* ``input_path``: ruta a un MP4 existente.
* ``output_path``: ruta donde el motor escribe el MP4 anotado.
* ``result``: dict JSON-serializable con las claves de primer nivel
  ``video``, ``summary``, ``counts_timeseries``, ``zones``, ``animals``, ``events``
  (campos exactos en ``REQUIRED_FIELDS``).

Para cambiar de motor basta con reemplazar ``_build_engine`` (o ``get_engine``);
nada más del backend importa el motor. No hay lógica de visión acá.
"""

from __future__ import annotations

import threading
from typing import Any, Dict, Protocol


class EngineError(RuntimeError):
    """El motor no está disponible o devolvió algo que incumple el contrato."""


class Engine(Protocol):
    def process_video(self, input_path: str, output_path: str) -> Dict[str, Any]: ...


# Campos que el backend lee del resultado. Si falta alguno, el procesamiento
# falla con un mensaje claro en lugar de guardar datos incompletos.
REQUIRED_FIELDS: Dict[str, Any] = {
    "video": ["width", "height", "fps", "total_frames", "duration_sec", "codec", "zone_polygons_px"],
    "summary": ["max_heads", "avg_heads", "unique_animals", "total_events", "critical_events"],
    "counts_timeseries": ["frame", "timestamp_sec", "count"],  # por elemento
    "zones": ["total_visits", "unique_animals", "total_dwell_sec", "avg_dwell_per_visit_sec",
              "per_animal_dwell_sec"],  # por zona
    "animals": ["track_id", "first_seen_sec", "last_seen_sec", "total_visible_sec", "distance_px",
                "avg_speed_px_s", "zones_visited", "trajectory"],  # por elemento
    "events": ["event_id", "event_type", "track_id", "severity", "start_timestamp_sec",
               "end_timestamp_sec", "duration_seconds", "metric_value", "zone", "start_frame",
               "end_frame", "description"],  # por elemento
}


def validate_result(result: Dict[str, Any]) -> None:
    """Verifica que ``result`` cumpla el contrato. Lanza ``EngineError`` si no."""
    if not isinstance(result, dict):
        raise EngineError("El motor no devolvió un dict.")
    for key, fields in REQUIRED_FIELDS.items():
        if key not in result:
            raise EngineError(f"Al resultado del motor le falta la clave '{key}'.")
        value = result[key]
        if key in ("video", "summary"):
            items = [value]
        elif key == "zones":
            items = list(value.values())
        else:
            items = list(value)
        for item in items:
            missing = [f for f in fields if f not in item]
            if missing:
                raise EngineError(f"En '{key}' faltan los campos {missing}.")


_engine: Engine | None = None
_engine_lock = threading.Lock()


def _build_engine() -> Engine:
    try:
        from agrotrack_cv import AgroTrackEngine  # import diferido: carga torch/ultralytics
    except ImportError as exc:  # pragma: no cover - depende del entorno
        raise EngineError(
            "No se pudo importar el motor 'agrotrack_cv' "
            f"({exc}). Instalá las dependencias: pip install -r requirements.txt"
        ) from exc
    return AgroTrackEngine()


def get_engine() -> Engine:
    """Instancia única del motor (el modelo se carga una sola vez)."""
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = _build_engine()
        return _engine


def run_engine(input_path: str, output_path: str) -> Dict[str, Any]:
    result = get_engine().process_video(input_path, output_path)
    validate_result(result)
    return result
