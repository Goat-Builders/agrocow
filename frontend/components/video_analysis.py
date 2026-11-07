from __future__ import annotations

import pandas as pd
import streamlit as st

from . import api, charts, theme

RUNNING = {"queued", "processing"}


def render() -> None:
    _upload_box()
    videos = api.list_videos()
    if not videos:
        theme.empty_state("Todavía no hay videos", "Subí un MP4 para iniciar el análisis.")
        return

    st.subheader("Procesamiento")
    ids = [v["id"] for v in videos]
    default = st.session_state.get("va_video_id", ids[0])
    chosen = st.selectbox(
        "Video", ids, index=ids.index(default) if default in ids else 0,
        format_func=lambda i: next(f"#{v['id']} · {v['filename']} · {theme.STATUS_LABELS[v['status']]}"
                                   for v in videos if v["id"] == i))
    st.session_state["va_video_id"] = chosen
    _status_panel(chosen)


def _upload_box() -> None:
    st.subheader("Subir video")
    key = st.session_state.get("uploader_key", 0)
    f = st.file_uploader("Video MP4 de un corral con cámara fija", type=["mp4"], key=f"uploader_{key}")
    if f is not None and st.button("Subir video", type="primary"):
        try:
            with st.spinner("Subiendo…"):
                v = api.upload_video(f.name, f.getvalue())
        except api.ApiError as e:
            st.error(str(e))
            return
        st.session_state["va_video_id"] = v["id"]
        st.session_state["uploader_key"] = key + 1
        st.rerun()


def _status_panel(video_id: int) -> None:
    status = api.video_status(video_id)
    if status["status"] in RUNNING:
        _poll(video_id)  # fragmento que se refresca solo
        return
    _render_status(status)


@st.fragment(run_every="3s")
def _poll(video_id: int) -> None:
    status = api.video_status(video_id)
    if status["status"] not in RUNNING:
        st.rerun()  # terminó: redibujar la página completa
    _render_status(status)


def _render_status(status: dict) -> None:
    vid, s = status["video_id"], status["status"]
    c1, c2, c3 = st.columns(3)
    theme.card(c1, "Estado", theme.STATUS_LABELS[s])
    theme.card(c2, "Inicio", theme.fmt_dt(status["started_at"]))
    theme.card(c3, "Fin", theme.fmt_dt(status["finished_at"]))
    st.write("")

    if s in RUNNING:
        st.info("El motor está procesando el video. Esta vista se actualiza sola; podés seguir usando el resto del dashboard.")
    if s == "failed":
        st.error(f"El procesamiento falló: {status['error']}")

    if s not in RUNNING:
        label = {"uploaded": "Iniciar procesamiento", "failed": "Reintentar procesamiento",
                 "completed": "Reprocesar (reemplaza los resultados)"}[s]
        if st.button(label, type="primary" if s != "completed" else "secondary", key=f"proc_{vid}"):
            try:
                api.process_video(vid)
            except api.ApiError as e:
                st.error(str(e))
            else:
                st.rerun()
    if s == "completed":
        _results(status)


def _results(status: dict) -> None:
    vid = status["video_id"]
    st.subheader("Video procesado")
    if status["has_output_video"]:
        st.video(api.output_url(vid))
        if status["codec"] != "avc1":
            st.warning(f"El motor escribió el video con el codec «{status['codec']}», que muchos navegadores no "
                       "reproducen. Si no se ve, descargalo.")
        st.link_button("Descargar video anotado", api.output_url(vid))
    else:
        st.warning("El archivo de salida ya no está disponible en el servidor.")

    st.subheader("Resultados")
    data = api.counts(vid)["videos"][0]
    c = st.columns(4)
    theme.card(c[0], "Animales únicos", data["unique_animals"])
    theme.card(c[1], "Máx. simultáneos", data["max_heads"])
    theme.card(c[2], "Promedio por cuadro", data["avg_heads"])
    theme.card(c[3], "Duración", f"{data['duration_sec']:.1f} s", f"{data['width']}×{data['height']} · {data['fps']} fps")
    st.write("")
    if data["timeseries"]:
        st.plotly_chart(charts.counts_over_time(data["timeseries"]), width="stretch")
    ev = api.events(vid)["events"]
    st.markdown(f"**Eventos detectados:** {len(ev)}")
    if ev:
        st.dataframe(pd.DataFrame([{
            "Instante": theme.fmt_clock(e["start_timestamp_sec"]),
            "Tipo": theme.EVENT_LABELS.get(e["event_type"], e["event_type"]),
            "Animal": e["track_id"] if e["track_id"] is not None else "Grupo",
            "Nivel": theme.SEVERITY_LABELS[e["severity"]], "Descripción": e["description"],
        } for e in ev]), hide_index=True, width="stretch")
    st.caption("El detalle está en Livestock Tracking, Behavioral Intelligence y Zone Analytics.")
