// Copia las ABIs compiladas a blockchain/abi/ para que el backend en Python las use.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'blockchain', 'abi');
fs.mkdirSync(OUT, { recursive: true });
for (const [file, name] of [['AgroCowCattle.sol', 'AgroCowCattle'], ['MilestoneEscrow.sol', 'MilestoneEscrow'], ['mocks/MockUSDC.sol', 'MockUSDC']]) {
  const art = require(path.join(__dirname, '..', 'artifacts', 'contracts', file, `${name}.json`));
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ contractName: name, abi: art.abi, bytecode: art.bytecode }, null, 1));
  console.log('abi →', path.relative(process.cwd(), path.join(OUT, `${name}.json`)));
}
