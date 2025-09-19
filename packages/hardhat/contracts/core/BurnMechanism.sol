// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/RovifyToken.sol";

/**
 * @title Burn Mechanism - Automated Token Burning
 * @dev automated burning of platform fees
 */
contract BurnMechanism is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant BURN_MANAGER_ROLE = keccak256("BURN_MANAGER_ROLE");
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    RovifyToken public immutable token;

    // ===== CONFIG =====
    struct BurnConfiguration {
        uint128 totalBurned; // Total tokens burned
        uint128 feesCollected; // Total fees collected
        uint64 lastBurnTime; // Last burn timestamp
        uint32 burnInterval; // Burn frequency (seconds)
        uint16 burnPercentage; // Burn percentage (basis points)
        uint16 minBurnThousands; // Minimum burn (in thousands of tokens)
        bool autoBurnEnabled; // Auto-burn toggle
        bool emergencyStop; // Emergency stop switch
    }

    BurnConfiguration public config;

    // ===== METRICS =====
    uint256 public burnEvents;
    uint256 public avgBurnAmount;

    // ===== EVENTS =====
    event AutoBurnExecuted(uint256 amount, uint256 timestamp, uint256 gasUsed);
    event BurnConfigurationUpdated(uint256 interval, uint256 percentage);
    event EmergencyStopToggled(bool enabled);

    constructor(address _token, address _admin) {
        token = RovifyToken(_token);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(BURN_MANAGER_ROLE, _admin);
        _grantRole(CONFIG_ROLE, _admin);

        // Initialize with gas-efficient defaults
        config = BurnConfiguration({
            totalBurned: 0,
            feesCollected: 0,
            lastBurnTime: uint64(block.timestamp),
            burnInterval: 7 days,
            burnPercentage: 2500, // 25%
            minBurnThousands: 1000, // 1M tokens
            autoBurnEnabled: true,
            emergencyStop: false
        });
    }

    /**
     * @dev auto-burn execution
     */
    function executeAutoBurn() external nonReentrant returns (uint256 burnAmount) {
        require(config.autoBurnEnabled && !config.emergencyStop, "Auto-burn disabled");
        require(block.timestamp >= config.lastBurnTime + config.burnInterval, "Too early");

        uint256 gasStart = gasleft();
        uint256 contractBalance = token.balanceOf(address(this));
        uint256 minBurn = uint256(config.minBurnThousands) * 1000 * 10 ** 18;

        require(contractBalance >= minBurn, "Below minimum threshold");

        // Calculate burn amount with unchecked math (safe with validated inputs)
        unchecked {
            burnAmount = (contractBalance * config.burnPercentage) / 10000;

            // Update configuration in single SSTORE
            config.totalBurned += uint128(burnAmount);
            config.lastBurnTime = uint64(block.timestamp);

            // Update metrics
            burnEvents += 1;
            avgBurnAmount = (avgBurnAmount * (burnEvents - 1) + burnAmount) / burnEvents;
        }

        // Execute burn
        token.burnTokens(burnAmount);

        // Transfer remaining fees to treasury with unchecked math
        uint256 remainingFees = contractBalance - burnAmount;
        if (remainingFees > 0) {
            IERC20(address(token)).safeTransfer(token.treasury(), remainingFees);
            unchecked {
                config.feesCollected += uint128(remainingFees);
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit AutoBurnExecuted(burnAmount, block.timestamp, gasUsed);
    }

    /**
     * @dev Batch update configuration (single transaction)
     */
    function updateConfigurationBatch(
        uint32 interval,
        uint16 percentage,
        uint16 minThousands,
        bool autoEnabled
    ) external onlyRole(CONFIG_ROLE) {
        require(percentage <= 5000, "Max 50%");
        require(interval >= 1 days, "Min 1 day");

        config.burnInterval = interval;
        config.burnPercentage = percentage;
        config.minBurnThousands = minThousands;
        config.autoBurnEnabled = autoEnabled;

        emit BurnConfigurationUpdated(interval, percentage);
    }

    /**
     * @dev View functions
     */
    function canExecuteBurn() external view returns (bool executable, uint256 nextBurnTime, uint256 burnAmount) {
        nextBurnTime = config.lastBurnTime + config.burnInterval;
        executable = block.timestamp >= nextBurnTime && config.autoBurnEnabled && !config.emergencyStop;

        if (executable) {
            uint256 balance = token.balanceOf(address(this));
            uint256 minBurn = uint256(config.minBurnThousands) * 1000 * 10 ** 18;

            if (balance >= minBurn) {
                unchecked {
                    burnAmount = (balance * config.burnPercentage) / 10000;
                }
            } else {
                executable = false;
            }
        }
    }

    /**
     * @dev Gas-efficient metrics getter
     */
    function getBurnMetrics()
        external
        view
        returns (
            uint256 totalBurned,
            uint256 feesCollected,
            uint256 burnEvents_,
            uint256 avgBurnAmount_,
            uint256 lastBurnTime,
            bool autoBurnEnabled
        )
    {
        return (
            config.totalBurned,
            config.feesCollected,
            burnEvents,
            avgBurnAmount,
            config.lastBurnTime,
            config.autoBurnEnabled
        );
    }
}
