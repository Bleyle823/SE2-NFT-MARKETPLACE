// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// ============================================================================
// NFT COLLECTION CONTRACT
// ============================================================================

contract NFTCollection is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // Collection metadata
    string public collectionDescription;
    string public collectionImage;
    uint256 public maxSupply;
    uint256 public currentSupply;
    uint256 public mintPrice;
    bool public mintingActive;
    
    // Token tracking
    uint256 private _nextTokenId;
    
    // Events
    event CollectionCreated(
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice
    );
    
    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        string uri
    );
    
    event MintingToggled(bool active);
    event MintPriceUpdated(uint256 newPrice);

    constructor(
        address initialOwner,
        string memory name,
        string memory symbol,
        string memory description,
        string memory image,
        uint256 _maxSupply,
        uint256 _mintPrice
    )
        ERC721(name, symbol)
        Ownable(initialOwner)
    {
        collectionDescription = description;
        collectionImage = image;
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        mintingActive = true;
        _nextTokenId = 1; // Start token IDs from 1
        
        emit CollectionCreated(initialOwner, name, symbol, _maxSupply, _mintPrice);
    }

    // ============================================================================
    // MINTING FUNCTIONS
    // ============================================================================

    function mint(string memory uri) public payable nonReentrant returns (uint256) {
        require(mintingActive, "Minting is not active");
        require(currentSupply < maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _nextTokenId++;
        currentSupply++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TokenMinted(msg.sender, tokenId, uri);
        return tokenId;
    }

    function mintTo(address to, string memory uri) public payable nonReentrant returns (uint256) {
        require(mintingActive, "Minting is not active");
        require(currentSupply < maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _nextTokenId++;
        currentSupply++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TokenMinted(to, tokenId, uri);
        return tokenId;
    }

    function ownerMint(address to, string memory uri) public onlyOwner returns (uint256) {
        require(currentSupply < maxSupply, "Max supply reached");
        
        uint256 tokenId = _nextTokenId++;
        currentSupply++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TokenMinted(to, tokenId, uri);
        return tokenId;
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    function toggleMinting() public onlyOwner {
        mintingActive = !mintingActive;
        emit MintingToggled(mintingActive);
    }

    function setMintPrice(uint256 _mintPrice) public onlyOwner {
        mintPrice = _mintPrice;
        emit MintPriceUpdated(_mintPrice);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function totalSupply() public view returns (uint256) {
        return currentSupply;
    }

    function remainingSupply() public view returns (uint256) {
        return maxSupply - currentSupply;
    }

    function getCollectionInfo() public view returns (
        string memory name,
        string memory symbol,
        string memory description,
        string memory image,
        uint256 _maxSupply,
        uint256 _currentSupply,
        uint256 _mintPrice,
        bool _mintingActive
    ) {
        return (
            name(),
            symbol(),
            collectionDescription,
            collectionImage,
            maxSupply,
            currentSupply,
            mintPrice,
            mintingActive
        );
    }

    // ============================================================================
    // OVERRIDES
    // ============================================================================

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
