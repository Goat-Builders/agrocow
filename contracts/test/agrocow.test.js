const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time, loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const DAY = 24 * 60 * 60;
const Status = { None: 0n, Registered: 1n, BehaviorOk7d: 2n, CommercialReady: 3n, CriticalAlert: 4n };
const USDC = (n) => ethers.parseUnits(String(n), 6);

async function deploy() {
  const [admin, oracle, vet, producer, investor, stranger] = await ethers.getSigners();
  const cattle = await ethers.deployContract('AgroCowCattle', [admin.address, oracle.address]);
  await cattle.connect(admin).grantRole(await cattle.VET_ROLE(), vet.address);
  const usdc = await ethers.deployContract('MockUSDC');
  const escrow = await ethers.deployContract('MilestoneEscrow', [admin.address, await usdc.getAddress(), await cattle.getAddress()]);
  await usdc.mint(investor.address, USDC(1000));
  const now = await time.latest();
  await cattle.connect(oracle).registerAnimal(producer.address, 'AR-0421', now, 'https://example.test/metadata/AR-0421.json');
  return { cattle, usdc, escrow, admin, oracle, vet, producer, investor, stranger, tokenId: 1n };
}

describe('AgroCowCattle', () => {
  it('registra una vaca por caravana, con dueño, metadata y estado inicial', async () => {
    const { cattle, producer, tokenId } = await loadFixture(deploy);
    expect(await cattle.ownerOf(tokenId)).to.equal(producer.address);
    expect(await cattle.tokenURI(tokenId)).to.equal('https://example.test/metadata/AR-0421.json');
    expect(await cattle.statusOf(tokenId)).to.equal(Status.Registered);
    expect((await cattle.animal(tokenId)).caravanaId).to.equal('AR-0421');
    expect(await cattle.tokenOfCaravana(ethers.keccak256(ethers.toUtf8Bytes('AR-0421')))).to.equal(tokenId);
  });

  it('no permite registrar dos veces la misma caravana ni una vacía', async () => {
    const { cattle, oracle, producer } = await loadFixture(deploy);
    await expect(cattle.connect(oracle).registerAnimal(producer.address, 'AR-0421', 0, '')).to.be.revertedWithCustomError(cattle, 'CaravanaAlreadyRegistered');
    await expect(cattle.connect(oracle).registerAnimal(producer.address, '', 0, '')).to.be.revertedWithCustomError(cattle, 'EmptyCaravana');
  });

  it('solo el oráculo (backend) registra y atestigua; solo el veterinario aprueba', async () => {
    const { cattle, stranger, oracle, tokenId } = await loadFixture(deploy);
    await expect(cattle.connect(stranger).registerAnimal(stranger.address, 'X', 0, '')).to.be.revertedWithCustomError(cattle, 'AccessControlUnauthorizedAccount');
    const end = await time.latest();
    await expect(cattle.connect(stranger).attestBehavior(tokenId, end - 8 * DAY, end, '')).to.be.revertedWithCustomError(cattle, 'AccessControlUnauthorizedAccount');
    await expect(cattle.connect(oracle).approveCommercial(tokenId, '')).to.be.revertedWithCustomError(cattle, 'AccessControlUnauthorizedAccount');
  });

  it('la atestación exige una ventana de al menos 7 días y en el pasado', async () => {
    const { cattle, oracle, tokenId } = await loadFixture(deploy);
    const now = await time.latest();
    await expect(cattle.connect(oracle).attestBehavior(tokenId, now - 6 * DAY, now, '')).to.be.revertedWithCustomError(cattle, 'WindowTooShort');
    await expect(cattle.connect(oracle).attestBehavior(tokenId, now, now + 8 * DAY, '')).to.be.revertedWithCustomError(cattle, 'WindowInFuture');
    await expect(cattle.connect(oracle).attestBehavior(tokenId, now - 7 * DAY, now, 'ipfs://report'))
      .to.emit(cattle, 'BehaviorAttested').withArgs(tokenId, now - 7 * DAY, now, 'ipfs://report');
    expect(await cattle.statusOf(tokenId)).to.equal(Status.BehaviorOk7d);
  });

  it('una alerta crítica bloquea la aprobación hasta que el veterinario la levante', async () => {
    const { cattle, oracle, vet, tokenId } = await loadFixture(deploy);
    await expect(cattle.connect(oracle).reportCritical(tokenId, 'prolonged_immobility', 'ipfs://evidencia'))
      .to.emit(cattle, 'CriticalEvent').withArgs(tokenId, 'prolonged_immobility', 'ipfs://evidencia');
    expect(await cattle.statusOf(tokenId)).to.equal(Status.CriticalAlert);
    const now = await time.latest();
    await expect(cattle.connect(oracle).attestBehavior(tokenId, now - 8 * DAY, now, '')).to.be.revertedWithCustomError(cattle, 'InvalidStatus');
    await expect(cattle.connect(vet).approveCommercial(tokenId, '')).to.be.revertedWithCustomError(cattle, 'InvalidStatus');
    await cattle.connect(vet).clearCritical(tokenId, 'ipfs://nota');
    expect(await cattle.statusOf(tokenId)).to.equal(Status.Registered);
  });

  it('el veterinario aprueba la comercialización solo después de 7 días sin alertas', async () => {
    const { cattle, oracle, vet, tokenId } = await loadFixture(deploy);
    await expect(cattle.connect(vet).approveCommercial(tokenId, '')).to.be.revertedWithCustomError(cattle, 'InvalidStatus');
    const now = await time.latest();
    await cattle.connect(oracle).attestBehavior(tokenId, now - 7 * DAY, now, '');
    await expect(cattle.connect(vet).approveCommercial(tokenId, 'ipfs://vet')).to.emit(cattle, 'CommercialApproval');
    expect(await cattle.statusOf(tokenId)).to.equal(Status.CommercialReady);
  });

  it('pausa: el admin frena registros y atestaciones', async () => {
    const { cattle, admin, oracle, producer } = await loadFixture(deploy);
    await cattle.connect(admin).pause();
    await expect(cattle.connect(oracle).registerAnimal(producer.address, 'AR-9', 0, '')).to.be.revertedWithCustomError(cattle, 'EnforcedPause');
  });

  it('declara ERC-721 y ERC-4906 (aviso de metadata)', async () => {
    const { cattle } = await loadFixture(deploy);
    expect(await cattle.supportsInterface('0x80ac58cd')).to.equal(true);
    expect(await cattle.supportsInterface('0x49064906')).to.equal(true);
  });
});

