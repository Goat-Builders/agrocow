"""Metadata JSON del NFT (formato ERC-721 Metadata, con atributos estilo OpenSea)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

DISCLAIMER = ("AgroCow no diagnostica. Los estados se basan en alertas de conducta detectadas en video. "
              "'Apto para comercialización' solo lo marca un veterinario.")

STATUS_LABELS = {
    "registered": "Registrada",
    "behavior_ok_7d": "Sin alertas de conducta · 7 días",
    "commercial_ready": "Apta para comercialización (veterinario)",
    "critical_alert": "Alerta crítica: revisión veterinaria",
}


def build_metadata(caravana_id: str, registered_at: str, history_url: str, status: str = "registered",
                   image_url: Optional[str] = None) -> dict:
    """Metadata del token: ID de caravana, fecha de registro y enlace al historial (base de datos o IPFS)."""
    ts = int(datetime.fromisoformat(registered_at).replace(tzinfo=timezone.utc).timestamp()) \
        if "+" not in registered_at and not registered_at.endswith("Z") else int(datetime.fromisoformat(registered_at.replace("Z", "+00:00")).timestamp())
    meta = {
        "name": f"AgroCow · Caravana {caravana_id}",
        "description": f"Registro de conducta del animal con caravana {caravana_id}. {DISCLAIMER}",
        "external_url": history_url,
        "attributes": [
            {"trait_type": "ID de caravana", "value": caravana_id},
            {"trait_type": "Fecha de registro", "display_type": "date", "value": ts},
            {"trait_type": "Estado", "value": STATUS_LABELS.get(status, status)},
        ],
        "agrocow": {
            "caravana_id": caravana_id,
            "registered_at": registered_at,
            "history_url": history_url,   # historial médico y de conducta (API de AgroCow o un CID de IPFS)
            "status": status,
            "disclaimer": DISCLAIMER,
        },
    }
    if image_url:
        meta["image"] = image_url
    return meta
