// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AgroCowCattle} from "./AgroCowCattle.sol";

/// @title MilestoneEscrow: pago en stablecoin (USDC) que se libera cuando la vaca cumple un hito.
/// @notice PROTOTIPO PARA TESTNET. Sin auditoría de seguridad: no usar con fondos reales.
/// @dev Un comprador o inversor deposita USDC atado a un token. El pago va a `payee` (por ejemplo, la
///      dirección de depósito de Belo del productor en Polygon o Arbitrum) solo si el token llegó a
///      `CommercialReady` (7 días sin alertas + visto bueno del veterinario). Si vence el plazo sin
///      cumplirse, el que depositó recupera los fondos. Belo acepta solo USDC NATIVO de cada red.
contract MilestoneEscrow is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    enum State { None, Funded, Released, Refunded }

    struct Agreement {
        address payer;
        address payee;
        uint256 tokenId;
        uint256 amount;
        uint64 deadline;
        State state;
    }

    IERC20 public immutable token;
    AgroCowCattle public immutable cattle;
    uint256 public nextAgreementId = 1;
    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(uint256 indexed id, address indexed payer, address indexed payee, uint256 tokenId, uint256 amount, uint64 deadline);
    event PaymentReleased(uint256 indexed id, address indexed payee, uint256 amount);
    event Refunded(uint256 indexed id, address indexed payer, uint256 amount);

    error InvalidPayee();
    error InvalidAmount();
    error InvalidDeadline();
    error NotFunded(uint256 id);
    error MilestoneNotReached(uint256 tokenId, AgroCowCattle.Status status);
    error DeadlineNotReached(uint64 deadline);
    error NotPayer();

    constructor(address admin, IERC20 token_, AgroCowCattle cattle_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        token = token_;
        cattle = cattle_;
    }

    function createAgreement(address payee, uint256 tokenId, uint256 amount, uint64 deadline)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 id)
    {
        if (payee == address(0)) revert InvalidPayee();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        cattle.statusOf(tokenId); // revierte si el token no existe

        // Se registra lo que realmente llegó (tolera tokens con comisión por transferencia).
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - before;

        id = nextAgreementId++;
        agreements[id] = Agreement({payer: msg.sender, payee: payee, tokenId: tokenId, amount: received, deadline: deadline, state: State.Funded});
        emit AgreementCreated(id, msg.sender, payee, tokenId, received, deadline);
    }

    /// @notice Cualquiera puede ejecutarlo: la condición se verifica en la cadena.
    function release(uint256 id) external nonReentrant whenNotPaused {
        Agreement storage a = agreements[id];
        if (a.state != State.Funded) revert NotFunded(id);
        AgroCowCattle.Status s = cattle.statusOf(a.tokenId);
        if (s != AgroCowCattle.Status.CommercialReady) revert MilestoneNotReached(a.tokenId, s);
        a.state = State.Released; // efectos antes de la interacción
        token.safeTransfer(a.payee, a.amount);
        emit PaymentReleased(id, a.payee, a.amount);
    }

    function refund(uint256 id) external nonReentrant {
        Agreement storage a = agreements[id];
        if (a.state != State.Funded) revert NotFunded(id);
        if (msg.sender != a.payer) revert NotPayer();
        if (block.timestamp <= a.deadline) revert DeadlineNotReached(a.deadline);
        a.state = State.Refunded;
        token.safeTransfer(a.payer, a.amount);
        emit Refunded(id, a.payer, a.amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
