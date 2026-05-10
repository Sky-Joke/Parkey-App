// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract ParkeyNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard { 
    
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

    

    uint256 private _nextTokenId; 

    mapping(uint256 => ParkingSpot) private _parkingSpots; 
    mapping(address => uint256[]) private _ownerTokens;
    mapping(uint256 => uint256) private _tokenIndexInOwner;

    
    uint256 public platformFeeBps = 200; // 2 %
    uint256 public constant MAX_FEE_BPS = 1000; // 10 %

    address public feeCollector; // addresse reçevant les frais de plateforme

    
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

    

    function createParkingSpot(
        string calldata parkingAddress_, // Addresse de la place de parking
        string calldata parkingType_, // Type de parking 
        string calldata size_, // Taille de la place de parking
        uint256 price_, // Prix de la place de parking en la place de parking
        bool available247_, // Indique si la place de parking est disponible 24/7
        string calldata tokenURI_ // URI des métadonnées de la place
    ) external returns (uint256 tokenId) {
        if (price_ == 0) revert InvalidPrice(); // le prix doit être supérieur à 0

        tokenId = _nextTokenId++; // génère un nouvel ID de token
        _safeMint(msg.sender, tokenId); // mint le token
        _setTokenURI(tokenId, tokenURI_); // stocke l'URI

        _parkingSpots[tokenId] = ParkingSpot({ // Enregistre les détails de la place
            parkingAddress: parkingAddress_, 
            parkingType: parkingType_,
            size: size_,
            price: price_,
            isAvailable: true,
            available247: available247_,
            currentOwner: msg.sender, // le propriétaire est le céateur
            createdAt: block.timestamp // enregistre le timestamp de création
        });

        _addTokenToOwner(msg.sender, tokenId); // ajoute le token dans ceux du propriétaire

        emit ParkingSpotCreated(tokenId, msg.sender, parkingAddress_, price_); // émet un événement de création
    }

    function listParkingSpot(uint256 tokenId, uint256 newPrice) external { 
        if (ownerOf(tokenId) != msg.sender) revert NotOwner(); // seul le propriétaire peux lister
        if (newPrice == 0) revert InvalidPrice(); 

        ParkingSpot storage spot = _parkingSpots[tokenId]; // recupère les details de la place
        spot.price = newPrice; // MAJ du prix
        spot.isAvailable = true; // place dispo

        emit ParkingSpotListed(tokenId, newPrice, true);
    }

    function unlistParkingSpot(uint256 tokenId) external { 
        if (ownerOf(tokenId) != msg.sender) revert NotOwner(); 

        ParkingSpot storage spot = _parkingSpots[tokenId]; 
        spot.isAvailable = false;

        emit ParkingSpotListed(tokenId, spot.price, false);
    }

    

    function buyParkingSpot(uint256 tokenId) external payable nonReentrant { 
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(); // vérifie que la place existe

        ParkingSpot storage spot = _parkingSpots[tokenId]; 
        if (!spot.isAvailable) revert NotAvailable(); 

        address seller = ownerOf(tokenId); // adresse du vendeur
        if (seller == msg.sender) revert CannotBuyOwn(); // on ne peut pas acheter sa propre place
        if (msg.value < spot.price) revert InsufficientPayment(); // vérifie que l'acheteur a envoyé assez d'ether

        uint256 price = spot.price; 
        uint256 fee = (price * platformFeeBps) / 10_000; // calcule les frais de plateforme
        uint256 sellerAmount = price - fee; // montant pour le vendeur
        uint256 refund = msg.value - price; // montant à rembourser si l'acheteur à trop envoyé

        
        spot.currentOwner = msg.sender; // MAJ du propriétaire
        spot.isAvailable = false; // la place n'est plus dispo

        _removeTokenFromOwner(seller, tokenId); // retire le token chez le vendeur
        _addTokenToOwner(msg.sender, tokenId); // ajoute le token chez l'acheteur

        
        _transfer(seller, msg.sender, tokenId); // transfert du token

        
        if (fee > 0) { // transfert des frais de plateforme
            (bool okFee, ) = payable(feeCollector).call{value: fee}(""); // transfert à l'adresse du feeCollector
            if (!okFee) revert PaymentFailed(); // vérification du transfert
        }
        (bool okSeller, ) = payable(seller).call{value: sellerAmount}(""); // transfert du montant au vendeur
        if (!okSeller) revert PaymentFailed(); 
        if (refund > 0) { // remboursement de l'excédent à l'acheteur
            (bool okRefund, ) = payable(msg.sender).call{value: refund}(""); // transfert du remboursement
            if (!okRefund) revert PaymentFailed();
        }

        emit ParkingSpotSold(tokenId, seller, msg.sender, price, fee); // émet un événement de vente
    }

    

    function getOwnerTokens(address owner_) external view returns (uint256[] memory) { // récupère les tokens d'un propriétaire
        return _ownerTokens[owner_]; 
    }

    function getParkingSpot(uint256 tokenId) external view returns (ParkingSpot memory) { // récupère les détails d'une place de parking
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(); 
        return _parkingSpots[tokenId]; 
    }

    function totalMinted() external view returns (uint256) { // retourne le nombre total de tokens mintés
        return _nextTokenId;
    }

    

    function setPlatformFee(uint256 newFeeBps) external onlyOwner { // MAJ des frais de plateforme par le propriétaire
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(); 
        platformFeeBps = newFeeBps; 
        emit PlatformFeeUpdated(newFeeBps); // évenement de MAJ des frais
    }

    function setFeeCollector(address newCollector) external onlyOwner { // MAJ de l'adresse recevant les frais
        if (newCollector == address(0)) revert ZeroAddress(); 
    
        feeCollector = newCollector; 
        emit FeeCollectorUpdated(newCollector); 
    }

    

    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) { // désactive les transferts standards
        revert TransferDisabled(); // transferts gérés par buyParkingSpot
    }

    function safeTransferFrom(address, address, uint256, bytes memory) 
        public
        pure
        override(ERC721, IERC721)
    {
        revert TransferDisabled();
    }

    

    function _addTokenToOwner(address owner_, uint256 tokenId) private { // ajoute un token à la liste d'un propriétaire
        _tokenIndexInOwner[tokenId] = _ownerTokens[owner_].length; // le tokenIndex y est stocké
        _ownerTokens[owner_].push(tokenId); // 
    }

    function _removeTokenFromOwner(address owner_, uint256 tokenId) private { // retire un token
        uint256[] storage tokens = _ownerTokens[owner_]; // récupère les tokens
        uint256 index = _tokenIndexInOwner[tokenId]; // index du token à retirer
        uint256 lastIndex = tokens.length - 1; // index du dernier token

        if (index != lastIndex) { 
            uint256 lastTokenId = tokens[lastIndex]; // ID du dernier token
            tokens[index] = lastTokenId; // remplace le token à retirer par le dernier token
            _tokenIndexInOwner[lastTokenId] = index; // MAJ de l'index
        }
        tokens.pop(); // retire le dernier élément
        delete _tokenIndexInOwner[tokenId]; // supprime l'index du token retiré
    }

    

    function tokenURI(uint256 tokenId) // retourne l'URI d'un token
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId); 
    }

    function supportsInterface(bytes4 interfaceId) // support des interfaces ERC721 et ERC721URIStorage
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
