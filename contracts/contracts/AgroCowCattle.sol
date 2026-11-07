// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AgroCowCattle: un NFT por vaca (o por lote) con su estado de conducta.
/// @notice PROTOTIPO PARA TESTNET. Sin auditoría de seguridad: no usar con fondos reales.
/// @dev AgroCow no diagnostica. `BehaviorOk7d` significa "7 días sin alertas de conducta", no "sana".
///      "Apto para comercialización" (`CommercialReady`) solo lo marca un veterinario (VET_ROLE).
contract AgroCowCattle is ERC721, AccessControl, Pausable {
    /// Backend de AgroCow: registra animales y firma las atestaciones que salen del video.
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    /// Veterinario: el único que puede aprobar la comercialización o levantar una alerta crítica.
    bytes32 public constant VET_ROLE = keccak256("VET_ROLE");

    uint64 public constant MIN_WINDOW = 7 days;

    enum Status { None, Registered, BehaviorOk7d, CommercialReady, CriticalAlert }

    struct Animal {
        string caravanaId;      // ID de la caravana (identificación del animal o del lote)
        uint64 registeredAt;    // fecha de registro (unix, segundos)
        Status status;
        uint64 lastAttestedEnd; // fin de la última ventana atestiguada
    }

    mapping(uint256 => Animal) private _animals;
    mapping(uint256 => string) private _uris;
    /// keccak256(caravanaId) => tokenId (0 si no está registrada)
    mapping(bytes32 => uint256) public tokenOfCaravana;
    uint256 public nextTokenId = 1;

    event AnimalRegistered(uint256 indexed tokenId, string caravanaId, address indexed owner, string metadataURI);
    event BehaviorAttested(uint256 indexed tokenId, uint64 periodStart, uint64 periodEnd, string reportURI);
    event CriticalEvent(uint256 indexed tokenId, string eventType, string evidenceURI);
    event CriticalCleared(uint256 indexed tokenId, address indexed vet, string noteURI);
    event CommercialApproval(uint256 indexed tokenId, address indexed vet, string noteURI);
    /// ERC-4906: avisa a los exploradores y marketplaces que cambió la metadata.
    event MetadataUpdate(uint256 _tokenId);

    error EmptyCaravana();
    error CaravanaAlreadyRegistered(string caravanaId);
    error UnknownToken(uint256 tokenId);
    error WindowTooShort(uint64 periodStart, uint64 periodEnd);
    error WindowInFuture(uint64 periodEnd);
    error InvalidStatus(Status current);

    constructor(address admin, address oracle) ERC721("AgroCow Cattle", "COW") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, oracle);
    }

    // ------------------------------------------------------------------ registro

    function registerAnimal(address owner, string calldata caravanaId, uint64 registeredAt, string calldata metadataURI)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (bytes(caravanaId).length == 0) revert EmptyCaravana();
        bytes32 key = keccak256(bytes(caravanaId));
        if (tokenOfCaravana[key] != 0) revert CaravanaAlreadyRegistered(caravanaId);
        tokenId = nextTokenId++;
        tokenOfCaravana[key] = tokenId;
        _animals[tokenId] = Animal({caravanaId: caravanaId, registeredAt: registeredAt, status: Status.Registered, lastAttestedEnd: 0});
        _uris[tokenId] = metadataURI;
        _safeMint(owner, tokenId);
        emit AnimalRegistered(tokenId, caravanaId, owner, metadataURI);
    }

    function setTokenURI(uint256 tokenId, string calldata metadataURI) external onlyRole(ORACLE_ROLE) {
        _get(tokenId);
        _uris[tokenId] = metadataURI;
        emit MetadataUpdate(tokenId);
    }

    // ------------------------------------------------------- eventos de conducta

    /// @notice El backend certifica una ventana de al menos 7 días sin alertas de aislamiento ni críticas.
    function attestBehavior(uint256 tokenId, uint64 periodStart, uint64 periodEnd, string calldata reportURI)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        Animal storage a = _get(tokenId);
        if (periodEnd <= periodStart || periodEnd - periodStart < MIN_WINDOW) revert WindowTooShort(periodStart, periodEnd);
        if (periodEnd > block.timestamp) revert WindowInFuture(periodEnd);
        if (a.status == Status.CriticalAlert) revert InvalidStatus(a.status);
        if (a.status == Status.Registered) a.status = Status.BehaviorOk7d;
        a.lastAttestedEnd = periodEnd;
        emit BehaviorAttested(tokenId, periodStart, periodEnd, reportURI);
        emit MetadataUpdate(tokenId);
    }

    /// @notice Anomalía crítica detectada: bloquea la aprobación y los pagos hasta que un veterinario la revise.
    function reportCritical(uint256 tokenId, string calldata eventType, string calldata evidenceURI)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        Animal storage a = _get(tokenId);
        a.status = Status.CriticalAlert;
        emit CriticalEvent(tokenId, eventType, evidenceURI);
        emit MetadataUpdate(tokenId);
    }

    function clearCritical(uint256 tokenId, string calldata noteURI) external onlyRole(VET_ROLE) {
        Animal storage a = _get(tokenId);
        if (a.status != Status.CriticalAlert) revert InvalidStatus(a.status);
        a.status = Status.Registered;
        emit CriticalCleared(tokenId, msg.sender, noteURI);
        emit MetadataUpdate(tokenId);
    }

    /// @notice Solo un veterinario, y solo después de una ventana atestiguada sin alertas.
    function approveCommercial(uint256 tokenId, string calldata noteURI) external onlyRole(VET_ROLE) whenNotPaused {
        Animal storage a = _get(tokenId);
        if (a.status != Status.BehaviorOk7d) revert InvalidStatus(a.status);
        a.status = Status.CommercialReady;
        emit CommercialApproval(tokenId, msg.sender, noteURI);
        emit MetadataUpdate(tokenId);
    }

    // ------------------------------------------------------------------ lectura

    function statusOf(uint256 tokenId) external view returns (Status) {
        return _get(tokenId).status;
    }

    function animal(uint256 tokenId) external view returns (Animal memory) {
        return _get(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _uris[tokenId];
    }

    // ------------------------------------------------------------------ admin

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
    }

    function _get(uint256 tokenId) private view returns (Animal storage a) {
        a = _animals[tokenId];
        if (a.status == Status.None) revert UnknownToken(tokenId);
    }
}
