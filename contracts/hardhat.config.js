require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

// Las claves NUNCA van en el repo: se leen de contracts/.env (ver .env.example).
const { DEPLOYER_PRIVATE_KEY, AMOY_RPC_URL, ARBITRUM_SEPOLIA_RPC_URL } = process.env;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun' } },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    // Solo redes de prueba. scripts/deploy.js rechaza cualquier otra.
    amoy: { url: AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology', chainId: 80002, accounts },
    arbitrumSepolia: { url: ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc', chainId: 421614, accounts },
  },
};
