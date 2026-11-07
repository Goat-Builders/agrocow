"""El puente: eventos del video -> observaciones por vaca -> transacciones.

Flujo del MVP
  1. Se registra una vaca (caravana): se acuña su NFT con metadata (caravana, fecha, historial).
  2. Al procesar un video, una persona asigna qué caravana es cada track_id de ese día
     (el motor no reconoce a la misma vaca entre videos).
  3. Por cada vaca asignada: tiempo observado, alertas de aislamiento y eventos críticos del día.
  4. Evento crítico -> `reportCritical` en el contrato (bloquea aprobación y pagos).
     7 días seguidos sin alertas -> `attestBehavior` firmado por el backend.
  5. El veterinario aprueba la comercialización desde su wallet. Con eso, `release` del escrow
     paga el USDC al productor, y el proveedor de pago (Belo) registra el aviso.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, time, timezone
from typing import Any, Callable, Dict, Iterator, List, Optional

from . import store
from .chain import ChainClient, ChainError
from .config import ChainConfig
from .metadata import build_metadata
from .payments import PaymentProvider, PayoutNotice
from .rules import DailyObservation, evaluate

ConnFactory = Callable[[], Any]  # devuelve un context manager con una conexión sqlite3


def _ts(d: date, end: bool = False) -> int:
    t = time(23, 59, 59) if end else time(0, 0, 0)
    return int(datetime.combine(d, t, tzinfo=timezone.utc).timestamp())


class ChainBridge:
    def __init__(self, get_conn: ConnFactory, chain: ChainClient, payments: PaymentProvider, cfg: ChainConfig) -> None:
        self._get_conn = get_conn
        self.chain = chain
        self.payments = payments
        self.cfg = cfg
        with self._get_conn() as c:
            store.ensure_schema(c)

    # ---------------------------------------------------------------- registro
    def register(self, caravana_id: str, owner_wallet: str, registered_at: Optional[str] = None) -> Dict[str, Any]:
        caravana_id = caravana_id.strip()
        registered_at = registered_at or store.now_iso()
        history_url = f"{self.cfg.metadata_base_url}/{caravana_id}/history"
        metadata_uri = f"{self.cfg.metadata_base_url}/{caravana_id}"
        with self._get_conn() as c:
            if store.get_cattle(c, caravana_id) and store.get_cattle(c, caravana_id).get("token_id"):
                raise ChainError(f"La caravana {caravana_id} ya tiene token.")
            store.upsert_cattle(c, caravana_id, owner_wallet, registered_at)
        ts = int(datetime.fromisoformat(registered_at.replace("Z", "+00:00")).timestamp())
        try:
            tx = self.chain.register_animal(owner_wallet, caravana_id, ts, metadata_uri)
        except ChainError as exc:
            with self._get_conn() as c:
                store.log(c, "register", False, caravana_id, None, str(exc))
            raise
        with self._get_conn() as c:
            store.update_cattle(c, caravana_id, token_id=tx.token_id, contract_address=self.chain.contract_address,
                                chain_id=self.chain.chain_id, metadata_uri=metadata_uri, history_url=history_url,
                                last_tx_hash=tx.tx_hash)
            store.log(c, "register", True, caravana_id, tx.tx_hash, f"token {tx.token_id}")
            return store.get_cattle(c, caravana_id)

    def metadata(self, caravana_id: str) -> Optional[dict]:
        with self._get_conn() as c:
            row = store.get_cattle(c, caravana_id)
        if not row:
            return None
        return build_metadata(caravana_id, row["registered_at"], row["history_url"] or "", row["status"])

    def history(self, caravana_id: str) -> Optional[dict]:
        with self._get_conn() as c:
            row = store.get_cattle(c, caravana_id)
            if not row:
                return None
            return {"cattle": row, "observations": store.observations_for(c, caravana_id),
                    "chain_log": store.log_for(c, caravana_id)}

    # ----------------------------------------------------- video -> cadena
    def assign(self, video_id: int, observed_on: date, tracks: Dict[int, str]) -> None:
        with self._get_conn() as c:
            for track_id, caravana_id in tracks.items():
                if not store.get_cattle(c, caravana_id):
                    raise ChainError(f"La caravana {caravana_id} no está registrada.")
                store.assign(c, video_id, int(track_id), caravana_id, observed_on)

    def on_video_completed(self, video_id: int, animals: List[dict], events: List[dict]) -> List[dict]:
        """Toma el resultado del motor (o lo guardado en la base) y dispara lo que corresponda."""
        with self._get_conn() as c:
            assigned = store.assignments_for(c, video_id)
        if not assigned:
            return []
        visible = {int(a["track_id"]): float(a.get("total_visible_sec") or 0.0) for a in animals}
        actions: List[dict] = []
        by_caravana: Dict[str, dict] = {}
        for a in assigned:
            cid = a["caravana_id"]
            tid = int(a["track_id"])
            agg = by_caravana.setdefault(cid, {"day": a["observed_on"], "sec": 0.0, "iso": 0, "crit": [], "tracks": []})
            agg["sec"] += visible.get(tid, 0.0)
            agg["tracks"].append(tid)
            for e in events:
                if e.get("track_id") is None or int(e["track_id"]) != tid:
                    continue
                if e["event_type"] == "isolated_animal":
                    agg["iso"] += 1
                if e["severity"] == "critical":
                    agg["crit"].append(e)

        for cid, agg in by_caravana.items():
            with self._get_conn() as c:
                store.put_observation(c, cid, agg["day"], video_id, agg["sec"], agg["iso"], len(agg["crit"]))
                row = store.get_cattle(c, cid)
            token = row.get("token_id")
            if token is None:
                continue
            # 1) crítico: se informa una vez por video (el primero), con la evidencia en el historial
            if agg["crit"]:
                e = agg["crit"][0]
                actions.append(self._tx(cid, "report_critical", lambda: self.chain.report_critical(
                    token, e["event_type"], f"{row['history_url']}#video-{video_id}-evento-{e.get('event_id')}"),
                    status="critical_alert"))
                continue
            # 2) 7 días seguidos sin alertas: atestación firmada
            with self._get_conn() as c:
                obs = [DailyObservation(date.fromisoformat(o["observed_on"]), o["observed_sec"], o["isolated_events"], o["critical_events"])
                       for o in store.observations_for(c, cid)]
            until = date.fromisoformat(row["last_attested_end"]) if row.get("last_attested_end") else None
            if row["status"] == "critical_alert":
                actions.append({"caravana_id": cid, "action": "skip", "reason": "Alerta crítica abierta: la levanta un veterinario."})
                continue
            d = evaluate(obs, self.cfg.min_observed_sec_per_day, until)
            if d.window is None:
                actions.append({"caravana_id": cid, "action": "wait", "reason": d.reason, "clean_streak_days": d.clean_streak_days})
                continue
            start, end = d.window
            actions.append(self._tx(cid, "attest_behavior", lambda: self.chain.attest_behavior(
                token, _ts(start), _ts(end, end=True), f"{row['history_url']}#{start.isoformat()}_{end.isoformat()}"),
                status="behavior_ok_7d" if row["status"] == "registered" else row["status"], attested_until=end.isoformat()))
        return actions

    def _tx(self, caravana_id: str, action: str, call, status: Optional[str] = None, attested_until: Optional[str] = None) -> dict:
        try:
            tx = call()
        except ChainError as exc:
            with self._get_conn() as c:
                store.log(c, action, False, caravana_id, None, str(exc))
            return {"caravana_id": caravana_id, "action": action, "ok": False, "error": str(exc)}
        with self._get_conn() as c:
            fields: Dict[str, Any] = {"last_tx_hash": tx.tx_hash}
            if status:
                fields["status"] = status
            if attested_until:
                fields["last_attested_end"] = attested_until
            store.update_cattle(c, caravana_id, **fields)
            store.log(c, action, True, caravana_id, tx.tx_hash, attested_until or "")
        return {"caravana_id": caravana_id, "action": action, "ok": True, "tx_hash": tx.tx_hash}

    # ------------------------------------------------------------------ pago
    def settle(self, caravana_id: str, agreement_id: int, payee_wallet: str, amount: Optional[str] = None) -> dict:
        """Ejecuta `release` del escrow (la condición se verifica en la cadena) y avisa al proveedor."""
        with self._get_conn() as c:
            row = store.get_cattle(c, caravana_id)
        if not row or row.get("token_id") is None:
            raise ChainError(f"La caravana {caravana_id} no tiene token.")
        status = self.chain.status_of(row["token_id"])
        with self._get_conn() as c:
            store.update_cattle(c, caravana_id, status=status)
        res = self._tx(caravana_id, "release", lambda: self.chain.release(agreement_id))
        if not res["ok"]:
            return res
        res["payout"] = self.payments.notify_payout(PayoutNotice(caravana_id, row["token_id"], agreement_id, payee_wallet,
                                                                  res["tx_hash"], self.chain.chain_id, amount=amount))
        return res


@contextmanager
def sqlite_factory(path: str) -> Iterator[sqlite3.Connection]:
    """Conexión simple para usar el puente sin el backend (scripts, pruebas)."""
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
