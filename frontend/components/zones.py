from __future__ import annotations

import pandas as pd
import streamlit as st

from . import api, charts, theme


def render(video_id: int) -> None:
    zones = api.zones(video_id)["videos"][0]["zones"]
    by = {z["zone"]: z for z in zones}
    if not zones or sum(z["total_visits"] for z in zones) == 0:
        theme.empty_state("Sin actividad en zonas", "No se registraron animales en ninguna zona para este video.")
        return

    feed, water = by.get("feeding_zone"), by.get("hydration_zone")
    c = st.columns(4)
    theme.card(c[0], "Visitas a comederos", feed["total_visits"] if feed else 0,
               f"{feed['unique_animals']} animales" if feed else "")
    theme.card(c[1], "Visitas a bebederos", water["total_visits"] if water else 0,
               f"{water['unique_animals']} animales" if water else "")
    theme.card(c[2], "Permanencia en comedero", f"{feed['total_dwell_sec']:.0f} s" if feed else "—",
               f"{feed['avg_dwell_per_visit_sec']:.1f} s por visita" if feed else "")
    theme.card(c[3], "Permanencia en bebedero", f"{water['total_dwell_sec']:.0f} s" if water else "—",
               f"{water['avg_dwell_per_visit_sec']:.1f} s por visita" if water else "")
    st.write("")

    left, right = st.columns(2)
    left.plotly_chart(charts.zone_activity(zones), width="stretch")
    right.plotly_chart(charts.dwell_per_animal(zones, theme.ZONE_LABELS), width="stretch")

    st.subheader("Actividad por región")
    st.dataframe(pd.DataFrame([{
        "Zona": theme.ZONE_LABELS.get(z["zone"], z["zone"]), "Visitas": z["total_visits"],
        "Animales": z["unique_animals"], "Permanencia total (s)": z["total_dwell_sec"],
        "Permanencia por visita (s)": z["avg_dwell_per_visit_sec"],
    } for z in zones]), hide_index=True, width="stretch")
    st.caption("Una «visita» es una entrada confirmada al polígono de la zona (0,5 s). La pertenencia se decide por "
               "el punto de apoyo del animal, no por la cabeza: no mide si el animal come o bebe.")
