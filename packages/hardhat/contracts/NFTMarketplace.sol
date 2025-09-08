// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @dev A marketplace for trading NFT event tickets
 */
contract NFTMarketplace is ReentrancyGuard {
    uint256 private nextListingId;

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 createdAt;
    }

    // Mapping from listingId to Listing
    mapping(uint256 => Listing) public listings;
    
    // Events
    event TicketListed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    
    event TicketSold(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId
    );

    /**
     * @dev Lists an NFT ticket for sale
     * @param nftContract The address of the NFT contract
     * @param tokenId The ID of the token to list
     * @param price The price in wei
     */
    function listTicket(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "Not the token owner"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        uint256 listingId = ++nextListingId;

        listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp
        });

        emit TicketListed(listingId, nftContract, tokenId, msg.sender, price);
    }

    /**
     * @dev Buys a listed NFT ticket
     * @param listingId The ID of the listing to buy
     */
    function buyTicket(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing is not active");
        require(msg.value == listing.price, "Incorrect payment amount");
        require(msg.sender != listing.seller, "Seller cannot buy their own listing");

        listing.isActive = false;

        // Transfer payment to seller
        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "Failed to send payment");

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        emit TicketSold(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price
        );
    }

    /**
     * @dev Cancels a listing
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing is not active");
        require(
            listing.seller == msg.sender,
            "Only seller can cancel listing"
        );

        listing.isActive = false;

        emit ListingCancelled(
            listingId,
            listing.nftContract,
            listing.tokenId
        );
    }

    /**
     * @dev Gets all active listings
     * @return Array of active listings
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 totalListings = nextListingId;
        uint256 activeCount = 0;
        
        // First, count active listings
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active listings
        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].isActive) {
                activeListings[currentIndex] = listings[i];
                currentIndex++;
            }
        }
        
        return activeListings;
    }

    /**
     * @dev Gets a specific listing
     * @param listingId The ID of the listing to fetch
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}
