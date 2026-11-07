"""Gráficos Plotly. Solo grafican datos recibidos de la API; nunca rellenan datos."""

from __future__ import annotations

from collections import Counter
from typing import Dict, List

import numpy as np
import plotly.graph_objects as go

from .theme import (CRITICAL, EVENT_LABELS, GREEN_200, GREEN_500, GREEN_700, GREEN_900, GRID, INK,
                    SEVERITY_LABELS, WARNING, ZONE_LABELS)

SERIES = [GREEN_900, "#C98A1B", "#3B7EA1", "#8E5A9B", "#B5543A", GREEN_500, "#6B7280", "#A3A948"]


def _base(fig: go.Figure, title: str, height: int = 360) -> go.Figure:
    fig.update_layout(
        title=dict(text=title, font=dict(size=15, color=GREEN_900)), height=height,
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="#fff", font=dict(color=INK),
        margin=dict(l=40, r=20, t=50, b=40), legend=dict(orientation="h", y=-0.2),
    )
    fig.update_xaxes(gridcolor=GRID, zeroline=False)
    fig.update_yaxes(gridcolor=GRID, zeroline=False)
    return fig


def counts_over_time(points: List[dict]) -> go.Figure:
    fig = go.Figure(go.Scatter(
        x=[p["timestamp_sec"] for p in points], y=[p["count"] for p in points],
        mode="lines", line=dict(color=GREEN_900, width=2, shape="hv"), fill="tozeroy",
        fillcolor="rgba(82,183,136,.18)", hovertemplate="t=%{x:.1f} s<br>%{y} animales<extra></extra>",
    ))
    fig.update_xaxes(title="Tiempo en el video (s)")
    fig.update_yaxes(title="Animales detectados", dtick=1, rangemode="tozero")
    return _base(fig, "Animales detectados a lo largo del tiempo")


def trajectories(animals: List[dict], width: int, height: int) -> go.Figure:
    fig = go.Figure()
    for i, a in enumerate(animals):
        t = np.asarray(a["trajectory"], dtype=float).reshape(-1, 2)
        if len(t) == 0:
            continue
        fig.add_trace(go.Scatter(x=t[:, 0], y=t[:, 1], mode="lines", name=f"ID {a['track_id']}",
                                 line=dict(color=SERIES[i % len(SERIES)], width=2)))
        fig.add_trace(go.Scatter(x=t[-1:, 0], y=t[-1:, 1], mode="markers", showlegend=False,
                                 marker=dict(color=SERIES[i % len(SERIES)], size=8),
                                 hovertemplate=f"ID {a['track_id']} (última posición)<extra></extra>"))
    fig.update_xaxes(range=[0, width], title="x (px)")
    fig.update_yaxes(range=[height, 0], title="y (px)", scaleanchor="x")
    return _base(fig, "Trayectorias (punto de apoyo suavizado)", height=460)


def movement_heatmap(animals: List[dict], width: int, height: int, bins_x: int = 48) -> go.Figure:
    pts = [np.asarray(a["trajectory"], dtype=float).reshape(-1, 2) for a in animals if a["trajectory"]]
    pts = np.vstack(pts)
    bins_y = max(4, round(bins_x * height / width))
    hist, xe, ye = np.histogram2d(pts[:, 0], pts[:, 1], bins=[bins_x, bins_y], range=[[0, width], [0, height]])
    z = hist.T.astype(float)
    z[z == 0] = np.nan  # sin datos = transparente, no cero inventado
    fig = go.Figure(go.Heatmap(
        z=z, x=(xe[:-1] + xe[1:]) / 2, y=(ye[:-1] + ye[1:]) / 2,
        colorscale=[[0, GREEN_200], [0.5, GREEN_500], [1, GREEN_900]], colorbar=dict(title="Muestras"),
        hovertemplate="x=%{x:.0f}, y=%{y:.0f}<br>%{z} muestras<extra></extra>",
    ))
    fig.update_xaxes(range=[0, width], title="x (px)")
    fig.update_yaxes(range=[height, 0], title="y (px)", scaleanchor="x")
    return _base(fig, "Heatmap de movimiento", height=460)


def movement_bars(animals: List[dict]) -> go.Figure:
    ids = [f"ID {a['track_id']}" for a in animals]
    fig = go.Figure(go.Bar(x=ids, y=[a["avg_speed_px_s"] for a in animals], marker_color=GREEN_700,
                           hovertemplate="%{x}<br>%{y:.1f} px/s<extra></extra>"))
    fig.update_yaxes(title="Velocidad media (px/s)")
    return _base(fig, "Velocidad media por animal", height=320)


def event_distribution(events: List[dict]) -> go.Figure:
    counts = Counter((e["event_type"], e["severity"]) for e in events)
    types = sorted({t for t, _ in counts})
    fig = go.Figure()
    for sev, color in (("warning", WARNING), ("critical", CRITICAL)):
        fig.add_trace(go.Bar(name=SEVERITY_LABELS[sev], x=[EVENT_LABELS.get(t, t) for t in types],
                             y=[counts.get((t, sev), 0) for t in types], marker_color=color))
    fig.update_layout(barmode="stack")
    fig.update_yaxes(title="Eventos", dtick=1)
    return _base(fig, "Distribución de eventos", height=340)


def zone_activity(zones: List[dict]) -> go.Figure:
    names = [ZONE_LABELS.get(z["zone"], z["zone"]) for z in zones]
    fig = go.Figure()
    fig.add_trace(go.Bar(name="Permanencia total (s)", x=names, y=[z["total_dwell_sec"] for z in zones],
                         marker_color=GREEN_900))
    fig.add_trace(go.Bar(name="Visitas", x=names, y=[z["total_visits"] for z in zones],
                         marker_color=GREEN_500, yaxis="y2"))
    fig.update_layout(barmode="group", yaxis=dict(title="Segundos"),
                      yaxis2=dict(title="Visitas", overlaying="y", side="right", showgrid=False))
    return _base(fig, "Actividad por zona", height=340)


def dwell_per_animal(zones: List[dict], zone_keys: Dict[str, str]) -> go.Figure:
    fig = go.Figure()
    ids = sorted({tid for z in zones for tid in z["per_animal_dwell_sec"]}, key=int)
    colors = {"feeding_zone": GREEN_900, "hydration_zone": "#3B7EA1", "general_zone": "#A8B5AB"}
    for z in zones:
        fig.add_trace(go.Bar(name=zone_keys.get(z["zone"], z["zone"]), x=[f"ID {i}" for i in ids],
                             y=[z["per_animal_dwell_sec"].get(i, 0) for i in ids],
                             marker_color=colors.get(z["zone"], GREEN_500)))
    fig.update_layout(barmode="stack")
    fig.update_yaxes(title="Segundos")
    return _base(fig, "Tiempo de permanencia por animal y zona", height=340)
