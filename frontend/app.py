"""AGROTRACK AI - Dashboard.  Arranque:  streamlit run frontend/app.py"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import streamlit as st  # noqa: E402

from components import api, behavior, overview, theme, tracking, video_analysis, zones  # noqa: E402

st.set_page_config(page_title="AGROTRACK AI", page_icon="🐄", layout="wide")
theme.apply()

SECTIONS = ["Overview", "Video Analysis", "Livestock Tracking", "Behavioral Intelligence", "Zone Analytics"]
NEEDS_VIDEO = {"Livestock Tracking": tracking, "Behavioral Intelligence": behavior, "Zone Analytics": zones}

with st.sidebar:
    st.markdown('<div class="at-brand">AGROTRACK AI</div><div class="at-sub">Livestock Operations Intelligence</div>',
                unsafe_allow_html=True)
    section = st.radio("Sección", SECTIONS, label_visibility="collapsed")

theme.header(section)

try:
    if section == "Overview":
        overview.render()
    elif section == "Video Analysis":
        video_analysis.render()
    else:
        done = [v for v in api.list_videos() if v["status"] == "completed"]
        if not done:
            theme.empty_state("Todavía no hay videos procesados",
                              "Procesá un video en «Video Analysis»; los resultados aparecen acá al terminar.")
        else:
            ids = [v["id"] for v in done]
            names = {v["id"]: f"#{v['id']} · {v['filename']}" for v in done}
            with st.sidebar:
                st.divider()
                vid = st.selectbox("Video analizado", ids, format_func=names.get)
            NEEDS_VIDEO[section].render(vid)
except api.ApiError as exc:
    st.error(str(exc))
