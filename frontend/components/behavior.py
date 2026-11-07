from __future__ import annotations

import pandas as pd
import streamlit as st

from . import api, charts, theme


def render(video_id: int) -> None:
    events = api.events(video_id)["events"]
    if not events:
        theme.empty_state("Sin eventos detectados",
                          "El motor no registró aislamiento, inmovilidad prolongada ni cambios de actividad en este video.")
        return

    isolated = sorted({e["track_id"] for e in events if e["event_type"] == "isolated_animal"})
    critical = sum(e["severity"] == "critical" for e in events)
    c = st.columns(4)
    theme.card(c[0], "Eventos detectados", len(events))
    theme.card(c[1], "Críticos", critical)
    theme.card(c[2], "Animales aislados", len(isolated),
               "IDs: " + ", ".join(map(str, isolated)) if isolated else "Ninguno")
    theme.card(c[3], "Duración total", f"{sum(e['duration_seconds'] for e in events):.0f} s")
    st.write("")

    st.plotly_chart(charts.event_distribution(events), width="stretch")

    st.subheader("Eventos")
    sev = st.multiselect("Nivel de alerta", list(theme.SEVERITY_LABELS), default=list(theme.SEVERITY_LABELS),
                         format_func=theme.SEVERITY_LABELS.get)
    rows = [e for e in events if e["severity"] in sev]
    st.dataframe(pd.DataFrame([{
        "Fecha y hora": theme.fmt_dt(e["processed_at"]),
        "Instante en video": f"{theme.fmt_clock(e['start_timestamp_sec'])} – {theme.fmt_clock(e['end_timestamp_sec'])}",
        "Duración (s)": e["duration_seconds"],
        "Tipo": theme.EVENT_LABELS.get(e["event_type"], e["event_type"]),
        "Animal": e["track_id"] if e["track_id"] is not None else "Grupo",
        "Zona": theme.ZONE_LABELS.get(e["zone"], e["zone"] or "—"),
        "Nivel de alerta": theme.SEVERITY_LABELS[e["severity"]],
        "Descripción": e["description"],
    } for e in rows]), hide_index=True, width="stretch")
    st.caption("«Fecha y hora» es el momento en que se procesó el video (el motor no recibe la fecha de grabación). "
               "El nivel depende solo de la duración de la condición. Son alertas para revisión humana, "
               "no diagnósticos; los umbrales no están calibrados con datos reales.")