describe('MilestoneEscrow', () => {
  async function funded() {
    const f = await loadFixture(deploy);
    const { usdc, escrow, investor, producer, tokenId } = f;
    await usdc.connect(investor).approve(await escrow.getAddress(), USDC(250));
    const deadline = (await time.latest()) + 30 * DAY;
    await expect(escrow.connect(investor).createAgreement(producer.address, tokenId, USDC(250), deadline))
      .to.emit(escrow, 'AgreementCreated');
    return { ...f, deadline, id: 1n };
  }

  it('retiene el USDC hasta que la vaca llega a "apta para comercialización"', async () => {
    const { escrow, usdc, id, tokenId } = await funded();
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(USDC(250));
    await expect(escrow.release(id)).to.be.revertedWithCustomError(escrow, 'MilestoneNotReached').withArgs(tokenId, Status.Registered);
  });

  it('libera el pago al productor cuando se cumple el hito (cualquiera puede ejecutarlo)', async () => {
    const { escrow, usdc, cattle, oracle, vet, producer, stranger, id, tokenId } = await funded();
    const now = await time.latest();
    await cattle.connect(oracle).attestBehavior(tokenId, now - 7 * DAY, now, '');
    await cattle.connect(vet).approveCommercial(tokenId, '');
    await expect(escrow.connect(stranger).release(id)).to.emit(escrow, 'PaymentReleased').withArgs(id, producer.address, USDC(250));
    expect(await usdc.balanceOf(producer.address)).to.equal(USDC(250));
    await expect(escrow.release(id)).to.be.revertedWithCustomError(escrow, 'NotFunded');
  });

  it('una alerta crítica impide el pago aunque antes hubiera estado aprobada', async () => {
    const { escrow, cattle, oracle, vet, id, tokenId } = await funded();
    const now = await time.latest();
    await cattle.connect(oracle).attestBehavior(tokenId, now - 7 * DAY, now, '');
    await cattle.connect(vet).approveCommercial(tokenId, '');
    await cattle.connect(oracle).reportCritical(tokenId, 'isolated_animal', '');
    await expect(escrow.release(id)).to.be.revertedWithCustomError(escrow, 'MilestoneNotReached');
  });

  it('si vence el plazo sin hito, solo el que depositó recupera los fondos', async () => {
    const { escrow, usdc, investor, stranger, deadline, id } = await funded();
    await expect(escrow.connect(investor).refund(id)).to.be.revertedWithCustomError(escrow, 'DeadlineNotReached');
    await time.increaseTo(deadline + 1);
    await expect(escrow.connect(stranger).refund(id)).to.be.revertedWithCustomError(escrow, 'NotPayer');
    await expect(escrow.connect(investor).refund(id)).to.emit(escrow, 'Refunded');
    expect(await usdc.balanceOf(investor.address)).to.equal(USDC(1000));
  });

  it('valida los datos del acuerdo', async () => {
    const { escrow, usdc, investor, producer, tokenId } = await loadFixture(deploy);
    await usdc.connect(investor).approve(await escrow.getAddress(), USDC(10));
    const later = (await time.latest()) + DAY;
    await expect(escrow.connect(investor).createAgreement(ethers.ZeroAddress, tokenId, USDC(1), later)).to.be.revertedWithCustomError(escrow, 'InvalidPayee');
    await expect(escrow.connect(investor).createAgreement(producer.address, tokenId, 0, later)).to.be.revertedWithCustomError(escrow, 'InvalidAmount');
    await expect(escrow.connect(investor).createAgreement(producer.address, tokenId, USDC(1), 1)).to.be.revertedWithCustomError(escrow, 'InvalidDeadline');
    await expect(escrow.connect(investor).createAgreement(producer.address, 99, USDC(1), later)).to.be.revertedWithCustomError(await ethers.getContractAt('AgroCowCattle', await escrow.cattle()), 'UnknownToken');
  });
});
