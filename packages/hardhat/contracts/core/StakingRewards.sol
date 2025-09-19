// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Staking Rewards - Tier-based Staking System
 * @dev staking with tier-based rewards and role management
 */
contract StakingRewards is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    IERC20 public immutable stakingToken;

    // ===== USER DATA =====
    struct UserStakeData {
        uint128 stakedAmount; // Amount staked
        uint128 pendingRewards; // Pending reward amount
        uint64 lastRewardUpdate; // Last reward calculation time
        uint32 tierLevel; // User tier (0-4)
        uint16 boostMultiplier; // Boost multiplier (basis points)
        bool hasVotingRights; // Voting permission
        bool hasPremiumAccess; // Premium features access
    }

    mapping(address => UserStakeData) private userStakes;

    // ===== GLOBAL STATE =====
    struct GlobalStakingState {
        uint128 totalStaked; // Total amount staked
        uint128 rewardPool; // Available reward pool
        uint64 lastGlobalUpdate; // Last global update time
        uint32 rewardRate; // Rewards per second (scaled)
        uint16 stakingFee; // Staking fee (basis points)
        bool stakingEnabled; // Staking toggle
        bool emergencyWithdraw; // Emergency mode
    }

    GlobalStakingState public globalState;

    // ===== TIER SYSTEM =====
    uint256[5] private tierThresholds = [
        1000 * 10 ** 18, // Bronze: 1K
        5000 * 10 ** 18, // Silver: 5K
        10000 * 10 ** 18, // Gold: 10K
        25000 * 10 ** 18, // Platinum: 25K
        50000 * 10 ** 18 // Diamond: 50K
    ];

    uint16[5] private tierMultipliers = [1000, 1200, 1500, 2000, 3000]; // 100%, 120%, 150%, 200%, 300%

    // ===== EVENTS =====
    event Staked(address indexed user, uint256 amount, uint32 newTier);
    event Withdrawn(address indexed user, uint256 amount, uint32 newTier);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 gasUsed);
    event TierUpgraded(address indexed user, uint32 oldTier, uint32 newTier);

    constructor(address _stakingToken, address _admin) {
        stakingToken = IERC20(_stakingToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(REWARDS_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        globalState = GlobalStakingState({
            totalStaked: 0,
            rewardPool: 0,
            lastGlobalUpdate: uint64(block.timestamp),
            rewardRate: 0,
            stakingFee: 50, // 0.5%
            stakingEnabled: true,
            emergencyWithdraw: false
        });
    }

    /**
     * @dev staking
     */
    function stake(uint256 amount) external nonReentrant {
        require(globalState.stakingEnabled, "Staking disabled");
        require(amount > 0, "Zero amount");

        UserStakeData storage userData = userStakes[msg.sender];

        // Update rewards before modifying stake
        _updateUserRewards(msg.sender);

        // Calculate fee with unchecked math (amount > 0 validated)
        uint256 fee;
        uint256 netAmount;
        unchecked {
            fee = (amount * globalState.stakingFee) / 10000;
            netAmount = amount - fee;

            // Update user data
            userData.stakedAmount += uint128(netAmount);
            userData.lastRewardUpdate = uint64(block.timestamp);

            // Update global state
            globalState.totalStaked += uint128(netAmount);
        }

        // Update tier and privileges efficiently
        uint32 newTier = _calculateTier(userData.stakedAmount);
        uint32 oldTier = userData.tierLevel;

        if (newTier != oldTier) {
            userData.tierLevel = newTier;
            userData.boostMultiplier = tierMultipliers[newTier];
            userData.hasVotingRights = newTier >= 1; // Silver+
            userData.hasPremiumAccess = newTier >= 2; // Gold+

            emit TierUpgraded(msg.sender, oldTier, newTier);
        }

        // Transfer tokens
        stakingToken.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, netAmount, newTier);
    }

    /**
     * @dev withdrawal
     */
    function withdraw(uint256 amount) external nonReentrant {
        UserStakeData storage userData = userStakes[msg.sender];
        require(userData.stakedAmount >= amount, "Insufficient stake");

        // Update rewards before withdrawal
        _updateUserRewards(msg.sender);

        // Update balances with unchecked math (amount validated)
        unchecked {
            userData.stakedAmount -= uint128(amount);
            globalState.totalStaked -= uint128(amount);
        }

        // Update tier after withdrawal
        uint32 newTier = _calculateTier(userData.stakedAmount);
        uint32 oldTier = userData.tierLevel;

        if (newTier != oldTier) {
            userData.tierLevel = newTier;
            userData.boostMultiplier = tierMultipliers[newTier];
            userData.hasVotingRights = newTier >= 1;
            userData.hasPremiumAccess = newTier >= 2;

            emit TierUpgraded(msg.sender, oldTier, newTier);
        }

        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, newTier);
    }

    /**
     * @dev Reward claiming with gas tracking
     */
    function claimRewards() external nonReentrant {
        uint256 gasStart = gasleft();

        _updateUserRewards(msg.sender);

        UserStakeData storage userData = userStakes[msg.sender];
        uint256 rewards = userData.pendingRewards;
        require(rewards > 0, "No rewards");

        userData.pendingRewards = 0;

        // Update global reward pool with unchecked math
        unchecked {
            globalState.rewardPool -= uint128(rewards);
        }

        stakingToken.transfer(msg.sender, rewards);

        uint256 gasUsed = gasStart - gasleft();
        emit RewardsClaimed(msg.sender, rewards, gasUsed);
    }

    /**
     * @dev tier calculation without assembly
     */
    function _calculateTier(uint256 amount) internal view returns (uint32 tier) {
        tier = 0;

        // comparison without assembly
        if (amount >= tierThresholds[0]) tier = 1;
        if (amount >= tierThresholds[1]) tier = 2;
        if (amount >= tierThresholds[2]) tier = 3;
        if (amount >= tierThresholds[3]) tier = 4;
        if (amount >= tierThresholds[4]) tier = 4; // Cap at max tier

        return tier;
    }

    /**
     * @dev reward calculation
     */
    function _updateUserRewards(address user) internal {
        UserStakeData storage userData = userStakes[user];

        if (userData.stakedAmount > 0) {
            uint256 timeDiff = block.timestamp - userData.lastRewardUpdate;

            if (timeDiff > 0) {
                // Calculate base rewards with unchecked math
                unchecked {
                    uint256 baseReward = (userData.stakedAmount * globalState.rewardRate * timeDiff) / 1e18;
                    uint256 boostedReward = (baseReward * userData.boostMultiplier) / 1000;

                    userData.pendingRewards += uint128(boostedReward);
                    userData.lastRewardUpdate = uint64(block.timestamp);
                }
            }
        }
    }

    /**
     * @dev User info getter
     */
    function getUserInfo(
        address user
    )
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 pendingRewards,
            uint32 tierLevel,
            uint16 boostMultiplier,
            bool hasVoting,
            bool hasPremium
        )
    {
        UserStakeData memory userData = userStakes[user];

        // Calculate current pending rewards
        uint256 currentRewards = userData.pendingRewards;
        if (userData.stakedAmount > 0) {
            uint256 timeDiff = block.timestamp - userData.lastRewardUpdate;
            unchecked {
                uint256 baseReward = (userData.stakedAmount * globalState.rewardRate * timeDiff) / 1e18;
                uint256 boostedReward = (baseReward * userData.boostMultiplier) / 1000;
                currentRewards += boostedReward;
            }
        }

        return (
            userData.stakedAmount,
            currentRewards,
            userData.tierLevel,
            userData.boostMultiplier,
            userData.hasVotingRights,
            userData.hasPremiumAccess
        );
    }

    /**
     * @dev Add rewards to the pool
     */
    function addRewards(uint256 amount) external onlyRole(REWARDS_MANAGER_ROLE) {
        unchecked {
            globalState.rewardPool += uint128(amount);
            globalState.rewardRate = uint32(amount / 30 days); // 30-day distribution
        }
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Emergency controls
     */
    function toggleEmergencyWithdraw() external onlyRole(EMERGENCY_ROLE) {
        globalState.emergencyWithdraw = !globalState.emergencyWithdraw;
    }

    function toggleStaking() external onlyRole(EMERGENCY_ROLE) {
        globalState.stakingEnabled = !globalState.stakingEnabled;
    }
}
