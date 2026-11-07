"""API del módulo blockchain (PROTOTIPO, solo testnet). Todo responde 503 si está desactivado."""

from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from blockchain import config as chain_config
from blockchain import store
from blockchain.chain import ChainError

from ..database import get_conn
from ..services import repository
from ..services.chain_hooks import ChainDisabled, get_bridge

router = APIRouter(prefix="/api/chain", tags=["blockchain"])
WALLET = r"^0x[0-9a-fA-F]{40}$"


class RegisterIn(BaseModel):
    caravana_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")
    owner_wallet: str = Field(pattern=WALLET)
    registered_at: Optional[str] = None


class AssignIn(BaseModel):
    video_id: int
    observed_on: date
    tracks: Dict[int, str] = Field(description="track_id del video → caravana")


class SettleIn(BaseModel):
    caravana_id: str
    agreement_id: int
    payee_wallet: str = Field(pattern=WALLET, description="Dirección de depósito (por ejemplo, la de Belo del productor)")
    amount: Optional[str] = None


def _bridge():
    try:
        return get_bridge()
    except ChainDisabled as exc:
        raise HTTPException(503, str(exc)) from exc
    except chain_config.ConfigError as exc:
        raise HTTPException(500, f"Configuración de blockchain inválida: {exc}") from exc


@router.get("/status")
def status() -> dict:
    try:
        cfg = chain_config.from_env()
    except chain_config.ConfigError as exc:
        raise HTTPException(500, str(exc)) from exc
    return cfg.public()


@router.post("/cattle", status_code=201)
def register(body: RegisterIn) -> dict:
    try:
        return _bridge().register(body.caravana_id, body.owner_wallet, body.registered_at)
    except ChainError as exc:
        raise HTTPException(409, str(exc)) from exc


@router.get("/cattle")
def list_cattle() -> List[dict]:
    _bridge()
    with get_conn() as c:
        return store.list_cattle(c)


@router.get("/cattle/{caravana_id}")
def get_cattle(caravana_id: str) -> dict:
    _bridge()
    with get_conn() as c:
        row = store.get_cattle(c, caravana_id)
    if not row:
        raise HTTPException(404, f"No existe la caravana {caravana_id}.")
    return row


@router.get("/metadata/{caravana_id}")
def metadata(caravana_id: str) -> dict:
    """Destino del tokenURI del NFT (formato ERC-721 Metadata)."""
    meta = _bridge().metadata(caravana_id)
    if meta is None:
        raise HTTPException(404, f"No existe la caravana {caravana_id}.")
    return meta


@router.get("/metadata/{caravana_id}/history")
def history(caravana_id: str) -> dict:
    """Historial de conducta y de la cadena (el enlace 'history_url' de la metadata)."""
    h = _bridge().history(caravana_id)
    if h is None:
        raise HTTPException(404, f"No existe la caravana {caravana_id}.")
    return h


@router.post("/assignments")
def assign(body: AssignIn) -> dict:
    """Asigna caravanas a los track_id de un video y evalúa las reglas con su resultado guardado."""
    b = _bridge()
    video = repository.get_video(body.video_id)
    if video is None:
        raise HTTPException(404, f"No existe el video {body.video_id}.")
    if video["status"] != "completed":
        raise HTTPException(409, "El video todavía no está procesado.")
    try:
        b.assign(body.video_id, body.observed_on, body.tracks)
    except ChainError as exc:
        raise HTTPException(400, str(exc)) from exc
    animals = repository.animals_for(body.video_id)
    events = repository.events_list(body.video_id, None, None)
    return {"video_id": body.video_id, "actions": b.on_video_completed(body.video_id, animals, events)}


@router.post("/settle")
def settle(body: SettleIn) -> dict:
    """Libera el pago del escrow (si el hito se cumplió en la cadena) y avisa al proveedor de pagos."""
    try:
        return _bridge().settle(body.caravana_id, body.agreement_id, body.payee_wallet, body.amount)
    except ChainError as exc:
        raise HTTPException(409, str(exc)) from exc


@router.get("/log")
def chain_log(caravana_id: Optional[str] = None) -> List[dict]:
    _bridge()
    with get_conn() as c:
        return store.log_for(c, caravana_id)
