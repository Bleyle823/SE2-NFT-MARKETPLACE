// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../../interfaces/platform/IEventManagement.sol";
import "../../interfaces/core/IRovifyToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventFactory
 * @dev Factory contract for creating and managing events
 */
contract EventFactory is IEventFactory, AccessControl, ReentrancyGuard {
    // ===== ROLES =====
    bytes32 public constant EVENT_MANAGER_ROLE = keccak256("EVENT_MANAGER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ===== STATE VARIABLES =====
    IRovifyToken public immutable rovifyToken;
    uint256 private _eventIdCounter;

    // ===== STORAGE =====
    mapping(uint256 => EventParams) private events;
    mapping(uint256 => address) public eventCreators;
    mapping(address => uint256[]) private creatorEvents;
    mapping(uint256 => bool) public eventExists;
    mapping(uint256 => bool) public verifiedEvents;

    // ===== CONFIGURATION =====
    struct PlatformConfig {
        uint256 creationFee; // Fee to create event (in RVFY)
        uint256 platformFeeRate; // Basis points (e.g., 250 = 2.5%)
        uint256 minEventDuration; // Minimum event duration
        uint256 maxEventDuration; // Maximum event duration
        bool requireVerification; // Require events to be verified
    }

    PlatformConfig public config;

    // ===== EVENTS =====
    event EventUpdated(uint256 indexed eventId, address indexed creator);
    event EventVerified(uint256 indexed eventId, address indexed verifier);
    event PlatformConfigUpdated(uint256 creationFee, uint256 platformFeeRate);

    // ===== MODIFIERS =====
    modifier eventExistsModifier(uint256 eventId) {
        require(eventExists[eventId], "Event does not exist");
        _;
    }

    modifier onlyEventCreator(uint256 eventId) {
        require(eventCreators[eventId] == msg.sender, "Not event creator");
        _;
    }

    modifier validEventParams(EventParams calldata params) {
        require(bytes(params.name).length > 0, "Name required");
        require(params.startTime > block.timestamp, "Start time must be future");
        require(params.endTime > params.startTime, "End time must be after start");
        require(params.maxAttendees > 0, "Max attendees must be positive");

        uint256 duration = params.endTime - params.startTime;
        require(duration >= config.minEventDuration, "Event too short");
        require(duration <= config.maxEventDuration, "Event too long");
        _;
    }

    constructor(address _rovifyToken, address _admin) {
        rovifyToken = IRovifyToken(_rovifyToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EVENT_MANAGER_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);

        // Initialize platform configuration
        config = PlatformConfig({
            creationFee: 1000 * 10 ** 18, // 1000 RVFY
            platformFeeRate: 250, // 2.5%
            minEventDuration: 1 hours, // 1 hour minimum
            maxEventDuration: 30 days, // 30 days maximum
            requireVerification: false // Initially no verification required
        });

        _eventIdCounter = 1; // Start from ID 1
    }

    /**
     * @dev Create a new event
     */
    function createEvent(
        EventParams calldata params
    ) external validEventParams(params) nonReentrant returns (uint256 eventId) {
        // Charge creation fee
        if (config.creationFee > 0) {
            rovifyToken.transferFrom(msg.sender, address(this), config.creationFee);
        }

        eventId = _eventIdCounter;
        _eventIdCounter++;

        // Store event data
        events[eventId] = params;
        eventCreators[eventId] = msg.sender;
        creatorEvents[msg.sender].push(eventId);
        eventExists[eventId] = true;

        emit EventCreated(eventId, msg.sender, params.name, params.startTime, params.ticketPrice);
    }

    /**
     * @dev Update an existing event
     */
    function updateEvent(
        uint256 eventId,
        EventParams calldata params
    ) external eventExistsModifier(eventId) onlyEventCreator(eventId) validEventParams(params) nonReentrant {
        // Prevent updates too close to event start
        require(block.timestamp < events[eventId].startTime - 1 hours, "Too close to event start");

        events[eventId] = params;
        emit EventUpdated(eventId, msg.sender);
    }

    /**
     * @dev Cancel an event
     */
    function cancelEvent(uint256 eventId) external eventExistsModifier(eventId) onlyEventCreator(eventId) nonReentrant {
        require(block.timestamp < events[eventId].startTime, "Event already started");

        // Mark as cancelled by setting endTime to 0
        events[eventId].endTime = 0;

        emit EventUpdated(eventId, msg.sender);
    }

    /**
     * @dev Verify an event (admin/verifier only)
     */
    function verifyEvent(uint256 eventId) external eventExistsModifier(eventId) onlyRole(VERIFIER_ROLE) {
        verifiedEvents[eventId] = true;
        emit EventVerified(eventId, msg.sender);
    }

    /**
     * @dev Update platform configuration
     */
    function updatePlatformConfig(PlatformConfig calldata newConfig) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newConfig.platformFeeRate <= 1000, "Fee rate too high"); // Max 10%
        require(newConfig.minEventDuration <= newConfig.maxEventDuration, "Invalid duration range");

        config = newConfig;
        emit PlatformConfigUpdated(newConfig.creationFee, newConfig.platformFeeRate);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get event details
     */
    function getEvent(uint256 eventId) external view eventExistsModifier(eventId) returns (EventParams memory) {
        return events[eventId];
    }

    /**
     * @dev Get all events created by a creator
     */
    function getCreatorEvents(address creator) external view returns (uint256[] memory) {
        return creatorEvents[creator];
    }

    /**
     * @dev Get current event ID counter
     */
    function getCurrentEventId() external view returns (uint256) {
        return _eventIdCounter;
    }

    /**
     * @dev Check if event is verified
     */
    function isEventVerified(uint256 eventId) external view eventExistsModifier(eventId) returns (bool) {
        return verifiedEvents[eventId];
    }

    /**
     * @dev Get platform configuration
     */
    function getPlatformConfig() external view returns (PlatformConfig memory) {
        return config;
    }

    /**
     * @dev Get multiple events in batch
     */
    function getEventsBatch(uint256[] calldata eventIds) external view returns (EventParams[] memory results) {
        results = new EventParams[](eventIds.length);

        for (uint256 i = 0; i < eventIds.length; i++) {
            if (eventExists[eventIds[i]]) {
                results[i] = events[eventIds[i]];
            }
        }
    }

    /**
     * @dev Get events by time range
     */
    function getEventsByTimeRange(
        uint256 startTime,
        uint256 endTime
    ) external view returns (uint256[] memory eventIds) {
        uint256 currentId = _eventIdCounter;
        uint256[] memory tempIds = new uint256[](currentId);
        uint256 count = 0;

        for (uint256 i = 1; i < currentId; i++) {
            if (eventExists[i]) {
                EventParams memory eventData = events[i];
                if (eventData.startTime >= startTime && eventData.startTime <= endTime) {
                    tempIds[count] = i;
                    count++;
                }
            }
        }

        // Copy to correctly sized array
        eventIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            eventIds[i] = tempIds[i];
        }
    }

    /**
     * @dev Search events by tags
     */
    function getEventsByTag(string calldata tag) external view returns (uint256[] memory eventIds) {
        uint256 currentId = _eventIdCounter;
        uint256[] memory tempIds = new uint256[](currentId);
        uint256 count = 0;

        for (uint256 i = 1; i < currentId; i++) {
            if (eventExists[i]) {
                EventParams memory eventData = events[i];
                for (uint256 j = 0; j < eventData.tags.length; j++) {
                    if (keccak256(bytes(eventData.tags[j])) == keccak256(bytes(tag))) {
                        tempIds[count] = i;
                        count++;
                        break;
                    }
                }
            }
        }

        // Copy to correctly sized array
        eventIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            eventIds[i] = tempIds[i];
        }
    }
}
