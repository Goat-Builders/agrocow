"""Enganche opcional entre el procesamiento de videos y el módulo `blockchain`.

Apagado por defecto (AGROCOW_CHAIN_ENABLED=0). Si está prendido y algo falla en la cadena, se
registra en el log y el video igual queda procesado: la blockchain nunca rompe el pipeline.
"""

from __future__ import annotations

import logging
from typing import Optional

from blockchain import config as chain_config
from blockchain.bridge import ChainBridge
from blockchain.chain import make_chain
from blockchain.payments import make_payment_provider

from ..database import get_conn

log = logging.getLogger("agrotrack.chain")
_bridge: Optional[ChainBridge] = None


class ChainDisabled(RuntimeError):
    pass


def get_bridge() -> ChainBridge:
    global _bridge
    if _bridge is not None:
        return _bridge
    cfg = chain_config.from_env()
    if not cfg.enabled:
        raise ChainDisabled("Blockchain desactivada (AGROCOW_CHAIN_ENABLED=0).")
    _bridge = ChainBridge(get_conn, make_chain(cfg), make_payment_provider(cfg.payment_provider), cfg)
    return _bridge


def reset() -> None:
    """Para tests: vuelve a leer la configuración en el próximo uso."""
    global _bridge
    _bridge = None


def after_result(video_id: int, result: dict) -> None:
    try:
        if not chain_config.from_env().enabled:
            return
        actions = get_bridge().on_video_completed(video_id, result.get("animals", []), result.get("events", []))
        if actions:
            log.info("Video %s → blockchain: %s", video_id, actions)
    except Exception:  # nunca romper el procesamiento por la cadena
        log.exception("Falló el puente blockchain para el video %s", video_id)
