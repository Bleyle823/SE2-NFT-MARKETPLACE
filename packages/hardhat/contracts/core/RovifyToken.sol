// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Rovify Token (RVFY) - Core ERC20 Token
 * @dev ERC20 token with burn mechanism and RBAC
 * @author Rovify Team
 */
contract RovifyToken is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // ===== PACKED STORAGE =====
    struct TokenMetrics {
        uint128 totalBurned; // Total tokens burned
        uint128 maxSupply; // Maximum token supply
        uint64 lastBurnTime; // Last burn execution
        uint32 burnCount; // Number of burns executed
        bool emergencyMode; // Emergency pause state
    }

    TokenMetrics public metrics;

    // ===== CONSTANTS =====
    uint256 private constant INITIAL_SUPPLY = 7_500_000_000 * 10 ** 18; // 7.5B
    uint256 private constant TREASURY_PERCENT = 40;
    uint256 private constant ECOSYSTEM_PERCENT = 30;
    uint256 private constant TEAM_PERCENT = 20;
    uint256 private constant LIQUIDITY_PERCENT = 10;

    // ===== ADDRESSES =====
    address public immutable treasury;
    address public immutable ecosystem;
    address public immutable teamVesting;
    address public burnContract;

    // ===== EVENTS =====
    event TokensBurned(uint256 amount, uint256 newTotal);
    event BurnContractUpdated(address indexed oldContract, address indexed newContract);
    event EmergencyModeToggled(bool enabled);

    // ===== MODIFIERS =====
    modifier notInEmergency() {
        require(!metrics.emergencyMode, "Emergency mode active");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Zero address");
        _;
    }

    constructor(
        address _treasury,
        address _ecosystem,
        address _teamVesting,
        address _admin
    )
        ERC20("Rovify Token", "RVFY")
        validAddress(_treasury)
        validAddress(_ecosystem)
        validAddress(_teamVesting)
        validAddress(_admin)
    {
        treasury = _treasury;
        ecosystem = _ecosystem;
        teamVesting = _teamVesting;

        // Initialize metrics (single SSTORE)
        metrics = TokenMetrics({
            totalBurned: 0,
            maxSupply: uint128(INITIAL_SUPPLY),
            lastBurnTime: uint64(block.timestamp),
            burnCount: 0,
            emergencyMode: false
        });

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ROLE, _admin);
        _grantRole(TREASURY_ROLE, _treasury);
        _grantRole(PAUSER_ROLE, _admin);

        // init distribution
        unchecked {
            uint256 treasuryAmount = (INITIAL_SUPPLY * TREASURY_PERCENT) / 100;
            uint256 ecosystemAmount = (INITIAL_SUPPLY * ECOSYSTEM_PERCENT) / 100;
            uint256 teamAmount = (INITIAL_SUPPLY * TEAM_PERCENT) / 100;
            uint256 liquidityAmount = INITIAL_SUPPLY - treasuryAmount - ecosystemAmount - teamAmount;

            _mint(_treasury, treasuryAmount);
            _mint(_ecosystem, ecosystemAmount);
            _mint(_teamVesting, teamAmount);
            _mint(_admin, liquidityAmount);
        }
    }

    /**
     * @dev burn function with unchecked math
     */
    function burnTokens(uint256 amount) external onlyRole(BURNER_ROLE) notInEmergency nonReentrant {
        require(amount > 0, "Zero amount");
        require(balanceOf(address(this)) >= amount, "Insufficient balance");

        // Safe to use unchecked - we verified amount > 0 and sufficient balance
        unchecked {
            metrics.totalBurned += uint128(amount);
            metrics.burnCount += 1;
            metrics.lastBurnTime = uint64(block.timestamp);
        }

        _burn(address(this), amount);
        emit TokensBurned(amount, metrics.totalBurned);
    }

    /**
     * @dev Batch operations
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external notInEmergency {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= 100, "Too many recipients"); // Gas limit protection

        uint256 totalAmount;

        // Calculate total in unchecked block (safe with length limit)
        unchecked {
            for (uint256 i = 0; i < recipients.length; ++i) {
                totalAmount += amounts[i];
            }
        }

        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance");

        // Execute transfers
        for (uint256 i = 0; i < recipients.length; ) {
            _transfer(msg.sender, recipients[i], amounts[i]);
            unchecked {
                ++i;
            } // Safe increment
        }
    }

    /**
     * @dev Set burn contract with role-based access
     */
    function setBurnContract(address _burnContract) external onlyRole(GOVERNANCE_ROLE) validAddress(_burnContract) {
        address oldContract = burnContract;
        burnContract = _burnContract;

        // Update roles atomically
        if (oldContract != address(0)) {
            _revokeRole(BURNER_ROLE, oldContract);
        }
        _grantRole(BURNER_ROLE, _burnContract);

        emit BurnContractUpdated(oldContract, _burnContract);
    }

    /**
     * @dev Emergency controls with proper role management
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function toggleEmergencyMode() external onlyRole(GOVERNANCE_ROLE) {
        metrics.emergencyMode = !metrics.emergencyMode;
        emit EmergencyModeToggled(metrics.emergencyMode);
    }

    /**
     * @dev Gas-efficient batch getter
     */
    function getTokenMetrics()
        external
        view
        returns (
            uint256 currentSupply,
            uint256 totalBurned,
            uint256 burnCount,
            uint256 lastBurnTime,
            bool emergencyMode
        )
    {
        return (totalSupply(), metrics.totalBurned, metrics.burnCount, metrics.lastBurnTime, metrics.emergencyMode);
    }

    /**
     * @dev Override transfer with optimizations
     */
    function _update(address from, address to, uint256 amount) internal override(ERC20) whenNotPaused notInEmergency {
        super._update(from, to, amount);
    }

    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
