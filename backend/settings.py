"""Rutas y configuración del backend (todas relativas a la raíz del repo)."""

from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = Path(os.getenv("AGROTRACK_UPLOADS_DIR", ROOT_DIR / "uploads"))
OUTPUTS_DIR = Path(os.getenv("AGROTRACK_OUTPUTS_DIR", ROOT_DIR / "outputs"))
DB_PATH = Path(os.getenv("AGROTRACK_DB_PATH", ROOT_DIR / "data" / "agrotrack.db"))


def ensure_dirs() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
