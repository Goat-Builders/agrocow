"""Cliente de cadena. `MockChain` (sin red, para desarrollo y tests) y `Web3Chain` (testnet real).

Los dos aplican las mismas reglas que el contrato `AgroCowCattle`, así el mock no deja pasar
cosas que la cadena rechazaría.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Protocol

from .config import TESTNET_CHAIN_IDS, ChainConfig, ConfigError

ABI_DIR = Path(__file__).resolve().parent / "abi"
STATUS = {0: "none", 1: "registered", 2: "behavior_ok_7d", 3: "commercial_ready", 4: "critical_alert"}
MIN_WINDOW_SEC = 7 * 24 * 3600


class ChainError(RuntimeError):
    """La transacción falló o la cadena la rechazó."""


@dataclass(frozen=True)
class TxResult:
    tx_hash: str
    token_id: Optional[int] = None


class ChainClient(Protocol):
    chain_id: int
    contract_address: str

    def register_animal(self, owner: str, caravana_id: str, registered_at: int, metadata_uri: str) -> TxResult: ...
    def attest_behavior(self, token_id: int, period_start: int, period_end: int, report_uri: str) -> TxResult: ...
    def report_critical(self, token_id: int, event_type: str, evidence_uri: str) -> TxResult: ...
    def status_of(self, token_id: int) -> str: ...
    def release(self, agreement_id: int) -> TxResult: ...


# ---------------------------------------------------------------------------- mock
class MockChain:
    """Cadena en memoria: hashes deterministas, mismas reglas que el contrato."""

    chain_id = 31337
    contract_address = "0x000000000000000000000000000000000000c0e1"

    def __init__(self) -> None:
        self._n = 0
        self.tokens: Dict[int, dict] = {}
        self.by_caravana: Dict[str, int] = {}
        self.agreements: Dict[int, dict] = {}
        self.events: list = []

    def _tx(self, *parts) -> str:
        self._n += 1
        return "0x" + hashlib.sha256("|".join(map(str, (self._n, *parts))).encode()).hexdigest()

    def _get(self, token_id: int) -> dict:
        if token_id not in self.tokens:
            raise ChainError(f"UnknownToken({token_id})")
        return self.tokens[token_id]

    def register_animal(self, owner, caravana_id, registered_at, metadata_uri):
        if not caravana_id:
            raise ChainError("EmptyCaravana()")
        if caravana_id in self.by_caravana:
            raise ChainError(f"CaravanaAlreadyRegistered({caravana_id})")
        token_id = len(self.tokens) + 1
        self.tokens[token_id] = {"owner": owner, "caravana": caravana_id, "registered_at": registered_at,
                                 "uri": metadata_uri, "status": 1, "last_end": 0}
        self.by_caravana[caravana_id] = token_id
        self.events.append(("AnimalRegistered", token_id, caravana_id))
        return TxResult(self._tx("register", caravana_id), token_id)

    def attest_behavior(self, token_id, period_start, period_end, report_uri):
        a = self._get(token_id)
        if period_end <= period_start or period_end - period_start < MIN_WINDOW_SEC:
            raise ChainError("WindowTooShort")
        if a["status"] == 4:
            raise ChainError("InvalidStatus(CriticalAlert)")
        if a["status"] == 1:
            a["status"] = 2
        a["last_end"] = period_end
        self.events.append(("BehaviorAttested", token_id, period_start, period_end))
        return TxResult(self._tx("attest", token_id, period_end))

    def report_critical(self, token_id, event_type, evidence_uri):
        a = self._get(token_id)
        a["status"] = 4
        self.events.append(("CriticalEvent", token_id, event_type))
        return TxResult(self._tx("critical", token_id, event_type))

    # lo hace el veterinario desde su wallet, no el backend: está acá solo para simular el flujo completo
    def vet_approve(self, token_id):
        a = self._get(token_id)
        if a["status"] != 2:
            raise ChainError(f"InvalidStatus({STATUS[a['status']]})")
        a["status"] = 3
        return TxResult(self._tx("approve", token_id))

    def status_of(self, token_id):
        return STATUS[self._get(token_id)["status"]]

    def create_agreement(self, payer, payee, token_id, amount):
        self._get(token_id)
        aid = len(self.agreements) + 1
        self.agreements[aid] = {"payer": payer, "payee": payee, "token": token_id, "amount": amount, "state": "funded"}
        return aid

    def release(self, agreement_id):
        ag = self.agreements.get(agreement_id)
        if not ag or ag["state"] != "funded":
            raise ChainError(f"NotFunded({agreement_id})")
        if self.tokens[ag["token"]]["status"] != 3:
            raise ChainError(f"MilestoneNotReached({ag['token']}, {self.status_of(ag['token'])})")
        ag["state"] = "released"
        return TxResult(self._tx("release", agreement_id))


# ---------------------------------------------------------------------------- web3
def _abi(name: str) -> list:
    return json.loads((ABI_DIR / f"{name}.json").read_text(encoding="utf-8"))["abi"]


class Web3Chain:
    """Firma con la clave del oráculo (variable de entorno) y espera el recibo de cada transacción."""

    def __init__(self, cfg: ChainConfig, timeout: int = 120) -> None:
        try:
            from web3 import Web3  # import diferido: web3 es opcional
        except ImportError as exc:  # pragma: no cover - depende del entorno
            raise ConfigError("Modo web3 sin la librería: pip install -r blockchain/requirements.txt") from exc
        if cfg.chain_id not in TESTNET_CHAIN_IDS:
            raise ConfigError("Solo testnet.")
        self._w3 = Web3(Web3.HTTPProvider(cfg.rpc_url, request_kwargs={"timeout": 30}))
        actual = self._w3.eth.chain_id
        if actual != cfg.chain_id:
            raise ConfigError(f"El RPC es de la red {actual}, no de {cfg.chain_id}.")
        self.chain_id = actual
        self._acct = self._w3.eth.account.from_key(cfg.oracle_private_key)
        self.contract_address = Web3.to_checksum_address(cfg.cattle_address)
        self._cattle = self._w3.eth.contract(address=self.contract_address, abi=_abi("AgroCowCattle"))
        self._escrow = (self._w3.eth.contract(address=Web3.to_checksum_address(cfg.escrow_address), abi=_abi("MilestoneEscrow"))
                        if cfg.escrow_address else None)
        self._timeout = timeout

    @property
    def oracle_address(self) -> str:
        return self._acct.address

    def _send(self, fn):
        try:
            tx = fn.build_transaction({
                "from": self._acct.address,
                "nonce": self._w3.eth.get_transaction_count(self._acct.address, "pending"),
                "chainId": self.chain_id,
            })
            signed = self._acct.sign_transaction(tx)
            raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
            tx_hash = self._w3.eth.send_raw_transaction(raw)
            receipt = self._w3.eth.wait_for_transaction_receipt(tx_hash, timeout=self._timeout)
        except Exception as exc:  # el revert llega como excepción de web3 con el nombre del error
            raise ChainError(f"{type(exc).__name__}: {exc}") from exc
        if receipt["status"] != 1:
            raise ChainError(f"La transacción {tx_hash.hex()} revirtió.")
        return receipt

    @staticmethod
    def _hex(receipt) -> str:
        h = receipt["transactionHash"].hex()
        return h if h.startswith("0x") else "0x" + h

    def register_animal(self, owner, caravana_id, registered_at, metadata_uri):
        from web3 import Web3
        r = self._send(self._cattle.functions.registerAnimal(Web3.to_checksum_address(owner), caravana_id, int(registered_at), metadata_uri))
        logs = self._cattle.events.AnimalRegistered().process_receipt(r)
        return TxResult(self._hex(r), int(logs[0]["args"]["tokenId"]) if logs else None)

    def attest_behavior(self, token_id, period_start, period_end, report_uri):
        return TxResult(self._hex(self._send(self._cattle.functions.attestBehavior(int(token_id), int(period_start), int(period_end), report_uri))))

    def report_critical(self, token_id, event_type, evidence_uri):
        return TxResult(self._hex(self._send(self._cattle.functions.reportCritical(int(token_id), event_type, evidence_uri))))

    def status_of(self, token_id):
        return STATUS[int(self._cattle.functions.statusOf(int(token_id)).call())]

    def release(self, agreement_id):
        if self._escrow is None:
            raise ConfigError("Falta AGROCOW_ESCROW_ADDRESS.")
        return TxResult(self._hex(self._send(self._escrow.functions.release(int(agreement_id)))))


def make_chain(cfg: ChainConfig) -> ChainClient:
    return Web3Chain(cfg) if cfg.mode == "web3" else MockChain()
