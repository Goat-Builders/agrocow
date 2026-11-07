"""Puente entre los eventos de AgroCow y la blockchain (PROTOTIPO, solo testnet).

Módulos:
  config    variables de entorno y guardas (rechaza mainnet)
  metadata  metadata JSON del NFT de cada vaca o lote
  rules     reglas de negocio (7 días sin alertas, eventos críticos)
  store     tablas SQLite (token_id y dirección del contrato por vaca)
  chain     cliente de cadena: MockChain (sin red) y Web3Chain (testnet)
  payments  proveedores de pago: mock y BeloAdapter
  bridge    orquesta todo: video procesado -> observaciones -> transacciones

Ver docs/blockchain.md.
"""
