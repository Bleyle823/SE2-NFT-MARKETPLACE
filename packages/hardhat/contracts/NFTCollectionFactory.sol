// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {NFTCollection} from "./NFTCollection.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ============================================================================
// NFT COLLECTION FACTORY CONTRACT
// ============================================================================

contract NFTCollectionFactory is Ownable {
    // Array to store all deployed collections
    address[] public collections;
    
    // Mapping to track collections by creator
    mapping(address => address[]) public creatorCollections;
    
    // Events
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ============================================================================
    // COLLECTION CREATION
    // ============================================================================

    function createCollection(
        string memory name,
        string memory symbol,
        string memory description,
        string memory image,
        uint256 maxSupply,
        uint256 mintPrice
    ) public returns (address) {
        require(maxSupply > 0, "Max supply must be greater than 0");
        require(mintPrice >= 0, "Mint price cannot be negative");
        
        // Deploy new NFT collection
        NFTCollection newCollection = new NFTCollection(
            msg.sender, // Owner of the collection
            name,
            symbol,
            description,
            image,
            maxSupply,
            mintPrice
        );
        
        address collectionAddress = address(newCollection);
        
        // Store collection address
        collections.push(collectionAddress);
        creatorCollections[msg.sender].push(collectionAddress);
        
        emit CollectionCreated(
            msg.sender,
            collectionAddress,
            name,
            symbol,
            maxSupply,
            mintPrice
        );
        
        return collectionAddress;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getCollectionsCount() public view returns (uint256) {
        return collections.length;
    }

    function getAllCollections() public view returns (address[] memory) {
        return collections;
    }

    function getCreatorCollections(address creator) public view returns (address[] memory) {
        return creatorCollections[creator];
    }

    function getCreatorCollectionsCount(address creator) public view returns (uint256) {
        return creatorCollections[creator].length;
    }
}
