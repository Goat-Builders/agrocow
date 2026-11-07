from __future__ import annotations

import pandas as pd
import streamlit as st

from . import api, charts, theme


def render(video_id: int) -> None:
    video = api.tracking(video_id)["videos"][0]
    animals = video["animals"]
    counts = api.counts(video_id)["videos"][0]

    if not animals:
        theme.empty_state("El motor no detectó bovinos en este video",
                          "No hay trayectorias para mostrar. Probá con un video de corral con cámara fija.")
        return

    total_dist = sum(a["distance_px"] for a in animals)
    mean_speed = sum(a["avg_speed_px_s"] for a in animals) / len(animals)
    c = st.columns(4)
    theme.card(c[0], "Tracking IDs", len(animals))
    theme.card(c[1], "Distancia total", f"{total_dist:,.0f} px", "Sin calibrar a metros")
    theme.card(c[2], "Velocidad media", f"{mean_speed:.1f} px/s", "Promedio entre animales")
    theme.card(c[3], "Máx. simultáneos", counts["max_heads"])
    st.write("")

    st.plotly_chart(charts.counts_over_time(counts["timeseries"]), width="stretch")
    left, right = st.columns(2)
    w, h = video["width"], video["height"]
    left.plotly_chart(charts.trajectories(animals, w, h), width="stretch")
    if any(a["trajectory"] for a in animals):
        right.plotly_chart(charts.movement_heatmap(animals, w, h), width="stretch")

    st.subheader("Estadísticas de movimiento")
    st.plotly_chart(charts.movement_bars(animals), width="stretch")
    st.dataframe(pd.DataFrame([{
        "Tracking ID": a["track_id"],
        "Primera aparición": theme.fmt_clock(a["first_seen_sec"]),
        "Última aparición": theme.fmt_clock(a["last_seen_sec"]),
        "Tiempo visible (s)": a["total_visible_sec"],
        "Distancia (px)": a["distance_px"],
        "Velocidad media (px/s)": a["avg_speed_px_s"],
        "Zonas visitadas": ", ".join(theme.ZONE_LABELS.get(z, z) for z in a["zones_visited"]),
    } for a in animals]), hide_index=True, width="stretch")
    st.caption("Un mismo animal puede recibir más de un ID si el tracking se corta (p. ej. por oclusión). "
               "Distancias y velocidades en píxeles: dependen de la perspectiva de la cámara.")
