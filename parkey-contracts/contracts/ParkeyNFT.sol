// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ParkeyNFT
 * @notice Tokenisation de places de parking en NFT (ERC-721).
 * @dev Les transferts externes (transferFrom / safeTransferFrom) sont bloques :
 *      les echanges passent obligatoirement par buyParkingSpot() qui gere
 *      paiement, frais de plateforme et transfert atomique.
 */
contract ParkeyNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // ----- Types -----

    struct ParkingSpot {
        string parkingAddress;
        string parkingType;   // "covered" | "outdoor" | "underground"
        string size;          // "standard" | "large" | "compact"
        uint256 price;        // en wei
        bool isAvailable;
        bool available247;
        address currentOwner;
        uint256 createdAt;
    }

    // ----- Storage -----

    uint256 private _nextTokenId;

    mapping(uint256 => ParkingSpot) private _parkingSpots;
    mapping(address => uint256[]) private _ownerTokens;
    mapping(uint256 => uint256) private _tokenIndexInOwner;

    /// @notice Frais de plateforme en points de base (200 = 2 %).
    uint256 public platformFeeBps = 200;
    uint256 public constant MAX_FEE_BPS = 1000; // 10 %

    address public feeCollector;

    // ----- Events -----

    event ParkingSpotCreated(
        uint256 indexed tokenId,
        address indexed owner,
        string parkingAddress,
        uint256 price
    );

    event ParkingSpotSold(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 fee
    );

    event ParkingSpotListed(uint256 indexed tokenId, uint256 price, bool isAvailable);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeCollectorUpdated(address newCollector);

    // ----- Errors -----

    error TransferDisabled();
    error NotOwner();
    error NotAvailable();
    error InvalidPrice();
    error TokenDoesNotExist();
    error InsufficientPayment();
    error CannotBuyOwn();
    error FeeTooHigh();
    error ZeroAddress();
    error PaymentFailed();

    constructor() ERC721("Parkey Parking NFT", "PARK") Ownable(msg.sender) {
        feeCollector = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Creation / listing
    // ---------------------------------------------------------------------

    function createParkingSpot(
        string calldata parkingAddress_,
        string calldata parkingType_,
        string calldata size_,
        uint256 price_,
        bool available247_,
        string calldata tokenURI_
    ) external returns (uint256 tokenId) {
        if (price_ == 0) revert InvalidPrice();

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _parkingSpots[tokenId] = ParkingSpot({
            parkingAddress: parkingAddress_,
            parkingType: parkingType_,
            size: size_,
            price: price_,
            isAvailable: true,
            available247: available247_,
            currentOwner: msg.sender,
            createdAt: block.timestamp
        });

        _addTokenToOwner(msg.sender, tokenId);

        emit ParkingSpotCreated(tokenId, msg.sender, parkingAddress_, price_);
    }

    function listParkingSpot(uint256 tokenId, uint256 newPrice) external {
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (newPrice == 0) revert InvalidPrice();

        ParkingSpot storage spot = _parkingSpots[tokenId];
        spot.price = newPrice;
        spot.isAvailable = true;

        emit ParkingSpotListed(tokenId, newPrice, true);
    }

    function unlistParkingSpot(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();

        ParkingSpot storage spot = _parkingSpots[tokenId];
        spot.isAvailable = false;

        emit ParkingSpotListed(tokenId, spot.price, false);
    }

    // ---------------------------------------------------------------------
    // Achat
    // ---------------------------------------------------------------------

    function buyParkingSpot(uint256 tokenId) external payable nonReentrant {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        ParkingSpot storage spot = _parkingSpots[tokenId];
        if (!spot.isAvailable) revert NotAvailable();

        address seller = ownerOf(tokenId);
        if (seller == msg.sender) revert CannotBuyOwn();
        if (msg.value < spot.price) revert InsufficientPayment();

        uint256 price = spot.price;
        uint256 fee = (price * platformFeeBps) / 10_000;
        uint256 sellerAmount = price - fee;
        uint256 refund = msg.value - price;

        // Etat avant appels externes (CEI pattern)
        spot.currentOwner = msg.sender;
        spot.isAvailable = false;

        _removeTokenFromOwner(seller, tokenId);
        _addTokenToOwner(msg.sender, tokenId);

        // Transfert interne du NFT (contourne les blocages sur transferFrom)
        _transfer(seller, msg.sender, tokenId);

        // Paiements
        if (fee > 0) {
            (bool okFee, ) = payable(feeCollector).call{value: fee}("");
            if (!okFee) revert PaymentFailed();
        }
        (bool okSeller, ) = payable(seller).call{value: sellerAmount}("");
        if (!okSeller) revert PaymentFailed();
        if (refund > 0) {
            (bool okRefund, ) = payable(msg.sender).call{value: refund}("");
            if (!okRefund) revert PaymentFailed();
        }

        emit ParkingSpotSold(tokenId, seller, msg.sender, price, fee);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getOwnerTokens(address owner_) external view returns (uint256[] memory) {
        return _ownerTokens[owner_];
    }

    function getParkingSpot(uint256 tokenId) external view returns (ParkingSpot memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return _parkingSpots[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        if (newCollector == address(0)) revert ZeroAddress();
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    // ---------------------------------------------------------------------
    // Transferts externes desactives : passer par buyParkingSpot
    // ---------------------------------------------------------------------

    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert TransferDisabled();
    }

    function safeTransferFrom(address, address, uint256, bytes memory)
        public
        pure
        override(ERC721, IERC721)
    {
        revert TransferDisabled();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _addTokenToOwner(address owner_, uint256 tokenId) private {
        _tokenIndexInOwner[tokenId] = _ownerTokens[owner_].length;
        _ownerTokens[owner_].push(tokenId);
    }

    function _removeTokenFromOwner(address owner_, uint256 tokenId) private {
        uint256[] storage tokens = _ownerTokens[owner_];
        uint256 index = _tokenIndexInOwner[tokenId];
        uint256 lastIndex = tokens.length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = tokens[lastIndex];
            tokens[index] = lastTokenId;
            _tokenIndexInOwner[lastTokenId] = index;
        }
        tokens.pop();
        delete _tokenIndexInOwner[tokenId];
    }

    // ---------------------------------------------------------------------
    // Overrides requis par OpenZeppelin v5
    // ---------------------------------------------------------------------

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
