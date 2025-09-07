// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


// ============================================================================
// NFT MARKETPLACE CONTRACT
// ============================================================================

contract NFTMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 tokenId;
        address nftContract;
        address seller;
        uint256 price;
        bool active;
    }


    struct Offer {
        address buyer;
        uint256 amount;
        uint256 expiration;
        bool active;
    }

    // Market fee (in basis points, 250 = 2.5%)
    uint256 public marketFee = 250;
    uint256 public constant MAX_FEE = 1000; // 10% max

    // Mappings
    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => Offer[]) public offers;
    mapping(address => uint256) public pendingWithdrawals;

    // Arrays to track active listings
    bytes32[] public activeListings;

    // Events
    event ItemListed(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    event ItemSold(
        bytes32 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );

    event ListingCanceled(bytes32 indexed listingId);


    event OfferMade(
        bytes32 indexed itemId,
        address indexed buyer,
        uint256 amount,
        uint256 expiration
    );

    event OfferAccepted(
        bytes32 indexed itemId,
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );

    event MarketFeeUpdated(uint256 newFee);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ============================================================================
    // FIXED PRICE LISTINGS
    // ============================================================================

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (bytes32) {
        require(price > 0, "Price must be greater than zero");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) || 
            nft.isApprovedForAll(msg.sender, address(this)),
            "Contract not approved"
        );

        bytes32 listingId = keccak256(
            abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp)
        );

        listings[listingId] = Listing({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            price: price,
            active: true
        });

        activeListings.push(listingId);

        emit ItemListed(listingId, msg.sender, nftContract, tokenId, price);
        return listingId;
    }

    function buyItem(bytes32 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false;
        _removeFromActiveListings(listingId);

        // Calculate fees
        uint256 fee = (listing.price * marketFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Handle payments
        if (fee > 0) {
            pendingWithdrawals[owner()] += fee;
        }
        pendingWithdrawals[listing.seller] += sellerAmount;

        // Refund excess payment
        if (msg.value > listing.price) {
            pendingWithdrawals[msg.sender] += (msg.value - listing.price);
        }

        emit ItemSold(listingId, msg.sender, listing.seller, listing.price);
    }

    function cancelListing(bytes32 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender || msg.sender == owner(), "Not authorized");

        listing.active = false;
        _removeFromActiveListings(listingId);

        emit ListingCanceled(listingId);
    }


    // ============================================================================
    // OFFER SYSTEM
    // ============================================================================

    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 expiration
    ) external payable nonReentrant {
        require(msg.value > 0, "Offer must be greater than zero");
        require(expiration > block.timestamp, "Invalid expiration");

        bytes32 itemId = keccak256(abi.encodePacked(nftContract, tokenId));
        
        offers[itemId].push(Offer({
            buyer: msg.sender,
            amount: msg.value,
            expiration: expiration,
            active: true
        }));

        emit OfferMade(itemId, msg.sender, msg.value, expiration);
    }

    function acceptOffer(
        address nftContract,
        uint256 tokenId,
        uint256 offerIndex
    ) external nonReentrant {
        bytes32 itemId = keccak256(abi.encodePacked(nftContract, tokenId));
        require(offerIndex < offers[itemId].length, "Invalid offer index");

        Offer storage offer = offers[itemId][offerIndex];
        require(offer.active, "Offer not active");
        require(block.timestamp <= offer.expiration, "Offer expired");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");

        offer.active = false;

        // Calculate fees
        uint256 fee = (offer.amount * marketFee) / 10000;
        uint256 sellerAmount = offer.amount - fee;

        // Transfer NFT
        nft.safeTransferFrom(msg.sender, offer.buyer, tokenId);

        // Handle payments
        if (fee > 0) {
            pendingWithdrawals[owner()] += fee;
        }
        pendingWithdrawals[msg.sender] += sellerAmount;

        emit OfferAccepted(itemId, msg.sender, offer.buyer, offer.amount);
    }

    function withdrawOffer(
        address nftContract,
        uint256 tokenId,
        uint256 offerIndex
    ) external nonReentrant {
        bytes32 itemId = keccak256(abi.encodePacked(nftContract, tokenId));
        require(offerIndex < offers[itemId].length, "Invalid offer index");

        Offer storage offer = offers[itemId][offerIndex];
        require(offer.buyer == msg.sender, "Not your offer");
        require(offer.active, "Offer not active");

        offer.active = false;
        pendingWithdrawals[msg.sender] += offer.amount;
    }

    // ============================================================================
    // WITHDRAWAL SYSTEM
    // ============================================================================

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    function setMarketFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        marketFee = _fee;
        emit MarketFeeUpdated(_fee);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getActiveListings() external view returns (bytes32[] memory) {
        return activeListings;
    }


    function getOffers(address nftContract, uint256 tokenId) 
        external 
        view 
        returns (Offer[] memory) 
    {
        bytes32 itemId = keccak256(abi.encodePacked(nftContract, tokenId));
        return offers[itemId];
    }

    function getActiveOffers(address nftContract, uint256 tokenId) 
        external 
        view 
        returns (Offer[] memory) 
    {
        bytes32 itemId = keccak256(abi.encodePacked(nftContract, tokenId));
        Offer[] memory allOffers = offers[itemId];
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allOffers.length; i++) {
            if (allOffers[i].active && block.timestamp <= allOffers[i].expiration) {
                activeCount++;
            }
        }
        
        Offer[] memory activeOffers = new Offer[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allOffers.length; i++) {
            if (allOffers[i].active && block.timestamp <= allOffers[i].expiration) {
                activeOffers[currentIndex] = allOffers[i];
                currentIndex++;
            }
        }
        
        return activeOffers;
    }

    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================

    function _removeFromActiveListings(bytes32 listingId) internal {
        for (uint256 i = 0; i < activeListings.length; i++) {
            if (activeListings[i] == listingId) {
                activeListings[i] = activeListings[activeListings.length - 1];
                activeListings.pop();
                break;
            }
        }
    }


    // ============================================================================
    // RECEIVE FUNCTION
    // ============================================================================

    receive() external payable {
        // Allow contract to receive ETH
    }
}
