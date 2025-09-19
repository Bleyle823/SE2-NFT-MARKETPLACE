// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IRovifyToken
 * @dev Interface for the Rovify Token contract
 */
interface IRovifyToken is IERC20 {
    // Events
    event TokensBurned(uint256 amount, uint256 newTotal);
    event BurnContractUpdated(address indexed oldContract, address indexed newContract);
    event EmergencyModeToggled(bool enabled);

    // Core functions
    function burnTokens(uint256 amount) external;
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external;
    function setBurnContract(address _burnContract) external;

    // Emergency controls
    function pause() external;
    function unpause() external;
    function toggleEmergencyMode() external;

    // View functions
    function getTokenMetrics()
        external
        view
        returns (
            uint256 currentSupply,
            uint256 totalBurned,
            uint256 burnCount,
            uint256 lastBurnTime,
            bool emergencyMode
        );

    // Immutable addresses
    function treasury() external view returns (address);
    function ecosystem() external view returns (address);
    function teamVesting() external view returns (address);
    function burnContract() external view returns (address);
}
