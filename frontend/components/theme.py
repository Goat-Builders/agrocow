"""Estilo visual: claro, minimalista, verde oscuro."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

import streamlit as st

GREEN_900 = "#1B4332"
GREEN_700 = "#2D6A4F"
GREEN_500 = "#52B788"
GREEN_200 = "#B7E4C7"
INK = "#1C2B22"
MUTED = "#5F6F65"
WARNING = "#C98A1B"
CRITICAL = "#B42318"
GRID = "#E3E9E2"

ZONE_LABELS = {"feeding_zone": "Comedero", "hydration_zone": "Bebedero", "general_zone": "Resto del corral"}
EVENT_LABELS = {
    "isolated_animal": "Animal aislado",
    "prolonged_immobility": "Inmovilidad prolongada",
    "group_activity_shift": "Cambio de actividad grupal",
}
SEVERITY_LABELS = {"warning": "Advertencia", "critical": "Crítico"}
STATUS_LABELS = {
    "uploaded": "Cargado", "queued": "En cola", "processing": "Procesando",
    "completed": "Completado", "failed": "Falló",
}

_CSS = f"""
<style>
  .block-container {{ padding-top: 2rem; max-width: 1280px; }}
  h1, h2, h3 {{ color: {GREEN_900}; letter-spacing: -0.01em; }}
  [data-testid="stSidebar"] {{ border-right: 1px solid {GRID}; }}
  .at-brand {{ font-weight: 800; font-size: 1.35rem; color: {GREEN_900}; letter-spacing: .06em; }}
  .at-sub {{ color: {MUTED}; font-size: .85rem; margin-bottom: 1.2rem; }}
  .at-header {{ border-bottom: 2px solid {GREEN_900}; padding-bottom: .6rem; margin-bottom: 1.4rem; }}
  .at-header .t {{ font-size: 2rem; font-weight: 800; color: {GREEN_900}; letter-spacing: .05em; line-height: 1.1; }}
  .at-header .s {{ color: {MUTED}; font-size: 1rem; }}
  .at-card {{ background: #fff; border: 1px solid {GRID}; border-left: 4px solid {GREEN_900};
              border-radius: 6px; padding: 14px 16px; }}
  .at-card .l {{ color: {MUTED}; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; }}
  .at-card .v {{ color: {GREEN_900}; font-size: 1.9rem; font-weight: 700; line-height: 1.2; }}
  .at-card .h {{ color: {MUTED}; font-size: .75rem; }}
  .at-empty {{ background: #fff; border: 1px dashed #B9C7BC; border-radius: 6px; padding: 28px; text-align: center; }}
  .at-empty .t {{ color: {GREEN_900}; font-weight: 600; margin-bottom: 4px; }}
  .at-empty .d {{ color: {MUTED}; font-size: .9rem; }}
</style>
"""


def apply() -> None:
    st.markdown(_CSS, unsafe_allow_html=True)


def header(section: str) -> None:
    st.markdown(
        f'<div class="at-header"><div class="t">AGROTRACK AI</div>'
        f'<div class="s">Livestock Operations Intelligence &nbsp;·&nbsp; {section}</div></div>',
        unsafe_allow_html=True,
    )


def card(col, label: str, value, hint: str = "") -> None:
    col.markdown(
        f'<div class="at-card"><div class="l">{label}</div><div class="v">{value}</div>'
        f'<div class="h">{hint or "&nbsp;"}</div></div>',
        unsafe_allow_html=True,
    )


def empty_state(title: str, description: str) -> None:
    st.markdown(f'<div class="at-empty"><div class="t">{title}</div><div class="d">{description}</div></div>',
                unsafe_allow_html=True)


def fmt_dt(iso: Optional[str]) -> str:
    """ISO UTC -> hora local (AGROTRACK_TZ, por defecto Buenos Aires)."""
    if not iso:
        return "—"
    dt = datetime.fromisoformat(iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        from zoneinfo import ZoneInfo

        dt = dt.astimezone(ZoneInfo(os.getenv("AGROTRACK_TZ", "America/Argentina/Buenos_Aires")))
    except Exception:  # sin base de zonas horarias: se muestra en UTC
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%d/%m/%Y %H:%M")


def fmt_clock(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def fmt_bytes(n: int) -> str:
    return f"{n / 1_048_576:.1f} MB"
