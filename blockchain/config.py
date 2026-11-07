"""Configuración por variables de entorno. Sin valores secretos por defecto."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

# Solo redes de prueba. Cualquier otra se rechaza: este prototipo no maneja fondos reales.
TESTNET_CHAIN_IDS = {31337: "local (Hardhat)", 80002: "Polygon Amoy", 421614: "Arbitrum Sepolia"}
MAINNET_CHAIN_IDS = {1: "Ethereum", 137: "Polygon PoS", 42161: "Arbitrum One"}


class ConfigError(ValueError):
    """Configuración inválida o insegura."""


@dataclass(frozen=True)
class ChainConfig:
    enabled: bool = False
    mode: str = "mock"                       # mock | web3
    rpc_url: str = ""
    chain_id: int = 31337
    cattle_address: str = ""
    escrow_address: str = ""
    oracle_private_key: str = field(default="", repr=False)   # nunca se imprime
    metadata_base_url: str = "http://localhost:8000/api/chain/metadata"
    payment_provider: str = "mock"           # mock | belo
    min_observed_sec_per_day: float = 600.0  # a calibrar con datos de campo

    @property
    def network_name(self) -> str:
        return TESTNET_CHAIN_IDS.get(self.chain_id, f"chain {self.chain_id}")

    def validate(self) -> "ChainConfig":
        if self.mode not in ("mock", "web3"):
            raise ConfigError(f"AGROCOW_CHAIN_MODE inválido: {self.mode!r} (mock | web3).")
        if self.payment_provider not in ("mock", "belo"):
            raise ConfigError(f"AGROCOW_PAYMENT_PROVIDER inválido: {self.payment_provider!r} (mock | belo).")
        if self.chain_id in MAINNET_CHAIN_IDS:
            raise ConfigError(f"{MAINNET_CHAIN_IDS[self.chain_id]} es una red con fondos reales: el prototipo solo corre en testnet.")
        if self.mode == "web3":
            if self.chain_id not in TESTNET_CHAIN_IDS:
                raise ConfigError(f"Red {self.chain_id} no permitida. Testnets: {sorted(TESTNET_CHAIN_IDS)}.")
            missing = [n for n, v in (("AGROCOW_RPC_URL", self.rpc_url), ("AGROCOW_CATTLE_ADDRESS", self.cattle_address),
                                      ("AGROCOW_ORACLE_PRIVATE_KEY", self.oracle_private_key)) if not v]
            if missing:
                raise ConfigError(f"Modo web3 sin {', '.join(missing)}.")
        return self

    def public(self) -> dict:
        """Lo que se puede mostrar por la API (sin secretos)."""
        return {"enabled": self.enabled, "mode": self.mode, "chain_id": self.chain_id, "network": self.network_name,
                "cattle_address": self.cattle_address or None, "escrow_address": self.escrow_address or None,
                "payment_provider": self.payment_provider, "metadata_base_url": self.metadata_base_url}


def from_env(env: dict | None = None) -> ChainConfig:
    e = os.environ if env is None else env
    return ChainConfig(
        enabled=e.get("AGROCOW_CHAIN_ENABLED", "0").lower() in ("1", "true", "yes"),
        mode=e.get("AGROCOW_CHAIN_MODE", "mock"),
        rpc_url=e.get("AGROCOW_RPC_URL", ""),
        chain_id=int(e.get("AGROCOW_CHAIN_ID", "31337")),
        cattle_address=e.get("AGROCOW_CATTLE_ADDRESS", ""),
        escrow_address=e.get("AGROCOW_ESCROW_ADDRESS", ""),
        oracle_private_key=e.get("AGROCOW_ORACLE_PRIVATE_KEY", ""),
        metadata_base_url=e.get("AGROCOW_METADATA_BASE_URL", "http://localhost:8000/api/chain/metadata").rstrip("/"),
        payment_provider=e.get("AGROCOW_PAYMENT_PROVIDER", "mock"),
        min_observed_sec_per_day=float(e.get("AGROCOW_MIN_OBSERVED_SEC_PER_DAY", "600")),
    ).validate()
