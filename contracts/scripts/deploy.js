// Deploy de AgroCowCattle + MilestoneEscrow. SOLO redes de prueba.
//   npm run deploy:local            (red local de Hardhat: despliega también MockUSDC)
//   npm run deploy:amoy             (Polygon Amoy: USDC_ADDRESS obligatorio)
//   npm run deploy:arbitrumSepolia  (Arbitrum Sepolia: USDC_ADDRESS obligatorio)
const fs = require('fs');
const path = require('path');
const { ethers, network } = require('hardhat');

const TESTNETS = { 31337: 'local', 80002: 'Polygon Amoy', 421614: 'Arbitrum Sepolia' };

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  if (!TESTNETS[Number(chainId)]) {
    throw new Error(`Red ${chainId} no permitida: este prototipo solo se despliega en testnet (${Object.keys(TESTNETS).join(', ')}).`);
  }
  const [deployer] = await ethers.getSigners();
  const oracle = process.env.ORACLE_ADDRESS || deployer.address;
  const vet = process.env.VET_ADDRESS || deployer.address;

  let usdc = process.env.USDC_ADDRESS;
  if (!usdc) {
    if (Number(chainId) !== 31337) throw new Error('Falta USDC_ADDRESS (USDC de prueba de Circle en esta red; verificá la dirección en la documentación de Circle).');
    const mock = await ethers.deployContract('MockUSDC');
    await mock.waitForDeployment();
    usdc = await mock.getAddress();
  }

  const cattle = await ethers.deployContract('AgroCowCattle', [deployer.address, oracle]);
  await cattle.waitForDeployment();
  await (await cattle.grantRole(await cattle.VET_ROLE(), vet)).wait();
  const escrow = await ethers.deployContract('MilestoneEscrow', [deployer.address, usdc, await cattle.getAddress()]);
  await escrow.waitForDeployment();

  const out = {
    network: network.name, chainId: Number(chainId), deployedAt: new Date().toISOString(),
    cattle: await cattle.getAddress(), escrow: await escrow.getAddress(), usdc, oracle, vet, admin: deployer.address,
  };
  const dir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
