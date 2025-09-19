// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IEventTicketNFT as ITicketNFT } from "../../interfaces/nft/ITicketNFT.sol";
import "../../core/RovifyToken.sol";

/**
 * @title TicketSales
 * @dev ticket sales engine with RVFY integration
 * @notice Handles flexible sale configurations, payments, discounts, and anti-bot protection
 */
contract TicketSales is AccessControl, ReentrancyGuard {
    bytes32 public constant SALES_MANAGER_ROLE = keccak256("SALES_MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // storage: 2 slots instead of 6+ standard
    struct SaleConfiguration {
        uint128 price; // Ticket price in wei
        uint128 maxSupply; // Maximum tickets available
        uint64 saleStart; // Sale start timestamp
        uint64 saleEnd; // Sale end timestamp
        uint32 maxPerWallet; // Maximum tickets per wallet
        uint16 rvfyDiscountBps; // RVFY payment discount (basis points)
        bool whitelistOnly; // Whitelist-only sale
        bool active; // Sale active status
        // Slot 1: 16 + 16 = 32 bytes
        // Slot 2: 8 + 8 + 4 + 2 + 1 + 1 = 24 bytes (8 bytes unused)
    }

    struct SaleMetrics {
        uint128 totalSold; // Total tickets sold
        uint128 totalRevenue; // Total ETH revenue
        uint64 lastPurchaseTime; // Last purchase timestamp
        uint32 uniquePurchasers; // Number of unique buyers
        // Slot 1: 16 + 16 + 8 + 4 = 44 bytes (too big for 1 slot)
        // Actual: 2 slots with 20 bytes unused in slot 2
    }

    struct PurchaseData {
        uint128 amountPaid; // Amount paid in wei
        uint64 purchaseTime; // Purchase timestamp
        uint32 quantity; // Number of tickets purchased
        bool usedRVFY; // Whether RVFY was used for discount
        // Slot 1: 16 + 8 + 4 + 1 = 29 bytes (3 bytes unused)
    }

    // State variables
    RovifyToken public immutable rovifyToken;
    ITicketNFT public immutable ticketNFT;
    address public treasury;

    // Platform configuration
    uint16 public platformFeeBps = 250; // 2.5% platform fee
    uint16 public maxRvfyDiscountBps = 1500; // 15% max RVFY discount
    uint256 public minPurchaseInterval = 3 seconds; // Anti-bot protection

    // Mappings
    mapping(uint256 => SaleConfiguration) public saleConfigs;
    mapping(uint256 => SaleMetrics) public saleMetrics;
    mapping(uint256 => mapping(address => PurchaseData)) public purchaseHistory;
    mapping(uint256 => mapping(address => bool)) public whitelists;
    mapping(address => uint256) public lastPurchaseTime;

    // Revenue tracking
    mapping(uint256 => uint256) public eventRevenues;
    uint256 public totalPlatformFees;

    // Events
    event SaleConfigured(
        uint256 indexed eventId,
        uint128 price,
        uint128 maxSupply,
        uint64 saleStart,
        uint64 saleEnd,
        bool whitelistOnly
    );

    event TicketsPurchased(
        uint256 indexed eventId,
        address indexed buyer,
        uint256 quantity,
        uint256 totalPaid,
        bool usedRVFY,
        uint256[] tokenIds
    );

    event BatchPurchaseCompleted(
        address indexed buyer,
        uint256[] eventIds,
        uint256[] quantities,
        uint256 totalPaid,
        uint256 gasUsed
    );

    event WhitelistUpdated(uint256 indexed eventId, address[] users, bool added);
    event RefundProcessed(uint256 indexed eventId, address indexed buyer, uint256 amount);
    event SaleStatusChanged(uint256 indexed eventId, bool active);

    // Errors
    error SaleNotActive();
    error SaleNotStarted();
    error SaleEnded();
    error InsufficientSupply();
    error ExceedsWalletLimit();
    error InsufficientPayment();
    error NotWhitelisted();
    error PurchaseTooSoon();
    error InvalidConfiguration();
    error UnauthorizedAccess();
    error RefundFailed();
    error InvalidBatchSize();

    constructor(address _rovifyToken, address _ticketNFT, address _treasury, address admin) {
        rovifyToken = RovifyToken(_rovifyToken);
        ticketNFT = ITicketNFT(_ticketNFT);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SALES_MANAGER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
    }

    /**
     * @dev Configure sale parameters for an event
     * @param eventId Event identifier
     * @param config Sale configuration struct
     */
    function configureSale(uint256 eventId, SaleConfiguration calldata config) external onlyRole(SALES_MANAGER_ROLE) {
        require(config.price > 0, "Price must be greater than 0");
        require(config.maxSupply > 0, "Max supply must be greater than 0");
        require(config.saleStart < config.saleEnd, "Invalid sale period");
        require(config.saleStart >= block.timestamp, "Sale start in past");
        require(config.maxPerWallet > 0, "Max per wallet must be greater than 0");
        require(config.rvfyDiscountBps <= maxRvfyDiscountBps, "Discount too high");

        saleConfigs[eventId] = config;

        emit SaleConfigured(
            eventId,
            config.price,
            config.maxSupply,
            config.saleStart,
            config.saleEnd,
            config.whitelistOnly
        );
    }

    /**
     * @dev Purchase tickets with ETH
     * @param eventId Event to purchase tickets for
     * @param quantity Number of tickets to purchase
     */
    function purchaseTickets(uint256 eventId, uint256 quantity) external payable nonReentrant {
        require(quantity > 0 && quantity <= 10, "Invalid quantity");

        uint256 gasStart = gasleft();
        _validatePurchase(eventId, quantity, msg.sender);

        SaleConfiguration storage config = saleConfigs[eventId];
        SaleMetrics storage metrics = saleMetrics[eventId];

        uint256 totalCost = config.price * quantity;
        require(msg.value >= totalCost, "Insufficient payment");

        // Process purchase
        uint256[] memory tokenIds = _processPurchase(eventId, msg.sender, quantity, totalCost, false);

        // Update metrics
        unchecked {
            metrics.totalSold += uint128(quantity);
            metrics.totalRevenue += uint128(totalCost);
            metrics.lastPurchaseTime = uint64(block.timestamp);

            // Check if this is a new purchaser
            if (purchaseHistory[eventId][msg.sender].purchaseTime == 0) {
                metrics.uniquePurchasers += 1;
            }
        }

        // Handle refund for overpayment
        if (msg.value > totalCost) {
            unchecked {
                uint256 refund = msg.value - totalCost;
                (bool success, ) = msg.sender.call{ value: refund }("");
                require(success, "Refund failed");
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit TicketsPurchased(eventId, msg.sender, quantity, totalCost, false, tokenIds);

        // Gas optimization tracking
        if (gasUsed > 100000) {
            emit BatchPurchaseCompleted(msg.sender, _toArray(eventId), _toArray(quantity), totalCost, gasUsed);
        }
    }

    /**
     * CHANGE: Convenience helper to simplify UI flow from the Events tab
     * @dev Purchase exactly one ticket with ETH
     * @param eventId Event to purchase a ticket for
     */
    function purchaseOne(uint256 eventId) external payable nonReentrant {
        _validatePurchase(eventId, 1, msg.sender);

        SaleConfiguration storage config = saleConfigs[eventId];
        require(msg.value >= config.price, "Insufficient payment");

        uint256[] memory tokenIds = _processPurchase(eventId, msg.sender, 1, config.price, false);

        // Refund any excess
        if (msg.value > config.price) {
            unchecked {
                uint256 refund = msg.value - config.price;
                (bool success, ) = msg.sender.call{ value: refund }("");
                require(success, "Refund failed");
            }
        }

        // Update metrics
        SaleMetrics storage metrics = saleMetrics[eventId];
        unchecked {
            metrics.totalSold += 1;
            metrics.totalRevenue += uint128(config.price);
            metrics.lastPurchaseTime = uint64(block.timestamp);
            if (purchaseHistory[eventId][msg.sender].purchaseTime == 0) {
                metrics.uniquePurchasers += 1;
            }
        }

        emit TicketsPurchased(eventId, msg.sender, 1, config.price, false, tokenIds);
    }

    /**
     * @dev Purchase tickets with RVFY tokens (with discount)
     * @param eventId Event to purchase tickets for
     * @param quantity Number of tickets to purchase
     */
    function purchaseWithRVFY(uint256 eventId, uint256 quantity) external nonReentrant {
        require(quantity > 0 && quantity <= 10, "Invalid quantity");

        _validatePurchase(eventId, quantity, msg.sender);

        SaleConfiguration storage config = saleConfigs[eventId];
        SaleMetrics storage metrics = saleMetrics[eventId];

        // Calculate discounted price
        uint256 basePrice = config.price * quantity;
        uint256 discountedPrice;

        unchecked {
            discountedPrice = basePrice - (basePrice * config.rvfyDiscountBps) / 10000;
        }

        // Transfer RVFY tokens
        require(rovifyToken.transferFrom(msg.sender, treasury, discountedPrice), "RVFY transfer failed");

        // Process purchase
        uint256[] memory tokenIds = _processPurchase(eventId, msg.sender, quantity, discountedPrice, true);

        // Update metrics
        unchecked {
            metrics.totalSold += uint128(quantity);
            metrics.totalRevenue += uint128(basePrice); // Track full value for analytics
            metrics.lastPurchaseTime = uint64(block.timestamp);

            if (purchaseHistory[eventId][msg.sender].purchaseTime == 0) {
                metrics.uniquePurchasers += 1;
            }
        }

        emit TicketsPurchased(eventId, msg.sender, quantity, discountedPrice, true, tokenIds);
    }

    /**
     * @dev Batch purchase tickets for multiple events
     * @param eventIds Array of event IDs
     * @param quantities Array of ticket quantities
     */
    function batchPurchase(uint256[] calldata eventIds, uint256[] calldata quantities) external payable nonReentrant {
        require(eventIds.length == quantities.length, "Array mismatch");
        require(eventIds.length <= 5, "Batch too large");
        require(eventIds.length > 0, "Empty batch");

        uint256 gasStart = gasleft();
        uint256 totalCost = 0;

        // Calculate total cost
        for (uint256 i = 0; i < eventIds.length; ) {
            require(quantities[i] > 0 && quantities[i] <= 5, "Invalid quantity for batch");
            _validatePurchase(eventIds[i], quantities[i], msg.sender);

            unchecked {
                totalCost += saleConfigs[eventIds[i]].price * quantities[i];
                ++i;
            }
        }

        require(msg.value >= totalCost, "Insufficient payment");

        // Process all purchases
        for (uint256 i = 0; i < eventIds.length; ) {
            uint256 eventCost = saleConfigs[eventIds[i]].price * quantities[i];

            _processPurchase(eventIds[i], msg.sender, quantities[i], eventCost, false);

            unchecked {
                ++i;
            }
        }

        // Handle overpayment refund
        if (msg.value > totalCost) {
            unchecked {
                uint256 refund = msg.value - totalCost;
                (bool success, ) = msg.sender.call{ value: refund }("");
                require(success, "Refund failed");
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit BatchPurchaseCompleted(msg.sender, eventIds, quantities, totalCost, gasUsed);
    }

    /**
     * @dev Add addresses to event whitelist
     * @param eventId Event ID
     * @param users Array of addresses to whitelist
     */
    function addToWhitelist(uint256 eventId, address[] calldata users) external onlyRole(SALES_MANAGER_ROLE) {
        require(users.length <= 100, "Batch too large");

        for (uint256 i = 0; i < users.length; ) {
            whitelists[eventId][users[i]] = true;
            unchecked {
                ++i;
            }
        }

        emit WhitelistUpdated(eventId, users, true);
    }

    /**
     * @dev Remove addresses from event whitelist
     * @param eventId Event ID
     * @param users Array of addresses to remove
     */
    function removeFromWhitelist(uint256 eventId, address[] calldata users) external onlyRole(SALES_MANAGER_ROLE) {
        require(users.length <= 100, "Batch too large");

        for (uint256 i = 0; i < users.length; ) {
            whitelists[eventId][users[i]] = false;
            unchecked {
                ++i;
            }
        }

        emit WhitelistUpdated(eventId, users, false);
    }

    /**
     * @dev Process refunds for cancelled events
     * @param eventId Event ID
     * @param buyers Array of buyer addresses to refund
     */
    function processRefunds(uint256 eventId, address[] calldata buyers) external onlyRole(TREASURY_ROLE) nonReentrant {
        require(buyers.length <= 50, "Batch too large");

        for (uint256 i = 0; i < buyers.length; ) {
            address buyer = buyers[i];
            PurchaseData memory purchase = purchaseHistory[eventId][buyer];

            if (purchase.amountPaid > 0 && !purchase.usedRVFY) {
                // Reset purchase data to prevent double refunds
                delete purchaseHistory[eventId][buyer];

                // Process ETH refund
                (bool success, ) = buyer.call{ value: purchase.amountPaid }("");
                if (success) {
                    emit RefundProcessed(eventId, buyer, purchase.amountPaid);
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Update sale status (activate/deactivate)
     * @param eventId Event ID
     * @param active New status
     */
    function setSaleStatus(uint256 eventId, bool active) external onlyRole(SALES_MANAGER_ROLE) {
        saleConfigs[eventId].active = active;
        emit SaleStatusChanged(eventId, active);
    }

    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external onlyRole(TREASURY_ROLE) {
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;

        (bool success, ) = treasury.call{ value: amount }("");
        require(success, "Fee withdrawal failed");
    }

    // INTERNAL FUNCTIONS

    function _validatePurchase(uint256 eventId, uint256 quantity, address buyer) internal view {
        SaleConfiguration memory config = saleConfigs[eventId];
        SaleMetrics memory metrics = saleMetrics[eventId];

        require(config.active, "Sale not active");
        require(block.timestamp >= config.saleStart, "Sale not started");
        require(block.timestamp <= config.saleEnd, "Sale ended");
        require(metrics.totalSold + quantity <= config.maxSupply, "Insufficient supply");

        // Check wallet limit
        uint256 currentPurchased = purchaseHistory[eventId][buyer].quantity;
        require(currentPurchased + quantity <= config.maxPerWallet, "Exceeds wallet limit");

        // Check whitelist if enabled
        if (config.whitelistOnly) {
            require(whitelists[eventId][buyer], "Not whitelisted");
        }

        // Anti-bot protection
        require(block.timestamp >= lastPurchaseTime[buyer] + minPurchaseInterval, "Purchase too soon");
    }

    function _processPurchase(
        uint256 eventId,
        address buyer,
        uint256 quantity,
        uint256 totalPaid,
        bool usedRVFY
    ) internal returns (uint256[] memory tokenIds) {
        // Update purchase history
        PurchaseData storage purchase = purchaseHistory[eventId][buyer];

        unchecked {
            purchase.amountPaid += uint128(totalPaid);
            purchase.quantity += uint32(quantity);
            purchase.purchaseTime = uint64(block.timestamp);
            purchase.usedRVFY = usedRVFY;
        }

        // Update rate limiting
        lastPurchaseTime[buyer] = block.timestamp;

        // Calculate platform fee and update tracking
        if (!usedRVFY) {
            unchecked {
                uint256 platformFee = (totalPaid * platformFeeBps) / 10000;
                totalPlatformFees += platformFee;
                eventRevenues[eventId] += totalPaid - platformFee;
            }
        }

        // CHANGE: Mint tickets on the EventTicketNFT contract and collect real tokenIds (replaces placeholder ids)
        tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; ) {
            // default to transferable true and generic type "General" for streamlined minting
            uint256 mintedId = ticketNFT.mintTicket(buyer, eventId, "General", true);
            tokenIds[i] = mintedId;
            unchecked {
                ++i;
            }
        }

        return tokenIds;
    }

    function _toArray(uint256 value) internal pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = value;
        return array;
    }

    // VIEW FUNCTIONS

    /**
     * @dev Get sale configuration for an event
     * @param eventId Event ID
     * @return Sale configuration struct
     */
    function getSaleConfig(uint256 eventId) external view returns (SaleConfiguration memory) {
        return saleConfigs[eventId];
    }

    /**
     * @dev Get sale metrics for an event
     * @param eventId Event ID
     * @return Sale metrics struct
     */
    function getSaleMetrics(uint256 eventId) external view returns (SaleMetrics memory) {
        return saleMetrics[eventId];
    }

    /**
     * @dev Get purchase history for a buyer
     * @param eventId Event ID
     * @param buyer Buyer address
     * @return Purchase data struct
     */
    function getPurchaseHistory(uint256 eventId, address buyer) external view returns (PurchaseData memory) {
        return purchaseHistory[eventId][buyer];
    }

    /**
     * @dev Check if address is whitelisted for an event
     * @param eventId Event ID
     * @param user User address
     * @return True if whitelisted
     */
    function isWhitelisted(uint256 eventId, address user) external view returns (bool) {
        return whitelists[eventId][user];
    }

    /**
     * @dev Calculate discounted price for RVFY payment
     * @param eventId Event ID
     * @param quantity Number of tickets
     * @return discountedPrice Price after RVFY discount
     * @return savings Amount saved
     */
    function calculateRVFYDiscount(
        uint256 eventId,
        uint256 quantity
    ) external view returns (uint256 discountedPrice, uint256 savings) {
        SaleConfiguration memory config = saleConfigs[eventId];
        uint256 basePrice = config.price * quantity;

        unchecked {
            savings = (basePrice * config.rvfyDiscountBps) / 10000;
            discountedPrice = basePrice - savings;
        }
    }

    /**
     * @dev Get remaining ticket supply for an event
     * @param eventId Event ID
     * @return remaining Number of tickets remaining
     */
    function getRemainingSupply(uint256 eventId) external view returns (uint256 remaining) {
        SaleConfiguration memory config = saleConfigs[eventId];
        SaleMetrics memory metrics = saleMetrics[eventId];

        unchecked {
            remaining = config.maxSupply - metrics.totalSold;
        }
    }
}
