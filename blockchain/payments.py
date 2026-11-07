"""Proveedores de pago. El pago real ocurre ON-CHAIN (el escrow transfiere USDC); el proveedor
solo valida a dónde va y deja registrado el aviso.

BELO (verificado el 2026-11-07)
--------------------------------
* No encontramos una API pública ni documentación para desarrolladores de Belo. Por eso
  `BeloAdapter` NO llama a ningún endpoint de Belo (no se inventan endpoints privados).
* Según su centro de ayuda (help.belo.app), Belo acepta depósitos de USDC y USDT en Polygon y en
  Arbitrum, y solo USDC NATIVO de cada red (las versiones puenteadas como USDC.e no se acreditan).
* Entonces el camino viable hoy es: el contrato `MilestoneEscrow` paga USDC nativo a la dirección
  de depósito de Belo del productor (`payee`). Belo lo acredita como cualquier depósito y el
  productor lo gasta con la tarjeta o lo cambia a pesos desde la app.
* En testnet (Amoy, Arbitrum Sepolia) no hay Belo: el adaptador solo simula.

Qué falta para producción: acuerdo o API oficial de Belo (webhooks de acreditación), confirmar con
Belo que la dirección de depósito del productor es de la misma red y token, revisión legal/KYC,
y una auditoría de seguridad de los contratos antes de mover fondos reales.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import List, Optional, Protocol

ADDRESS = re.compile(r"^0x[0-9a-fA-F]{40}$")
# Redes donde Belo acepta USDC nativo según su centro de ayuda (mainnet). Las testnets solo simulan.
BELO_NETWORKS = {137: "Polygon PoS", 42161: "Arbitrum One"}


class PaymentError(RuntimeError):
    pass


@dataclass(frozen=True)
class PayoutNotice:
    caravana_id: str
    token_id: int
    agreement_id: int
    payee_wallet: str
    tx_hash: str
    chain_id: int
    token: str = "USDC"
    amount: Optional[str] = None  # en unidades del token, como texto (sin floats)


class PaymentProvider(Protocol):
    name: str

    def notify_payout(self, notice: PayoutNotice) -> dict: ...


@dataclass
class MockPaymentProvider:
    name: str = "mock"
    notices: List[dict] = field(default_factory=list)

    def notify_payout(self, notice: PayoutNotice) -> dict:
        if not ADDRESS.match(notice.payee_wallet):
            raise PaymentError(f"Dirección inválida: {notice.payee_wallet!r}")
        rec = {**asdict(notice), "status": "simulated", "provider": self.name}
        self.notices.append(rec)
        return rec


@dataclass
class BeloAdapter:
    """Sin API pública de Belo: valida y registra. `mode='live'` falla a propósito."""

    mode: str = "simulate"   # simulate | live
    name: str = "belo"
    notices: List[dict] = field(default_factory=list)

    def notify_payout(self, notice: PayoutNotice) -> dict:
        if self.mode == "live":
            raise NotImplementedError(
                "Belo no publica una API para terceros: no hay a quién notificar. El pago real es la "
                "transferencia on-chain de USDC nativo a la dirección de depósito de Belo del productor "
                "(Polygon o Arbitrum). Ver blockchain/payments.py y docs/blockchain.md.")
        if not ADDRESS.match(notice.payee_wallet):
            raise PaymentError(f"Dirección de depósito inválida: {notice.payee_wallet!r}")
        if notice.token.upper() not in ("USDC", "USDT"):
            raise PaymentError("Belo acredita USDC o USDT en estas redes.")
        network = BELO_NETWORKS.get(notice.chain_id)
        rec = {**asdict(notice), "provider": self.name,
               "status": "simulated" if network is None else "sent_on_chain",
               "note": ("Testnet: Belo no opera acá, el pago es simulado." if network is None else
                        f"Transferido on-chain en {network}. Belo lo acredita como depósito (solo USDC nativo).")}
        self.notices.append(rec)
        return rec


def make_payment_provider(name: str) -> PaymentProvider:
    return BeloAdapter() if name == "belo" else MockPaymentProvider()
