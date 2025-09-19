// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/platform/IEventManagement.sol";
import "../../core/BurnMechanism.sol";

/**
 * @title EventPayouts
 * @dev creator revenue distribution system
 * @notice Handles automated payouts, multi-creator splits, and platform fee distribution
 */
contract EventPayouts is AccessControl, ReentrancyGuard {
    bytes32 public constant PAYOUT_MANAGER_ROLE = keccak256("PAYOUT_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    enum PayoutStatus {
        Pending,
        Processed,
        Emergency,
        Disputed
    }

    // storage: 32 bytes exactly (1 slot)
    struct PayoutConfiguration {
        uint128 totalRevenue; // Total event revenue
        uint64 payoutTime; // When payout was processed
        uint32 creatorCount; // Number of creators splitting revenue
        uint16 platformFeeBps; // Platform fee (basis points)
        uint8 status; // PayoutStatus enum
        bool emergencyWithdrawn; // Emergency withdrawal flag
        // Total: 16 + 8 + 4 + 2 + 1 + 1 = 32 bytes (perfect slot)
    }

    // storage: 32 bytes exactly (1 slot)
    struct CreatorSplit {
        uint128 amount; // Creator's share amount
        uint64 claimTime; // When creator claimed payout
        uint32 percentage; // Creator's percentage (basis points)
        bool claimed; // Whether creator has claimed
        // Total: 16 + 8 + 4 + 1 = 29 bytes (3 bytes unused)
    }

    struct SecondaryRoyalty {
        uint128 totalVolume; // Total secondary sales volume
        uint128 totalRoyalties; // Total royalties earned
        uint64 lastSaleTime; // Last secondary sale timestamp
        uint32 salesCount; // Number of secondary sales
        // Total: 16 + 16 + 8 + 4 = 44 bytes (2 slots)
    }

    // State variables
    BurnMechanism public immutable burnMechanism;
    address public treasury;

    // Platform configuration
    uint16 public platformFeeBps = 250; // 2.5% platform fee
    uint16 public secondaryRoyaltyBps = 750; // 7.5% creator royalty on secondary sales
    uint16 public secondaryPlatformBps = 250; // 2.5% platform fee on secondary sales
    uint16 public maxCreators = 10; // Maximum creators per event

    // Emergency controls
    bool public emergencyPaused = false;
    uint256 public emergencyDelay = 7 days; // 7-day delay for emergency withdrawals

    // Mappings
    mapping(uint256 => PayoutConfiguration) public payoutConfigs;
    mapping(uint256 => mapping(address => CreatorSplit)) public creatorSplits;
    mapping(uint256 => address[]) public eventCreators;
    mapping(uint256 => SecondaryRoyalty) public secondaryRoyalties;
    mapping(address => uint256) public pendingWithdrawals;

    // Revenue tracking
    mapping(uint256 => uint256) public eventRevenues;
    mapping(uint256 => uint256) public platformFees;
    uint256 public totalBurnedFromFees;

    // Events
    event PayoutConfigured(uint256 indexed eventId, address[] creators, uint256[] percentages, uint256 totalRevenue);

    event PayoutProcessed(
        uint256 indexed eventId,
        uint256 totalRevenue,
        uint256 platformFee,
        uint256 burnAmount,
        uint256 gasUsed
    );

    event CreatorPayout(uint256 indexed eventId, address indexed creator, uint256 amount, uint256 timestamp);

    event BatchPayoutCompleted(uint256[] eventIds, uint256 totalProcessed, uint256 gasUsed);

    event SecondaryRoyaltyPaid(uint256 indexed eventId, address indexed creator, uint256 amount, uint256 salePrice);

    event EmergencyWithdrawal(uint256 indexed eventId, address indexed creator, uint256 amount);

    // Errors
    error InvalidCreatorSplit();
    error PayoutAlreadyProcessed();
    error PayoutNotReady();
    error CreatorNotFound();
    error AlreadyClaimed();
    error InsufficientRevenue();
    error EmergencyPaused();
    error InvalidConfiguration();
    error UnauthorizedAccess();
    error EmergencyDelayNotMet();

    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }

    constructor(address _burnMechanism, address _treasury, address admin) {
        burnMechanism = BurnMechanism(_burnMechanism);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAYOUT_MANAGER_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
    }

    /**
     * @dev Set creator revenue splits for an event
     * @param eventId Event identifier
     * @param creators Array of creator addresses
     * @param percentages Array of percentage splits (basis points)
     */
    function setCreatorSplits(
        uint256 eventId,
        address[] calldata creators,
        uint256[] calldata percentages
    ) external onlyRole(PAYOUT_MANAGER_ROLE) {
        require(creators.length == percentages.length, "Array mismatch");
        require(creators.length <= maxCreators, "Too many creators");
        require(creators.length > 0, "No creators specified");

        // Validate percentages sum to 10000 (100%)
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; ) {
            require(percentages[i] > 0, "Invalid percentage");
            unchecked {
                totalPercentage += percentages[i];
                ++i;
            }
        }
        require(totalPercentage == 10000, "Percentages must sum to 100%");

        // Clear existing splits
        address[] storage existingCreators = eventCreators[eventId];
        for (uint256 i = 0; i < existingCreators.length; ) {
            delete creatorSplits[eventId][existingCreators[i]];
            unchecked {
                ++i;
            }
        }
        delete eventCreators[eventId];

        // Set new splits
        for (uint256 i = 0; i < creators.length; ) {
            address creator = creators[i];
            require(creator != address(0), "Invalid creator address");

            creatorSplits[eventId][creator] = CreatorSplit({
                amount: 0, // Will be calculated during payout
                claimTime: 0,
                percentage: uint32(percentages[i]),
                claimed: false
            });

            eventCreators[eventId].push(creator);
            unchecked {
                ++i;
            }
        }

        emit PayoutConfigured(eventId, creators, percentages, 0);
    }

    /**
     * @dev Calculate and execute payouts for a completed event
     * @param eventId Event identifier
     * @param totalRevenue Total revenue from ticket sales
     */
    function executePayouts(
        uint256 eventId,
        uint256 totalRevenue
    ) external onlyRole(PAYOUT_MANAGER_ROLE) nonReentrant notEmergencyPaused {
        require(totalRevenue > 0, "No revenue to distribute");

        PayoutConfiguration storage config = payoutConfigs[eventId];
        require(config.status == uint8(PayoutStatus.Pending), "Payout already processed");

        uint256 gasStart = gasleft();

        // Calculate platform fee
        uint256 platformFee;
        unchecked {
            platformFee = (totalRevenue * platformFeeBps) / 10000;
        }

        // Calculate burn amount (25% of platform fees per BurnMechanism)
        uint256 burnAmount;
        unchecked {
            burnAmount = (platformFee * 2500) / 10000; // 25% of platform fees
        }

        // Remaining revenue after platform fee
        uint256 creatorRevenue;
        unchecked {
            creatorRevenue = totalRevenue - platformFee;
        }

        // Calculate creator payouts
        address[] memory creators = eventCreators[eventId];
        require(creators.length > 0, "No creators configured");

        for (uint256 i = 0; i < creators.length; ) {
            address creator = creators[i];
            CreatorSplit storage split = creatorSplits[eventId][creator];

            unchecked {
                split.amount = uint128((creatorRevenue * split.percentage) / 10000);
                ++i;
            }
        }

        // Update payout configuration
        unchecked {
            config.totalRevenue = uint128(totalRevenue);
            config.payoutTime = uint64(block.timestamp);
            config.creatorCount = uint32(creators.length);
            config.platformFeeBps = platformFeeBps;
            config.status = uint8(PayoutStatus.Processed);
        }

        // Store revenue tracking
        eventRevenues[eventId] = creatorRevenue;
        platformFees[eventId] = platformFee;

        // Send burn amount to BurnMechanism
        if (burnAmount > 0) {
            (bool burnSuccess, ) = address(burnMechanism).call{ value: burnAmount }("");
            if (burnSuccess) {
                unchecked {
                    totalBurnedFromFees += burnAmount;
                }
            }
        }

        // Send remaining platform fee to treasury
        uint256 treasuryAmount;
        unchecked {
            treasuryAmount = platformFee - burnAmount;
        }

        if (treasuryAmount > 0) {
            (bool treasurySuccess, ) = treasury.call{ value: treasuryAmount }("");
            require(treasurySuccess, "Treasury transfer failed");
        }

        uint256 gasUsed = gasStart - gasleft();
        emit PayoutProcessed(eventId, totalRevenue, platformFee, burnAmount, gasUsed);
    }

    /**
     * @dev Claim creator payout for a specific event
     * @param eventId Event identifier
     */
    function claimCreatorPayout(uint256 eventId) external nonReentrant notEmergencyPaused {
        CreatorSplit storage split = creatorSplits[eventId][msg.sender];
        require(split.percentage > 0, "Not a creator for this event");
        require(!split.claimed, "Already claimed");
        require(split.amount > 0, "No payout available");

        PayoutConfiguration memory config = payoutConfigs[eventId];
        require(config.status == uint8(PayoutStatus.Processed), "Payout not processed");

        uint256 amount = split.amount;

        // Mark as claimed
        split.claimed = true;
        unchecked {
            split.claimTime = uint64(block.timestamp);
        }

        // Transfer payout
        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Payout transfer failed");

        emit CreatorPayout(eventId, msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Batch claim payouts for multiple events
     * @param eventIds Array of event IDs to claim from
     */
    function batchClaimPayouts(uint256[] calldata eventIds) external nonReentrant notEmergencyPaused {
        require(eventIds.length <= 20, "Batch too large");
        require(eventIds.length > 0, "Empty batch");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < eventIds.length; ) {
            uint256 eventId = eventIds[i];
            CreatorSplit storage split = creatorSplits[eventId][msg.sender];

            if (split.percentage > 0 && !split.claimed && split.amount > 0) {
                PayoutConfiguration memory config = payoutConfigs[eventId];
                if (config.status == uint8(PayoutStatus.Processed)) {
                    unchecked {
                        totalAmount += split.amount;
                        split.claimTime = uint64(block.timestamp);
                    }
                    split.claimed = true;

                    emit CreatorPayout(eventId, msg.sender, split.amount, block.timestamp);
                }
            }

            unchecked {
                ++i;
            }
        }

        require(totalAmount > 0, "No payouts available");

        // Single transfer for all payouts
        (bool success, ) = msg.sender.call{ value: totalAmount }("");
        require(success, "Batch payout transfer failed");
    }

    /**
     * @dev Process secondary sale royalty payment
     * @param eventId Event identifier
     * @param creator Creator address
     * @param salePrice Secondary sale price
     */
    function processSecondaryRoyalty(
        uint256 eventId,
        address creator,
        uint256 salePrice
    ) external payable onlyRole(PAYOUT_MANAGER_ROLE) nonReentrant {
        require(salePrice > 0, "Invalid sale price");
        require(msg.value > 0, "No royalty payment");

        // Calculate royalty amounts
        uint256 creatorRoyalty;
        uint256 platformRoyalty;

        unchecked {
            creatorRoyalty = (salePrice * secondaryRoyaltyBps) / 10000;
            platformRoyalty = (salePrice * secondaryPlatformBps) / 10000;
        }

        require(msg.value >= creatorRoyalty + platformRoyalty, "Insufficient royalty payment");

        // Update secondary royalty tracking
        SecondaryRoyalty storage royalty = secondaryRoyalties[eventId];
        unchecked {
            royalty.totalVolume += uint128(salePrice);
            royalty.totalRoyalties += uint128(creatorRoyalty);
            royalty.lastSaleTime = uint64(block.timestamp);
            royalty.salesCount += 1;
        }

        // Add to creator's pending withdrawals
        unchecked {
            pendingWithdrawals[creator] += creatorRoyalty;
        }

        // Send platform royalty to treasury
        if (platformRoyalty > 0) {
            (bool success, ) = treasury.call{ value: platformRoyalty }("");
            require(success, "Platform royalty transfer failed");
        }

        // Refund excess payment
        uint256 excess = msg.value - (creatorRoyalty + platformRoyalty);
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{ value: excess }("");
            require(refundSuccess, "Excess refund failed");
        }

        emit SecondaryRoyaltyPaid(eventId, creator, creatorRoyalty, salePrice);
    }

    /**
     * @dev Withdraw accumulated secondary royalties
     */
    function withdrawSecondaryRoyalties() external nonReentrant notEmergencyPaused {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No royalties to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Royalty withdrawal failed");
    }

    /**
     * @dev Emergency withdrawal for creators (with delay)
     * @param eventId Event identifier
     */
    function emergencyWithdrawRevenue(uint256 eventId) external onlyRole(EMERGENCY_ROLE) nonReentrant {
        PayoutConfiguration storage config = payoutConfigs[eventId];
        require(!config.emergencyWithdrawn, "Already emergency withdrawn");
        require(block.timestamp >= config.payoutTime + emergencyDelay, "Emergency delay not met");

        config.emergencyWithdrawn = true;
        config.status = uint8(PayoutStatus.Emergency);

        uint256 remainingRevenue = eventRevenues[eventId];
        if (remainingRevenue > 0) {
            eventRevenues[eventId] = 0;

            (bool success, ) = treasury.call{ value: remainingRevenue }("");
            require(success, "Emergency withdrawal failed");

            emit EmergencyWithdrawal(eventId, treasury, remainingRevenue);
        }
    }

    /**
     * @dev Toggle emergency pause
     * @param paused New pause status
     */
    function setEmergencyPause(bool paused) external onlyRole(EMERGENCY_ROLE) {
        emergencyPaused = paused;
    }

    /**
     * @dev Update platform fee percentage
     * @param newFeeBps New fee in basis points
     */
    function updatePlatformFee(uint16 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFeeBps;
    }

    /**
     * @dev Update secondary royalty percentages
     * @param creatorBps Creator royalty basis points
     * @param platformBps Platform royalty basis points
     */
    function updateSecondaryRoyalties(uint16 creatorBps, uint16 platformBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(creatorBps + platformBps <= 2000, "Total royalty too high"); // Max 20%
        secondaryRoyaltyBps = creatorBps;
        secondaryPlatformBps = platformBps;
    }

    // VIEW FUNCTIONS

    /**
     * @dev Calculate payout amounts for an event
     * @param eventId Event identifier
     * @param totalRevenue Total revenue amount
     * @return platformFee Platform fee amount
     * @return burnAmount Amount to be burned
     * @return creatorRevenue Total creator revenue
     */
    function calculatePayouts(
        uint256 eventId,
        uint256 totalRevenue
    ) external view returns (uint256 platformFee, uint256 burnAmount, uint256 creatorRevenue) {
        unchecked {
            platformFee = (totalRevenue * platformFeeBps) / 10000;
            burnAmount = (platformFee * 2500) / 10000; // 25% of platform fees
            creatorRevenue = totalRevenue - platformFee;
        }
    }

    /**
     * @dev Get creator split information
     * @param eventId Event identifier
     * @param creator Creator address
     * @return Creator split data
     */
    function getCreatorSplit(uint256 eventId, address creator) external view returns (CreatorSplit memory) {
        return creatorSplits[eventId][creator];
    }

    /**
     * @dev Get all creators for an event
     * @param eventId Event identifier
     * @return Array of creator addresses
     */
    function getEventCreators(uint256 eventId) external view returns (address[] memory) {
        return eventCreators[eventId];
    }

    /**
     * @dev Get secondary royalty data for an event
     * @param eventId Event identifier
     * @return Secondary royalty struct
     */
    function getSecondaryRoyalties(uint256 eventId) external view returns (SecondaryRoyalty memory) {
        return secondaryRoyalties[eventId];
    }

    /**
     * @dev Get pending secondary royalty amount for a creator
     * @param creator Creator address
     * @return Pending withdrawal amount
     */
    function getPendingRoyalties(address creator) external view returns (uint256) {
        return pendingWithdrawals[creator];
    }

    /**
     * @dev Check if creator has unclaimed payouts
     * @param creator Creator address
     * @param eventIds Array of event IDs to check
     * @return totalUnclaimed Total unclaimed amount
     * @return claimableEvents Number of events with claimable payouts
     */
    function getUnclaimedPayouts(
        address creator,
        uint256[] calldata eventIds
    ) external view returns (uint256 totalUnclaimed, uint256 claimableEvents) {
        for (uint256 i = 0; i < eventIds.length; ) {
            uint256 eventId = eventIds[i];
            CreatorSplit memory split = creatorSplits[eventId][creator];
            PayoutConfiguration memory config = payoutConfigs[eventId];

            if (!split.claimed && split.amount > 0 && config.status == uint8(PayoutStatus.Processed)) {
                unchecked {
                    totalUnclaimed += split.amount;
                    claimableEvents += 1;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    // Allow contract to receive ETH for payouts
    receive() external payable {}
}
