// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../../interfaces/core/IRovifyToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CreatorIncentives
 * @dev Enhanced creator incentive system with performance-based rewards
 */
contract CreatorIncentives is AccessControl, ReentrancyGuard {
    // ===== ROLES =====
    bytes32 public constant INCENTIVE_MANAGER_ROLE = keccak256("INCENTIVE_MANAGER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ===== STATE VARIABLES =====
    IRovifyToken public immutable rovifyToken;

    // ===== ENUMS =====
    enum CreatorTier {
        Bronze,
        Silver,
        Gold,
        Platinum,
        Diamond
    }
    enum RewardType {
        Monthly,
        Performance,
        Milestone,
        Referral,
        Special
    }

    // ===== STRUCTS =====
    struct CreatorProfile {
        CreatorTier tier;
        uint256 stakedAmount; // RVFY staked for tier
        uint256 monthlyRevenue; // Monthly revenue in USD (scaled)
        uint256 followerCount; // Total followers across platforms
        uint256 engagementScore; // Calculated engagement score
        uint256 lastRewardClaim; // Last monthly reward claim
        uint256 totalRewardsClaimed; // Total rewards claimed
        uint256 referralCount; // Number of successful referrals
        bool isVerified; // KYC/verification status
        bool isActive; // Currently active creator
        string[] specialties; // Creator specialties/categories
    }

    struct RewardPool {
        uint256 monthlyPool; // Monthly reward pool
        uint256 performancePool; // Performance bonus pool
        uint256 milestonePool; // Milestone achievement pool
        uint256 referralPool; // Referral reward pool
        uint256 specialPool; // Special campaigns pool
        uint256 currentMonth; // Current month identifier
        uint256 totalDistributed; // Total distributed this month
    }

    struct PerformanceMetrics {
        uint256 contentCreated; // Number of content pieces
        uint256 eventHosted; // Number of events hosted
        uint256 streamHours; // Total streaming hours
        uint256 ticketsSold; // Event tickets sold
        uint256 subscriptionGrowth; // Subscription growth percentage
        uint256 viewerEngagement; // Average viewer engagement
        uint256 communityGrowth; // Community growth metrics
    }

    // ===== STORAGE =====
    mapping(address => CreatorProfile) public creators;
    mapping(address => PerformanceMetrics) public creatorMetrics;
    mapping(CreatorTier => uint256) public tierStakeRequirements;
    mapping(CreatorTier => uint256) public tierRewardMultipliers; // Basis points
    mapping(address => mapping(uint256 => bool)) public monthlyClaimStatus;
    mapping(address => address[]) public referrals; // referrer => referred creators

    RewardPool public rewardPool;

    // ===== CONFIGURATION =====
    struct IncentiveConfig {
        uint256 baseMonthlyReward; // Base monthly reward
        uint256 performanceBonus; // Max performance bonus
        uint256 milestoneReward; // Standard milestone reward
        uint256 referralReward; // Referral reward amount
        uint256 verificationBonus; // Verification bonus multiplier
        uint256 minActiveThreshold; // Minimum activity for rewards
    }

    IncentiveConfig public config;

    // ===== EVENTS =====
    event CreatorRegistered(address indexed creator, CreatorTier tier);
    event CreatorTierUpdated(address indexed creator, CreatorTier oldTier, CreatorTier newTier);
    event MonthlyRewardClaimed(address indexed creator, uint256 amount, uint256 month);
    event PerformanceBonusAwarded(address indexed creator, uint256 amount, string reason);
    event MilestoneAchieved(address indexed creator, string milestone, uint256 reward);
    event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount);
    event CreatorVerified(address indexed creator, address indexed verifier);

    constructor(address _rovifyToken, address _admin) {
        rovifyToken = IRovifyToken(_rovifyToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(INCENTIVE_MANAGER_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);

        // Initialize tier requirements
        tierStakeRequirements[CreatorTier.Bronze] = 1000 * 10 ** 18; // 1K RVFY
        tierStakeRequirements[CreatorTier.Silver] = 5000 * 10 ** 18; // 5K RVFY
        tierStakeRequirements[CreatorTier.Gold] = 10000 * 10 ** 18; // 10K RVFY
        tierStakeRequirements[CreatorTier.Platinum] = 25000 * 10 ** 18; // 25K RVFY
        tierStakeRequirements[CreatorTier.Diamond] = 50000 * 10 ** 18; // 50K RVFY

        // Initialize tier multipliers (basis points)
        tierRewardMultipliers[CreatorTier.Bronze] = 100; // 1%
        tierRewardMultipliers[CreatorTier.Silver] = 300; // 3%
        tierRewardMultipliers[CreatorTier.Gold] = 600; // 6%
        tierRewardMultipliers[CreatorTier.Platinum] = 1000; // 10%
        tierRewardMultipliers[CreatorTier.Diamond] = 1500; // 15%

        // Initialize reward pools
        rewardPool = RewardPool({
            monthlyPool: 1000000 * 10 ** 18, // 1M RVFY monthly
            performancePool: 500000 * 10 ** 18, // 500K RVFY performance
            milestonePool: 250000 * 10 ** 18, // 250K RVFY milestones
            referralPool: 100000 * 10 ** 18, // 100K RVFY referrals
            specialPool: 150000 * 10 ** 18, // 150K RVFY special
            currentMonth: _getCurrentMonth(),
            totalDistributed: 0
        });

        // Initialize configuration
        config = IncentiveConfig({
            baseMonthlyReward: 1000 * 10 ** 18, // 1K RVFY base
            performanceBonus: 5000 * 10 ** 18, // 5K RVFY max bonus
            milestoneReward: 2000 * 10 ** 18, // 2K RVFY milestone
            referralReward: 500 * 10 ** 18, // 500 RVFY referral
            verificationBonus: 1500, // 15% bonus for verified
            minActiveThreshold: 100 // Minimum activity score
        });
    }

    /**
     * @dev Register as creator
     */
    function registerCreator(CreatorTier tier, string[] calldata specialties, address referrer) external nonReentrant {
        require(!creators[msg.sender].isActive, "Already registered");
        require(specialties.length > 0, "Specialties required");

        uint256 stakeRequired = tierStakeRequirements[tier];

        // Transfer stake
        rovifyToken.transferFrom(msg.sender, address(this), stakeRequired);

        creators[msg.sender] = CreatorProfile({
            tier: tier,
            stakedAmount: stakeRequired,
            monthlyRevenue: 0,
            followerCount: 0,
            engagementScore: 0,
            lastRewardClaim: 0,
            totalRewardsClaimed: 0,
            referralCount: 0,
            isVerified: false,
            isActive: true,
            specialties: specialties
        });

        // Initialize metrics
        creatorMetrics[msg.sender] = PerformanceMetrics({
            contentCreated: 0,
            eventHosted: 0,
            streamHours: 0,
            ticketsSold: 0,
            subscriptionGrowth: 0,
            viewerEngagement: 0,
            communityGrowth: 0
        });

        // Handle referral
        if (referrer != address(0) && creators[referrer].isActive) {
            referrals[referrer].push(msg.sender);
            creators[referrer].referralCount++;

            // Pay referral reward
            uint256 referralReward = config.referralReward;
            rovifyToken.transfer(referrer, referralReward);
            rewardPool.referralPool -= referralReward;

            emit ReferralRewardPaid(referrer, msg.sender, referralReward);
        }

        emit CreatorRegistered(msg.sender, tier);
    }

    /**
     * @dev Claim monthly rewards
     */
    function claimMonthlyReward() external nonReentrant {
        CreatorProfile storage creator = creators[msg.sender];
        require(creator.isActive, "Not active creator");

        uint256 currentMonth = _getCurrentMonth();
        require(!monthlyClaimStatus[msg.sender][currentMonth], "Already claimed this month");
        require(block.timestamp >= creator.lastRewardClaim + 30 days, "Too early to claim");

        // Check minimum activity
        uint256 activityScore = _calculateActivityScore(msg.sender);
        require(activityScore >= config.minActiveThreshold, "Insufficient activity");

        // Calculate reward
        uint256 baseReward = config.baseMonthlyReward;
        uint256 tierMultiplier = tierRewardMultipliers[creator.tier];
        uint256 tierReward = (baseReward * tierMultiplier) / 10000;

        // Verification bonus
        if (creator.isVerified) {
            tierReward = (tierReward * (10000 + config.verificationBonus)) / 10000;
        }

        // Performance bonus
        uint256 performanceBonus = _calculatePerformanceBonus(msg.sender);
        uint256 totalReward = tierReward + performanceBonus;

        // Update state
        creator.lastRewardClaim = block.timestamp;
        creator.totalRewardsClaimed += totalReward;
        monthlyClaimStatus[msg.sender][currentMonth] = true;
        rewardPool.totalDistributed += totalReward;

        // Transfer reward
        rovifyToken.transfer(msg.sender, totalReward);

        emit MonthlyRewardClaimed(msg.sender, totalReward, currentMonth);
    }

    /**
     * @dev Update creator metrics (called by platform contracts)
     */
    function updateCreatorMetrics(
        address creator,
        uint256 contentCreated,
        uint256 eventHosted,
        uint256 streamHours,
        uint256 ticketsSold,
        uint256 subscriptionGrowth
    ) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        require(creators[creator].isActive, "Creator not active");

        PerformanceMetrics storage metrics = creatorMetrics[creator];
        metrics.contentCreated += contentCreated;
        metrics.eventHosted += eventHosted;
        metrics.streamHours += streamHours;
        metrics.ticketsSold += ticketsSold;

        if (subscriptionGrowth > 0) {
            metrics.subscriptionGrowth = subscriptionGrowth;
        }

        // Update engagement score
        creators[creator].engagementScore = _calculateEngagementScore(creator);

        // Check for tier upgrade
        _checkTierUpgrade(creator);
    }

    /**
     * @dev Award milestone achievement
     */
    function awardMilestone(
        address creator,
        string calldata milestone,
        uint256 customReward
    ) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        require(creators[creator].isActive, "Creator not active");

        uint256 reward = customReward > 0 ? customReward : config.milestoneReward;

        creators[creator].totalRewardsClaimed += reward;
        rewardPool.milestonePool -= reward;

        rovifyToken.transfer(creator, reward);

        emit MilestoneAchieved(creator, milestone, reward);
    }

    /**
     * @dev Verify creator (KYC/verification)
     */
    function verifyCreator(address creator) external onlyRole(VERIFIER_ROLE) {
        require(creators[creator].isActive, "Creator not active");

        creators[creator].isVerified = true;
        emit CreatorVerified(creator, msg.sender);
    }

    // ===== INTERNAL FUNCTIONS =====

    /**
     * @dev Calculate activity score
     */
    function _calculateActivityScore(address creator) internal view returns (uint256) {
        PerformanceMetrics memory metrics = creatorMetrics[creator];

        // Simple scoring algorithm (can be enhanced)
        uint256 score = 0;
        score += metrics.contentCreated * 10;
        score += metrics.eventHosted * 25;
        score += metrics.streamHours * 5;
        score += metrics.ticketsSold * 2;
        score += creators[creator].followerCount / 100;

        return score;
    }

    /**
     * @dev Calculate performance bonus
     */
    function _calculatePerformanceBonus(address creator) internal view returns (uint256) {
        uint256 activityScore = _calculateActivityScore(creator);
        uint256 engagementScore = creators[creator].engagementScore;

        // Performance bonus based on activity and engagement
        uint256 bonusPercentage = (activityScore + engagementScore) / 100;
        if (bonusPercentage > 50) bonusPercentage = 50; // Cap at 50%

        return (config.performanceBonus * bonusPercentage) / 100;
    }

    /**
     * @dev Calculate engagement score
     */
    function _calculateEngagementScore(address creator) internal view returns (uint256) {
        PerformanceMetrics memory metrics = creatorMetrics[creator];
        CreatorProfile memory profile = creators[creator];

        // Engagement calculation (simplified)
        uint256 score = 0;
        if (profile.followerCount > 0) {
            score += (metrics.ticketsSold * 100) / profile.followerCount;
            score += metrics.subscriptionGrowth;
            score += metrics.viewerEngagement;
        }

        return score;
    }

    /**
     * @dev Check for tier upgrade
     */
    function _checkTierUpgrade(address creator) internal {
        CreatorProfile storage profile = creators[creator];
        uint256 currentScore = _calculateActivityScore(creator);
        uint256 engagementScore = profile.engagementScore;

        CreatorTier newTier = profile.tier;

        // Tier upgrade logic based on metrics
        if (currentScore >= 10000 && engagementScore >= 5000) {
            newTier = CreatorTier.Diamond;
        } else if (currentScore >= 5000 && engagementScore >= 2500) {
            newTier = CreatorTier.Platinum;
        } else if (currentScore >= 2000 && engagementScore >= 1000) {
            newTier = CreatorTier.Gold;
        } else if (currentScore >= 500 && engagementScore >= 250) {
            newTier = CreatorTier.Silver;
        }

        if (newTier != profile.tier) {
            CreatorTier oldTier = profile.tier;
            profile.tier = newTier;
            emit CreatorTierUpdated(creator, oldTier, newTier);
        }
    }

    /**
     * @dev Get current month identifier
     */
    function _getCurrentMonth() internal view returns (uint256) {
        return (block.timestamp / 30 days);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get creator profile
     */
    function getCreatorProfile(address creator) external view returns (CreatorProfile memory) {
        return creators[creator];
    }

    /**
     * @dev Get creator metrics
     */
    function getCreatorMetrics(address creator) external view returns (PerformanceMetrics memory) {
        return creatorMetrics[creator];
    }

    /**
     * @dev Get tier requirements
     */
    function getTierRequirements(CreatorTier tier) external view returns (uint256 stake, uint256 multiplier) {
        return (tierStakeRequirements[tier], tierRewardMultipliers[tier]);
    }

    /**
     * @dev Get creator referrals
     */
    function getCreatorReferrals(address creator) external view returns (address[] memory) {
        return referrals[creator];
    }

    /**
     * @dev Calculate pending reward
     */
    function calculatePendingReward(address creator) external view returns (uint256) {
        if (!creators[creator].isActive) return 0;

        uint256 currentMonth = _getCurrentMonth();
        if (monthlyClaimStatus[creator][currentMonth]) return 0;

        if (block.timestamp < creators[creator].lastRewardClaim + 30 days) return 0;

        uint256 baseReward = config.baseMonthlyReward;
        uint256 tierMultiplier = tierRewardMultipliers[creators[creator].tier];
        uint256 tierReward = (baseReward * tierMultiplier) / 10000;

        if (creators[creator].isVerified) {
            tierReward = (tierReward * (10000 + config.verificationBonus)) / 10000;
        }

        uint256 performanceBonus = _calculatePerformanceBonus(creator);
        return tierReward + performanceBonus;
    }
}
