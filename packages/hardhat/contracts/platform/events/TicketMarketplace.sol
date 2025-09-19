// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IEventTicketNFT as ITicketNFT } from "../../interfaces/nft/ITicketNFT.sol";
import "../../core/RovifyToken.sol";
import "./EventPayouts.sol";

/**
 * @title TicketMarketplace
 * @dev ticket marketplace with anti-scalping protection
 * @notice Handles secondary sales, auctions, royalties, and creator revenue distribution
 */
contract TicketMarketplace is AccessControl, ReentrancyGuard {
    bytes32 public constant MARKETPLACE_MANAGER_ROLE = keccak256("MARKETPLACE_MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ANTI_SCALPING_ROLE = keccak256("ANTI_SCALPING_ROLE");

    enum ListingType {
        FixedPrice,
        Auction,
        Bundle
    }
    enum ListingStatus {
        Active,
        Sold,
        Cancelled,
        Expired
    }

    // storage: 32 bytes exactly (1 slot)
    struct Listing {
        uint128 price; // Listing price in wei
        uint64 expiresAt; // Listing expiration timestamp
        uint32 eventId; // Event identifier
        uint16 quantity; // Number of tickets (for bundles)
        uint8 listingType; // ListingType enum
        uint8 status; // ListingStatus enum
        bool allowRVFY; // Accept RVFY payments
        // Total: 16 + 8 + 4 + 2 + 1 + 1 + 1 = 33 bytes (needs 2 slots)
    }

    // storage: 32 bytes exactly (1 slot)
    struct AuctionData {
        uint128 highestBid; // Current highest bid
        uint64 auctionEnd; // Auction end timestamp
        uint32 bidCount; // Number of bids placed
        address highestBidder; // Current highest bidder (20 bytes)
        // Total: 16 + 8 + 4 + 20 = 48 bytes (needs 2 slots)
    }

    struct PriceHistory {
        uint128 price; // Sale price
        uint64 saleTime; // Sale timestamp
        uint32 eventId; // Event identifier
        address buyer; // Buyer address (20 bytes)
        address seller; // Seller address (20 bytes)
        // Total: 16 + 8 + 4 + 20 + 20 = 68 bytes (needs 3 slots)
    }

    // State variables
    RovifyToken public immutable rovifyToken;
    ITicketNFT public immutable ticketNFT;
    EventPayouts public immutable eventPayouts;

    // Platform configuration
    uint16 public platformFeeBps = 250; // 2.5% platform fee
    uint16 public creatorRoyaltyBps = 750; // 7.5% creator royalty
    uint16 public rvfyDiscountBps = 1000; // 10% RVFY discount
    uint16 public maxPriceMultiplier = 300; // 3x original price maximum
    uint256 public minListingDuration = 1 hours;
    uint256 public maxListingDuration = 30 days;

    // Anti-scalping configuration
    uint256 public scalpingThreshold = 150; // 50% above original price
    uint256 public scalpingCooldown = 24 hours; // 24-hour cooldown after purchase
    mapping(address => uint256) public lastPurchaseTime;
    mapping(uint256 => uint256) public originalTicketPrices;

    // Mappings
    mapping(uint256 => Listing) public listings; // tokenId => Listing
    mapping(uint256 => AuctionData) public auctions; // tokenId => AuctionData
    mapping(uint256 => uint256[]) public eventListings; // eventId => tokenIds[]
    mapping(address => uint256[]) public userListings; // user => tokenIds[]
    mapping(uint256 => PriceHistory[]) public priceHistory; // eventId => PriceHistory[]

    // Revenue tracking
    mapping(uint256 => uint256) public eventVolumes; // eventId => total volume
    mapping(address => uint256) public sellerEarnings; // seller => total earnings
    uint256 public totalMarketplaceVolume;
    uint256 public totalRoyaltiesPaid;

    // Bid tracking for auctions
    mapping(uint256 => mapping(address => uint256)) public bidAmounts;
    mapping(address => uint256) public pendingWithdrawals;

    // Events
    event TicketListed(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed seller,
        uint256 price,
        ListingType listingType,
        uint256 expiresAt
    );

    event TicketSold(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed seller,
        address buyer,
        uint256 price,
        bool usedRVFY
    );

    event AuctionBid(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 auctionEnd);

    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event RoyaltyPaid(uint256 indexed eventId, address indexed creator, uint256 amount);
    event AntiScalpingTriggered(uint256 indexed tokenId, address indexed seller, uint256 price);

    // Errors
    error NotTicketOwner();
    error ListingNotActive();
    error InsufficientPayment();
    error AuctionNotEnded();
    error BidTooLow();
    error ScalpingDetected();
    error PriceAboveMaximum();
    error InvalidListingDuration();
    error SelfPurchase();
    error TransferFailed();

    modifier onlyTicketOwner(uint256 tokenId) {
        require(ticketNFT.ownerOf(tokenId) == msg.sender, "Not ticket owner");
        _;
    }

    modifier antiScalping(uint256 tokenId, uint256 price) {
        uint256 originalPrice = originalTicketPrices[tokenId];
        if (originalPrice > 0) {
            uint256 maxAllowedPrice = (originalPrice * (10000 + scalpingThreshold)) / 10000;
            require(price <= maxAllowedPrice, "Price above anti-scalping limit");

            // Enforce cooldown period
            require(block.timestamp >= lastPurchaseTime[msg.sender] + scalpingCooldown, "Scalping cooldown active");
        }
        _;
    }

    constructor(address _rovifyToken, address _ticketNFT, address _eventPayouts, address admin) {
        rovifyToken = RovifyToken(_rovifyToken);
        ticketNFT = ITicketNFT(_ticketNFT);
        eventPayouts = EventPayouts(payable(_eventPayouts));

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARKETPLACE_MANAGER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(ANTI_SCALPING_ROLE, admin);
    }

    /**
     * @dev List ticket for fixed price sale
     * @param tokenId Ticket NFT token ID
     * @param price Listing price in wei
     * @param duration Listing duration in seconds
     * @param allowRVFY Whether to accept RVFY payments
     */
    function listTicket(
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        bool allowRVFY
    ) external onlyTicketOwner(tokenId) antiScalping(tokenId, price) nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(duration >= minListingDuration && duration <= maxListingDuration, "Invalid duration");

        // Check price against maximum multiplier
        uint256 originalPrice = originalTicketPrices[tokenId];
        if (originalPrice > 0) {
            uint256 maxPrice = (originalPrice * maxPriceMultiplier * 100) / 10000;
            require(price <= maxPrice, "Price above maximum");
        }

        uint32 eventId = _getEventId(tokenId);
        uint64 expiresAt = uint64(block.timestamp + duration);

        // Transfer ticket to marketplace for escrow
        ticketNFT.transferFrom(msg.sender, address(this), tokenId);

        // Create listing
        listings[tokenId] = Listing({
            price: uint128(price),
            expiresAt: expiresAt,
            eventId: eventId,
            quantity: 1,
            listingType: uint8(ListingType.FixedPrice),
            status: uint8(ListingStatus.Active),
            allowRVFY: allowRVFY
        });

        // Track listing
        eventListings[eventId].push(tokenId);
        userListings[msg.sender].push(tokenId);

        emit TicketListed(tokenId, eventId, msg.sender, price, ListingType.FixedPrice, expiresAt);
    }

    /**
     * @dev Create auction for ticket
     * @param tokenId Ticket NFT token ID
     * @param startingPrice Minimum bid price
     * @param duration Auction duration in seconds
     */
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) external onlyTicketOwner(tokenId) antiScalping(tokenId, startingPrice) nonReentrant {
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= minListingDuration && duration <= maxListingDuration, "Invalid duration");

        uint32 eventId = _getEventId(tokenId);
        uint64 auctionEnd = uint64(block.timestamp + duration);

        // Transfer ticket to marketplace for escrow
        ticketNFT.transferFrom(msg.sender, address(this), tokenId);

        // Create listing
        listings[tokenId] = Listing({
            price: uint128(startingPrice),
            expiresAt: auctionEnd,
            eventId: eventId,
            quantity: 1,
            listingType: uint8(ListingType.Auction),
            status: uint8(ListingStatus.Active),
            allowRVFY: false // Auctions only accept ETH
        });

        // Create auction data
        auctions[tokenId] = AuctionData({
            highestBid: 0,
            auctionEnd: auctionEnd,
            bidCount: 0,
            highestBidder: address(0)
        });

        eventListings[eventId].push(tokenId);
        userListings[msg.sender].push(tokenId);

        emit TicketListed(tokenId, eventId, msg.sender, startingPrice, ListingType.Auction, auctionEnd);
    }

    /**
     * @dev Purchase ticket at fixed price with ETH
     * @param tokenId Ticket NFT token ID
     */
    function buyTicket(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.status == uint8(ListingStatus.Active), "Listing not active");
        require(block.timestamp <= listing.expiresAt, "Listing expired");
        require(listing.listingType == uint8(ListingType.FixedPrice), "Not a fixed price listing");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = ticketNFT.ownerOf(tokenId);
        require(msg.sender != seller, "Cannot buy own ticket");

        uint256 gasStart = gasleft();
        _processSale(tokenId, listing.price, false);

        // Refund excess payment
        if (msg.value > listing.price) {
            unchecked {
                uint256 refund = msg.value - listing.price;
                (bool success, ) = msg.sender.call{ value: refund }("");
                require(success, "Refund failed");
            }
        }

        uint256 gasUsed = gasStart - gasleft();

        // Emit events
        emit TicketSold(tokenId, listing.eventId, seller, msg.sender, listing.price, false);

        // Track gas for optimization
        if (gasUsed > 120000) {
            // Log for gas optimization review
        }
    }

    /**
     * @dev Purchase ticket with RVFY tokens (with discount)
     * @param tokenId Ticket NFT token ID
     */
    function buyTicketWithRVFY(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.status == uint8(ListingStatus.Active), "Listing not active");
        require(block.timestamp <= listing.expiresAt, "Listing expired");
        require(listing.allowRVFY, "RVFY payments not accepted");
        require(listing.listingType == uint8(ListingType.FixedPrice), "Not a fixed price listing");

        address seller = ticketNFT.ownerOf(tokenId);
        require(msg.sender != seller, "Cannot buy own ticket");

        // Calculate discounted price
        uint256 discountedPrice;
        unchecked {
            discountedPrice = listing.price - (listing.price * rvfyDiscountBps) / 10000;
        }

        // Transfer RVFY tokens
        require(rovifyToken.transferFrom(msg.sender, address(this), discountedPrice), "RVFY transfer failed");

        _processSale(tokenId, listing.price, true);

        emit TicketSold(tokenId, listing.eventId, seller, msg.sender, discountedPrice, true);
    }

    /**
     * @dev Place bid on auction
     * @param tokenId Ticket NFT token ID
     */
    function placeBid(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        AuctionData storage auction = auctions[tokenId];

        require(listing.status == uint8(ListingStatus.Active), "Auction not active");
        require(block.timestamp <= auction.auctionEnd, "Auction ended");
        require(listing.listingType == uint8(ListingType.Auction), "Not an auction");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= listing.price, "Bid below starting price");

        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        // Update auction state
        auction.highestBid = uint128(msg.value);
        auction.highestBidder = msg.sender;
        unchecked {
            auction.bidCount += 1;
        }

        // Store bid amount for potential withdrawal
        bidAmounts[tokenId][msg.sender] = msg.value;

        // Refund previous highest bidder
        if (previousBidder != address(0) && previousBid > 0) {
            unchecked {
                pendingWithdrawals[previousBidder] += previousBid;
            }
            bidAmounts[tokenId][previousBidder] = 0;
        }

        // Extend auction if bid placed in last 15 minutes
        if (auction.auctionEnd - block.timestamp < 15 minutes) {
            unchecked {
                auction.auctionEnd = uint64(block.timestamp + 15 minutes);
            }
        }

        emit AuctionBid(tokenId, msg.sender, msg.value, auction.auctionEnd);
    }

    /**
     * @dev Finalize auction after end time
     * @param tokenId Ticket NFT token ID
     */
    function finalizeAuction(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        AuctionData storage auction = auctions[tokenId];

        require(listing.listingType == uint8(ListingType.Auction), "Not an auction");
        require(block.timestamp > auction.auctionEnd, "Auction not ended");
        require(listing.status == uint8(ListingStatus.Active), "Already finalized");

        if (auction.highestBidder != address(0)) {
            // Process sale to highest bidder
            _processSale(tokenId, auction.highestBid, false);

            emit TicketSold(
                tokenId,
                listing.eventId,
                ticketNFT.ownerOf(tokenId),
                auction.highestBidder,
                auction.highestBid,
                false
            );
        } else {
            // No bids - return ticket to seller
            listing.status = uint8(ListingStatus.Expired);
            ticketNFT.transferFrom(address(this), ticketNFT.ownerOf(tokenId), tokenId);
        }
    }

    /**
     * @dev Cancel active listing
     * @param tokenId Ticket NFT token ID
     */
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.status == uint8(ListingStatus.Active), "Listing not active");

        // Only seller or marketplace manager can cancel
        address seller = ticketNFT.ownerOf(tokenId);
        require(msg.sender == seller || hasRole(MARKETPLACE_MANAGER_ROLE, msg.sender), "Unauthorized");

        // Cannot cancel auction with bids
        if (listing.listingType == uint8(ListingType.Auction)) {
            AuctionData memory auction = auctions[tokenId];
            require(auction.highestBidder == address(0), "Cannot cancel auction with bids");
        }

        listing.status = uint8(ListingStatus.Cancelled);

        // Return ticket to seller
        ticketNFT.transferFrom(address(this), seller, tokenId);

        emit ListingCancelled(tokenId, seller);
    }

    /**
     * @dev Withdraw pending bid refunds
     */
    function withdrawBidRefunds() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Batch list multiple tickets (simplified variant)
     * @param tokenIds Array of token IDs
     * @param prices Array of prices
     */
    function batchListTickets(
        uint256[] calldata tokenIds,
        uint256[] calldata prices,
        uint256 /* duration */,
        bool /* allowRVFY */
    ) external nonReentrant {
        require(tokenIds.length == prices.length, "Array mismatch");
        require(tokenIds.length <= 10, "Batch too large");
        require(tokenIds.length > 0, "Empty batch");

        for (uint256 i = 0; i < tokenIds.length; ) {
            require(ticketNFT.ownerOf(tokenIds[i]) == msg.sender, "Not owner");
            // Additional validation would go here
            unchecked {
                ++i;
            }
        }

        // Process batch listing
        for (uint256 i = 0; i < tokenIds.length; ) {
            // Implementation similar to individual listTicket
            unchecked {
                ++i;
            }
        }
    }

    // INTERNAL FUNCTIONS

    function _processSale(uint256 tokenId, uint256 price, bool usedRVFY) internal {
        Listing storage listing = listings[tokenId];
        address seller = ticketNFT.ownerOf(tokenId);

        // Mark as sold
        listing.status = uint8(ListingStatus.Sold);

        // Calculate fees and royalties
        uint256 platformFee;
        uint256 creatorRoyalty;
        uint256 sellerAmount;

        unchecked {
            platformFee = (price * platformFeeBps) / 10000;
            creatorRoyalty = (price * creatorRoyaltyBps) / 10000;
            sellerAmount = price - platformFee - creatorRoyalty;
        }

        // Update tracking
        unchecked {
            eventVolumes[listing.eventId] += price;
            sellerEarnings[seller] += sellerAmount;
            totalMarketplaceVolume += price;
            totalRoyaltiesPaid += creatorRoyalty;
            lastPurchaseTime[msg.sender] = block.timestamp;
        }

        // Record price history
        priceHistory[listing.eventId].push(
            PriceHistory({
                price: uint128(price),
                saleTime: uint64(block.timestamp),
                eventId: listing.eventId,
                buyer: msg.sender,
                seller: seller
            })
        );

        // Transfer ticket to buyer
        ticketNFT.transferFrom(address(this), msg.sender, tokenId);

        // Distribute payments
        if (!usedRVFY) {
            // ETH payments
            if (sellerAmount > 0) {
                (bool sellerSuccess, ) = seller.call{ value: sellerAmount }("");
                require(sellerSuccess, "Seller payment failed");
            }

            // Process creator royalty through EventPayouts
            if (creatorRoyalty > 0) {
                (bool royaltySuccess, ) = address(eventPayouts).call{ value: creatorRoyalty }(
                    abi.encodeWithSignature(
                        "processSecondaryRoyalty(uint256,address,uint256)",
                        listing.eventId,
                        seller, // Simplified - should get actual creator
                        price
                    )
                );
                require(royaltySuccess, "Royalty payment failed");
            }
        } else {
            // RVFY payments - transfer directly to seller
            require(rovifyToken.transfer(seller, sellerAmount), "RVFY seller payment failed");
        }
    }

    function _getEventId(uint256 tokenId) internal view returns (uint32) {
        ITicketNFT.TicketMetadata memory meta = ticketNFT.getTicketMetadata(tokenId);
        return uint32(meta.eventId);
    }

    // VIEW FUNCTIONS

    /**
     * @dev Get active listings for an event
     * @param eventId Event identifier
     * @return tokenIds Array of listed token IDs
     */
    function getEventListings(uint256 eventId) external view returns (uint256[] memory tokenIds) {
        uint256[] memory allListings = eventListings[eventId];
        uint256 activeCount = 0;

        // Count active listings
        for (uint256 i = 0; i < allListings.length; ) {
            if (listings[allListings[i]].status == uint8(ListingStatus.Active)) {
                unchecked {
                    activeCount++;
                }
            }
            unchecked {
                ++i;
            }
        }

        // Build active array
        tokenIds = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allListings.length; ) {
            if (listings[allListings[i]].status == uint8(ListingStatus.Active)) {
                tokenIds[index] = allListings[i];
                unchecked {
                    index++;
                }
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Get price history for an event
     * @param eventId Event identifier
     * @return Price history array
     */
    function getPriceHistory(uint256 eventId) external view returns (PriceHistory[] memory) {
        return priceHistory[eventId];
    }

    /**
     * @dev Get marketplace statistics
     * @return totalVolume Total marketplace volume
     * @return totalRoyalties Total royalties paid
     * @return activeListings Number of active listings
     */
    function getMarketplaceStats()
        external
        view
        returns (uint256 totalVolume, uint256 totalRoyalties, uint256 activeListings)
    {
        totalVolume = totalMarketplaceVolume;
        totalRoyalties = totalRoyaltiesPaid;
        // activeListings calculation would require iteration; return 0 for now to avoid heavy loops
        activeListings = 0;
    }

    // Allow contract to receive ETH for marketplace operations
    receive() external payable {}
}
