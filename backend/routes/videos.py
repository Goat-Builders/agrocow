from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import schemas, settings
from ..services import processing, repository

router = APIRouter(prefix="/api/videos", tags=["videos"])

MP4_TYPES = {"video/mp4", "application/octet-stream", ""}


def _get_or_404(video_id: int) -> dict:
    video = repository.get_video(video_id)
    if video is None:
        raise HTTPException(404, f"No existe el video {video_id}.")
    return video


@router.post("/upload", response_model=schemas.VideoOut, status_code=201)
def upload_video(file: UploadFile = File(...)) -> dict:
    name = file.filename or "video.mp4"
    if not name.lower().endswith(".mp4") or (file.content_type or "") not in MP4_TYPES:
        raise HTTPException(415, "Solo se aceptan videos MP4.")
    settings.ensure_dirs()
    dest = settings.UPLOADS_DIR / f"{uuid.uuid4().hex}.mp4"
    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(file.file, out, length=1024 * 1024)  # streaming, sin cargar todo en memoria
        size = dest.stat().st_size
        if size == 0:
            raise HTTPException(400, "El archivo está vacío.")
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    video_id = repository.create_video(Path(name).name, str(dest), size)
    return repository.get_video(video_id)


@router.get("", response_model=List[schemas.VideoOut])
def list_videos() -> list:
    return repository.list_videos()


@router.post("/{video_id}/process", response_model=schemas.ProcessAccepted, status_code=202)
def process_video(video_id: int) -> dict:
    video = _get_or_404(video_id)
    if not Path(video["stored_path"]).is_file():
        raise HTTPException(410, "El archivo del video ya no existe en el servidor.")
    if not repository.try_enqueue(video_id):
        raise HTTPException(409, "El video ya está en cola o procesándose.")
    processing.submit(video_id)
    return {"video_id": video_id, "status": "queued"}


@router.get("/{video_id}/status", response_model=schemas.StatusOut)
def video_status(video_id: int) -> dict:
    v = _get_or_404(video_id)
    return {
        "video_id": v["id"],
        "filename": v["filename"],
        "status": v["status"],
        "error": v["error"],
        "created_at": v["created_at"],
        "started_at": v["started_at"],
        "finished_at": v["finished_at"],
        "has_output_video": bool(v["output_path"] and Path(v["output_path"]).is_file()),
        "codec": v["codec"],
    }


@router.get("/{video_id}/output")
def output_video(video_id: int) -> FileResponse:
    """MP4 anotado (admite Range, para que el navegador pueda reproducirlo)."""
    v = _get_or_404(video_id)
    if v["status"] != "completed" or not v["output_path"] or not Path(v["output_path"]).is_file():
        raise HTTPException(404, "Este video todavía no tiene una salida procesada.")
    return FileResponse(v["output_path"], media_type="video/mp4", filename=f"agrotrack_{video_id}.mp4")
