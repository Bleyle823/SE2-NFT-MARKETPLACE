// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/core/IRovifyToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CreatorMarketplace
 * @dev Marketplace for creator services, digital goods, and experiences
 */
contract CreatorMarketplace is AccessControl, ReentrancyGuard {
    // ===== ROLES =====
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // ===== STATE VARIABLES =====
    IRovifyToken public immutable rovifyToken;
    uint256 private _listingIdCounter;
    uint256 private _orderIdCounter;

    // ===== ENUMS =====
    enum ListingType {
        Service,
        DigitalGood,
        Experience,
        Consultation
    }
    enum ListingStatus {
        Active,
        Paused,
        Sold,
        Cancelled
    }
    enum OrderStatus {
        Pending,
        InProgress,
        Completed,
        Cancelled,
        Disputed
    }

    // ===== STRUCTS =====
    struct Listing {
        address seller;
        ListingType listingType;
        string title;
        string description;
        string[] images;
        string[] tags;
        uint256 price; // In RVFY
        uint256 quantity; // For digital goods
        uint256 deliveryTime; // In days
        ListingStatus status;
        uint256 totalSales;
        uint256 rating; // Average rating * 100 (e.g., 450 = 4.5 stars)
        uint256 reviewCount;
        bool isDigital;
        string[] requirements; // What buyer needs to provide
    }

    struct Order {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalPrice;
        uint256 orderTime;
        uint256 deliveryDeadline;
        OrderStatus status;
        string buyerRequirements; // Buyer's specific requirements
        string deliveryProof; // IPFS hash or delivery confirmation
        bool buyerApproved;
        bool sellerDelivered;
    }

    struct Review {
        address reviewer;
        uint256 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool isVerified; // Only buyers who completed orders can review
    }

    // ===== STORAGE =====
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Review[]) public listingReviews;
    mapping(address => uint256[]) public sellerListings;
    mapping(address => uint256[]) public buyerOrders;
    mapping(uint256 => uint256[]) public listingOrders; // listingId => orderIds

    // ===== PLATFORM CONFIG =====
    struct PlatformConfig {
        uint256 platformFeeRate; // Basis points
        uint256 listingFee; // Fee to create listing (in RVFY)
        uint256 maxDeliveryTime; // Maximum delivery time in days
        uint256 disputeWindow; // Time window for disputes in days
        bool moderationRequired; // Require moderation for listings
    }

    PlatformConfig public config;

    // ===== EVENTS =====
    event ListingCreated(uint256 indexed listingId, address indexed seller, string title, uint256 price);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 totalPrice);
    event OrderCompleted(uint256 indexed orderId, address indexed buyer, address indexed seller);
    event OrderCancelled(uint256 indexed orderId, string reason);
    event ReviewSubmitted(uint256 indexed listingId, address indexed reviewer, uint256 rating);
    event DisputeRaised(uint256 indexed orderId, address indexed initiator);

    constructor(address _rovifyToken, address _admin) {
        rovifyToken = IRovifyToken(_rovifyToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MODERATOR_ROLE, _admin);

        config = PlatformConfig({
            platformFeeRate: 300, // 3%
            listingFee: 100 * 10 ** 18, // 100 RVFY
            maxDeliveryTime: 30 days, // 30 days max
            disputeWindow: 7 days, // 7 days for disputes
            moderationRequired: false
        });

        _listingIdCounter = 1;
        _orderIdCounter = 1;
    }

    /**
     * @dev Create marketplace listing
     */
    function createListing(
        ListingType listingType,
        string calldata title,
        string calldata description,
        string[] calldata images,
        string[] calldata tags,
        uint256 price,
        uint256 quantity,
        uint256 deliveryTime,
        bool isDigital,
        string[] calldata requirements
    ) external nonReentrant returns (uint256 listingId) {
        require(bytes(title).length > 0, "Title required");
        require(price > 0, "Price must be positive");
        require(deliveryTime <= config.maxDeliveryTime, "Delivery time too long");
        require(quantity > 0, "Quantity must be positive");

        // Charge listing fee
        if (config.listingFee > 0) {
            rovifyToken.transferFrom(msg.sender, address(this), config.listingFee);
        }

        listingId = _listingIdCounter;
        _listingIdCounter++;

        listings[listingId] = Listing({
            seller: msg.sender,
            listingType: listingType,
            title: title,
            description: description,
            images: images,
            tags: tags,
            price: price,
            quantity: quantity,
            deliveryTime: deliveryTime,
            status: ListingStatus.Active,
            totalSales: 0,
            rating: 0,
            reviewCount: 0,
            isDigital: isDigital,
            requirements: requirements
        });

        sellerListings[msg.sender].push(listingId);

        // Grant seller role
        if (!hasRole(SELLER_ROLE, msg.sender)) {
            _grantRole(SELLER_ROLE, msg.sender);
        }

        emit ListingCreated(listingId, msg.sender, title, price);
    }

    /**
     * @dev Place order for listing
     */
    function placeOrder(
        uint256 listingId,
        uint256 quantity,
        string calldata buyerRequirements
    ) external nonReentrant returns (uint256 orderId) {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy your own listing");
        require(quantity <= listing.quantity, "Insufficient quantity");

        uint256 totalPrice = listing.price * quantity;

        // Transfer payment to escrow (this contract)
        rovifyToken.transferFrom(msg.sender, address(this), totalPrice);

        orderId = _orderIdCounter;
        _orderIdCounter++;

        orders[orderId] = Order({
            listingId: listingId,
            buyer: msg.sender,
            seller: listing.seller,
            quantity: quantity,
            totalPrice: totalPrice,
            orderTime: block.timestamp,
            deliveryDeadline: block.timestamp + (listing.deliveryTime * 1 days),
            status: OrderStatus.Pending,
            buyerRequirements: buyerRequirements,
            deliveryProof: "",
            buyerApproved: false,
            sellerDelivered: false
        });

        // Update listing
        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.status = ListingStatus.Sold;
        }

        // Update tracking
        buyerOrders[msg.sender].push(orderId);
        listingOrders[listingId].push(orderId);

        emit OrderPlaced(orderId, listingId, msg.sender, totalPrice);
    }

    /**
     * @dev Mark order as delivered (seller)
     */
    function deliverOrder(uint256 orderId, string calldata deliveryProof) external {
        Order storage order = orders[orderId];
        require(order.seller == msg.sender, "Not your order");
        require(order.status == OrderStatus.Pending || order.status == OrderStatus.InProgress, "Invalid status");

        order.sellerDelivered = true;
        order.deliveryProof = deliveryProof;
        order.status = OrderStatus.InProgress;

        // Auto-complete for digital goods after 24 hours if no dispute
        if (listings[order.listingId].isDigital) {
            // Could implement auto-completion timer here
        }
    }

    /**
     * @dev Approve order completion (buyer)
     */
    function approveOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not your order");
        require(order.sellerDelivered, "Order not delivered");
        require(order.status == OrderStatus.InProgress, "Invalid status");

        order.buyerApproved = true;
        order.status = OrderStatus.Completed;

        // Release payment to seller
        uint256 platformFee = (order.totalPrice * config.platformFeeRate) / 10000;
        uint256 sellerAmount = order.totalPrice - platformFee;

        rovifyToken.transfer(order.seller, sellerAmount);
        // Platform fee stays in contract

        // Update listing stats
        listings[order.listingId].totalSales += order.quantity;

        emit OrderCompleted(orderId, order.buyer, order.seller);
    }

    /**
     * @dev Submit review for completed order
     */
    function submitReview(uint256 listingId, uint256 orderId, uint256 rating, string calldata comment) external {
        require(rating >= 1 && rating <= 5, "Invalid rating");

        Order memory order = orders[orderId];
        require(order.buyer == msg.sender, "Not your order");
        require(order.status == OrderStatus.Completed, "Order not completed");

        listingReviews[listingId].push(
            Review({
                reviewer: msg.sender,
                rating: rating,
                comment: comment,
                timestamp: block.timestamp,
                isVerified: true
            })
        );

        // Update listing rating
        Listing storage listing = listings[listingId];
        uint256 totalRating = listing.rating * listing.reviewCount + (rating * 100);
        listing.reviewCount++;
        listing.rating = totalRating / listing.reviewCount;

        emit ReviewSubmitted(listingId, msg.sender, rating);
    }

    /**
     * @dev Cancel order (before delivery)
     */
    function cancelOrder(uint256 orderId, string calldata reason) external nonReentrant {
        Order storage order = orders[orderId];
        require(
            order.buyer == msg.sender || order.seller == msg.sender || hasRole(MODERATOR_ROLE, msg.sender),
            "Not authorized"
        );
        require(order.status == OrderStatus.Pending, "Cannot cancel after delivery");

        order.status = OrderStatus.Cancelled;

        // Refund buyer
        rovifyToken.transfer(order.buyer, order.totalPrice);

        // Restore listing quantity
        listings[order.listingId].quantity += order.quantity;
        if (listings[order.listingId].status == ListingStatus.Sold) {
            listings[order.listingId].status = ListingStatus.Active;
        }

        emit OrderCancelled(orderId, reason);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get listing details
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @dev Get order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @dev Get listings by seller
     */
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    /**
     * @dev Get orders by buyer
     */
    function getBuyerOrders(address buyer) external view returns (uint256[] memory) {
        return buyerOrders[buyer];
    }

    /**
     * @dev Get reviews for listing
     */
    function getListingReviews(uint256 listingId) external view returns (Review[] memory) {
        return listingReviews[listingId];
    }

    /**
     * @dev Search listings by type and status
     */
    function searchListings(ListingType listingType, bool activeOnly) external view returns (uint256[] memory) {
        uint256 totalListings = _listingIdCounter;
        uint256[] memory tempListings = new uint256[](totalListings);
        uint256 count = 0;

        for (uint256 i = 1; i < totalListings; i++) {
            Listing memory listing = listings[i];
            if (listing.listingType == listingType) {
                if (!activeOnly || listing.status == ListingStatus.Active) {
                    tempListings[count] = i;
                    count++;
                }
            }
        }

        uint256[] memory results = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            results[i] = tempListings[i];
        }

        return results;
    }

    /**
     * @dev Get current listing ID counter
     */
    function getCurrentListingId() external view returns (uint256) {
        return _listingIdCounter;
    }

    /**
     * @dev Get current order ID counter
     */
    function getCurrentOrderId() external view returns (uint256) {
        return _orderIdCounter;
    }

    /**
     * @dev Get total number of listings created
     */
    function getTotalListings() external view returns (uint256) {
        return _listingIdCounter - 1; // Subtract 1 since we start from ID 1
    }

    /**
     * @dev Get total number of orders created
     */
    function getTotalOrders() external view returns (uint256) {
        return _orderIdCounter - 1; // Subtract 1 since we start from ID 1
    }
}
