"""Procesamiento en segundo plano.

Un único hilo trabajador consume una cola en memoria: el motor procesa un video
a la vez (así lo exige su lock interno) y la API nunca se bloquea. Sin Celery ni Redis.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

from .. import settings
from . import engine_adapter, repository

log = logging.getLogger("agrotrack.processing")
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="agrotrack-worker")


def submit(video_id: int) -> None:
    _executor.submit(_run, video_id)


def _run(video_id: int) -> None:
    video = repository.get_video(video_id)
    if video is None:
        return
    output_path = str(settings.OUTPUTS_DIR / f"video_{video_id}.mp4")
    try:
        repository.mark_processing(video_id)
        result = engine_adapter.run_engine(video["stored_path"], output_path)
        repository.save_result(video_id, output_path, result)
        log.info("Video %s procesado", video_id)
    except Exception as exc:  # el estado 'failed' guarda el motivo para mostrarlo
        log.exception("Falló el procesamiento del video %s", video_id)
        repository.mark_failed(video_id, f"{type(exc).__name__}: {exc}")
