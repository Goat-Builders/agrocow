from __future__ import annotations

import pandas as pd
import streamlit as st

from . import api, theme


def render() -> None:
    s = api.summary()
    cols = st.columns(4)
    theme.card(cols[0], "Animales únicos trackeados", s["total_unique_tracks"],
               "Suma de IDs por video (los IDs se reinician en cada video)")
    theme.card(cols[1], "Máx. simultáneos", s["max_simultaneous"], "Mayor cantidad en un mismo cuadro")
    theme.card(cols[2], "Total de eventos", s["total_events"], f"{s['critical_events']} críticos")
    theme.card(cols[3], "Videos procesados", s["videos_processed"],
               f"{s['videos_total']} cargados · {s['videos_failed']} con error")
    st.write("")

    st.subheader("Historial de videos")
    videos = api.list_videos()
    if not videos:
        theme.empty_state("Todavía no hay videos", "Cargá un video en «Video Analysis» para comenzar.")
        return
    df = pd.DataFrame([{
        "ID": v["id"], "Archivo": v["filename"], "Estado": theme.STATUS_LABELS[v["status"]],
        "Cargado": theme.fmt_dt(v["created_at"]), "Procesado": theme.fmt_dt(v["finished_at"]),
        "Duración (s)": v["duration_sec"], "Animales únicos": v["unique_animals"],
        "Máx. simultáneos": v["max_heads"], "Eventos": v["total_events"],
    } for v in videos])
    st.dataframe(df, hide_index=True, width="stretch")
    if s["videos_processed"] == 0:
        st.info("Ningún video terminó de procesarse todavía: los indicadores se completan al finalizar el primero.")
