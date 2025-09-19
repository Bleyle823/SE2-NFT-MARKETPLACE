// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Team Vesting - Time-locked Token Vesting
 * @dev vesting with multiple schedule types and role management
 */
contract TeamVesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant VESTING_MANAGER_ROLE = keccak256("VESTING_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    IERC20 public immutable token;

    // ===== VESTING DATA =====
    struct VestingSchedule {
        uint128 totalAmount; // Total tokens to vest
        uint128 released; // Tokens already released
        uint64 startTime; // Vesting start timestamp
        uint32 durationDays; // Vesting duration in days
        uint16 cliffDays; // Cliff period in days
        uint8 vestingType; // 0=linear, 1=stepped, 2=exponential
        bool active; // Schedule active status
    }

    mapping(address => VestingSchedule) private vestingSchedules;

    // ===== METRICS =====
    uint256 public totalVested;
    uint256 public totalReleased;
    uint256 public activeSchedules;

    // ===== EVENTS =====
    event VestingCreated(address indexed beneficiary, uint256 amount, uint32 duration);
    event TokensReleased(address indexed beneficiary, uint256 amount, uint256 remaining);
    event VestingRevoked(address indexed beneficiary, uint256 returned);

    constructor(address _token, address _admin) {
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VESTING_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
    }

    /**
     * @dev Create vesting schedule
     */
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint32 durationDays,
        uint16 cliffDays,
        uint8 vestingType
    ) external onlyRole(VESTING_MANAGER_ROLE) nonReentrant {
        require(beneficiary != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        require(durationDays > 0, "Zero duration");
        require(cliffDays <= durationDays, "Cliff > duration");
        require(vestingType <= 2, "Invalid type");
        require(!vestingSchedules[beneficiary].active, "Schedule exists");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: uint128(amount),
            released: 0,
            startTime: uint64(block.timestamp),
            durationDays: durationDays,
            cliffDays: cliffDays,
            vestingType: vestingType,
            active: true
        });

        // Update metrics with unchecked math (safe operations)
        unchecked {
            totalVested += amount;
            activeSchedules += 1;
        }

        emit VestingCreated(beneficiary, amount, durationDays);
    }

    /**
     * @dev release function
     */
    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.active, "No active schedule");

        uint256 releasable = _calculateReleasable(msg.sender);
        require(releasable > 0, "Nothing to release");

        // Update state with unchecked math (releasable is validated)
        unchecked {
            schedule.released += uint128(releasable);
            totalReleased += releasable;
        }

        token.safeTransfer(msg.sender, releasable);

        uint256 remaining = schedule.totalAmount - schedule.released;
        emit TokensReleased(msg.sender, releasable, remaining);
    }

    /**
     * @dev vested amount calculation
     */
    function _calculateReleasable(address beneficiary) internal view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

        if (!schedule.active) return 0;

        uint256 currentTime = block.timestamp;
        uint256 cliffTime = schedule.startTime + (uint256(schedule.cliffDays) * 1 days);

        if (currentTime < cliffTime) return 0;

        uint256 endTime = schedule.startTime + (uint256(schedule.durationDays) * 1 days);

        uint256 vestedAmount;

        if (currentTime >= endTime) {
            vestedAmount = schedule.totalAmount;
        } else {
            // Unchecked math for time calculations (safe with validated inputs)
            unchecked {
                uint256 timeVested = currentTime - schedule.startTime;
                uint256 totalTime = uint256(schedule.durationDays) * 1 days;

                if (schedule.vestingType == 0) {
                    // Linear
                    vestedAmount = (schedule.totalAmount * timeVested) / totalTime;
                } else if (schedule.vestingType == 1) {
                    // Stepped (monthly)
                    uint256 monthsVested = timeVested / (30 days);
                    uint256 totalMonths = schedule.durationDays / 30;
                    if (totalMonths == 0) totalMonths = 1; // Safety check
                    vestedAmount = (schedule.totalAmount * monthsVested) / totalMonths;
                } else {
                    // Exponential (front-loaded)
                    uint256 progress = (timeVested * 1e18) / totalTime;
                    uint256 curve = (progress * progress) / 1e18; // Quadratic curve
                    vestedAmount = (schedule.totalAmount * curve) / 1e18;
                }
            }
        }

        return vestedAmount - schedule.released;
    }

    /**
     * @dev Calculate releasable amount for beneficiary (view function)
     */
    function releasableAmount(address beneficiary) external view returns (uint256) {
        return _calculateReleasable(beneficiary);
    }

    /**
     * @dev Get vesting info for beneficiary
     */
    function getVestingInfo(
        address beneficiary
    ) external view returns (uint256 totalAmount, uint256 released, uint256 releasable, bool active) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

        return (schedule.totalAmount, schedule.released, _calculateReleasable(beneficiary), schedule.active);
    }
}
