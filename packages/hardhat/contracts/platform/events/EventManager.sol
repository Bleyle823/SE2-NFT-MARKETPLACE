// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/platform/IEventManagement.sol";
import "../../interfaces/nft/ITicketNFT.sol";

/**
 * @title EventManager
 * @dev event lifecycle mgmnt
 * @notice Handles event status transitions, check-ins, and real-time attendee tracking
 */
contract EventManager is AccessControl, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    enum EventStatus {
        Created,
        Active,
        Paused,
        Cancelled,
        Completed
    }

    struct EventState {
        uint128 attendeeCount; // Current checked-in attendees
        uint64 statusChangeTime; // Last status change timestamp
        uint32 maxAttendees; // Maximum allowed attendees
        uint8 status; // EventStatus enum (0-4)
        bool checkInEnabled; // Check-in functionality toggle
        // Slot 1: 16 + 8 + 4 + 1 + 1 = 30 bytes (2 bytes unused)
    }

    struct CheckInData {
        uint128 checkInTime; // When attendee checked in
        uint128 ticketId; // Associated ticket NFT ID
        // Slot 1: 16 + 16 = 32 bytes (perfect slot utilization)
    }

    // Mappings
    mapping(uint256 => EventState) public eventStates;
    mapping(uint256 => mapping(address => CheckInData)) public attendeeCheckIns;
    mapping(uint256 => address[]) public eventAttendees;

    // Rate limiting for anti-bot protection
    mapping(address => uint256) public lastActionTime;
    uint256 public constant MIN_ACTION_INTERVAL = 2 seconds;

    // Events
    event EventStatusChanged(uint256 indexed eventId, EventStatus oldStatus, EventStatus newStatus, address operator);
    event AttendeeCheckedIn(
        uint256 indexed eventId,
        address indexed attendee,
        uint256 indexed ticketId,
        uint256 timestamp
    );
    event BatchCheckInCompleted(uint256 indexed eventId, uint256 attendeeCount, uint256 gasUsed);
    event MaxAttendeesUpdated(uint256 indexed eventId, uint32 oldMax, uint32 newMax);

    error EventNotFound();
    error InvalidStatusTransition();
    error CheckInDisabled();
    error MaxAttendeesReached();
    error AttendeeAlreadyCheckedIn();
    error InvalidTicketForEvent();
    error UnauthorizedTicketHolder();
    error RateLimitExceeded();
    error InvalidBatchSize();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
    }

    /**
     * @dev Initialize event state when created by EventFactory
     * @param eventId Unique event identifier
     * @param maxAttendees Maximum number of attendees allowed
     */
    function initializeEvent(uint256 eventId, uint32 maxAttendees) external onlyRole(OPERATOR_ROLE) {
        require(eventStates[eventId].statusChangeTime == 0, "Event already initialized");

        eventStates[eventId] = EventState({
            attendeeCount: 0,
            statusChangeTime: uint64(block.timestamp),
            maxAttendees: maxAttendees,
            status: uint8(EventStatus.Created),
            checkInEnabled: false
        });

        emit EventStatusChanged(eventId, EventStatus.Created, EventStatus.Created, msg.sender);
    }

    /**
     * @dev Start event and enable check-ins
     * @param eventId Event to start
     */
    function startEvent(uint256 eventId) external onlyRole(OPERATOR_ROLE) {
        EventState storage state = eventStates[eventId];
        require(state.statusChangeTime != 0, "Event not found");
        require(state.status == uint8(EventStatus.Created), "Invalid status transition");

        uint256 gasStart = gasleft();

        unchecked {
            state.status = uint8(EventStatus.Active);
            state.statusChangeTime = uint64(block.timestamp);
            state.checkInEnabled = true;
        }

        uint256 gasUsed = gasStart - gasleft();
        emit EventStatusChanged(eventId, EventStatus.Created, EventStatus.Active, msg.sender);

        // Gas optimization tracking for continuous improvement
        if (gasUsed > 50000) {
            // Log for optimization review if gas usage is high
            emit BatchCheckInCompleted(eventId, 0, gasUsed);
        }
    }

    /**
     * @dev Pause event (emergency scenarios)
     * @param eventId Event to pause
     */
    function pauseEvent(uint256 eventId) external onlyRole(EMERGENCY_ROLE) {
        EventState storage state = eventStates[eventId];
        require(state.status == uint8(EventStatus.Active), "Can only pause active events");

        unchecked {
            state.status = uint8(EventStatus.Paused);
            state.statusChangeTime = uint64(block.timestamp);
            state.checkInEnabled = false;
        }

        emit EventStatusChanged(eventId, EventStatus.Active, EventStatus.Paused, msg.sender);
    }

    /**
     * @dev Resume paused event
     * @param eventId Event to resume
     */
    function resumeEvent(uint256 eventId) external onlyRole(OPERATOR_ROLE) {
        EventState storage state = eventStates[eventId];
        require(state.status == uint8(EventStatus.Paused), "Can only resume paused events");

        unchecked {
            state.status = uint8(EventStatus.Active);
            state.statusChangeTime = uint64(block.timestamp);
            state.checkInEnabled = true;
        }

        emit EventStatusChanged(eventId, EventStatus.Paused, EventStatus.Active, msg.sender);
    }

    /**
     * @dev Complete event and finalize attendance
     * @param eventId Event to complete
     */
    function completeEvent(uint256 eventId) external onlyRole(OPERATOR_ROLE) {
        EventState storage state = eventStates[eventId];
        require(
            state.status == uint8(EventStatus.Active) || state.status == uint8(EventStatus.Paused),
            "Invalid status for completion"
        );

        unchecked {
            state.status = uint8(EventStatus.Completed);
            state.statusChangeTime = uint64(block.timestamp);
            state.checkInEnabled = false;
        }

        emit EventStatusChanged(eventId, EventStatus(state.status), EventStatus.Completed, msg.sender);
    }

    /**
     * @dev Cancel event (emergency or creator decision)
     * @param eventId Event to cancel
     */
    function cancelEvent(uint256 eventId) external onlyRole(EMERGENCY_ROLE) {
        EventState storage state = eventStates[eventId];
        require(state.status != uint8(EventStatus.Completed), "Cannot cancel completed event");
        require(state.status != uint8(EventStatus.Cancelled), "Event already cancelled");

        EventStatus oldStatus = EventStatus(state.status);

        unchecked {
            state.status = uint8(EventStatus.Cancelled);
            state.statusChangeTime = uint64(block.timestamp);
            state.checkInEnabled = false;
        }

        emit EventStatusChanged(eventId, oldStatus, EventStatus.Cancelled, msg.sender);
    }

    /**
     * @dev Check in single attendee with QR code verification
     * @param eventId Event ID
     * @param attendee Attendee address
     * @param ticketId NFT ticket ID for verification
     */
    function checkInAttendee(
        uint256 eventId,
        address attendee,
        uint256 ticketId
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        // Rate limiting protection
        require(block.timestamp >= lastActionTime[msg.sender] + MIN_ACTION_INTERVAL, "Rate limit exceeded");
        lastActionTime[msg.sender] = block.timestamp;

        EventState storage state = eventStates[eventId];
        require(state.checkInEnabled, "Check-in disabled");
        require(state.attendeeCount < state.maxAttendees, "Max attendees reached");
        require(attendeeCheckIns[eventId][attendee].checkInTime == 0, "Already checked in");

        // Verify ticket ownership and validity
        // TODO: Integrate with TicketNFT contract for verification
        // ITicketNFT ticketContract = ITicketNFT(ticketNFTAddress);
        // require(ticketContract.ownerOf(ticketId) == attendee, "Invalid ticket holder");
        // require(ticketContract.getEventId(ticketId) == eventId, "Ticket not for this event");

        uint256 gasStart = gasleft();

        // Update state
        unchecked {
            state.attendeeCount += 1;
            attendeeCheckIns[eventId][attendee] = CheckInData({
                checkInTime: uint128(block.timestamp),
                ticketId: uint128(ticketId)
            });
        }

        eventAttendees[eventId].push(attendee);

        uint256 gasUsed = gasStart - gasleft();
        emit AttendeeCheckedIn(eventId, attendee, ticketId, block.timestamp);

        // Track gas usage for optimization
        if (gasUsed > 35000) {
            emit BatchCheckInCompleted(eventId, 1, gasUsed);
        }
    }

    /**
     * @dev Batch check-in for efficient mass processing
     * @param eventId Event ID
     * @param attendees Array of attendee addresses
     * @param ticketIds Array of corresponding ticket IDs
     */
    function batchCheckIn(
        uint256 eventId,
        address[] calldata attendees,
        uint256[] calldata ticketIds
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(attendees.length == ticketIds.length, "Array length mismatch");
        require(attendees.length <= 50, "Batch too large"); // Gas limit protection
        require(attendees.length > 0, "Empty batch");

        EventState storage state = eventStates[eventId];
        require(state.checkInEnabled, "Check-in disabled");

        uint256 gasStart = gasleft();
        uint256 successfulCheckIns = 0;

        for (uint256 i = 0; i < attendees.length; ) {
            address attendee = attendees[i];
            uint256 ticketId = ticketIds[i];

            // Skip if already checked in or invalid
            if (attendeeCheckIns[eventId][attendee].checkInTime == 0 && state.attendeeCount < state.maxAttendees) {
                unchecked {
                    state.attendeeCount += 1;
                    attendeeCheckIns[eventId][attendee] = CheckInData({
                        checkInTime: uint128(block.timestamp),
                        ticketId: uint128(ticketId)
                    });
                    successfulCheckIns += 1;
                }

                eventAttendees[eventId].push(attendee);
                emit AttendeeCheckedIn(eventId, attendee, ticketId, block.timestamp);
            }

            unchecked {
                ++i;
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit BatchCheckInCompleted(eventId, successfulCheckIns, gasUsed);
    }

    /**
     * @dev Update maximum attendees (before event starts)
     * @param eventId Event ID
     * @param newMaxAttendees New maximum attendee count
     */
    function updateMaxAttendees(uint256 eventId, uint32 newMaxAttendees) external onlyRole(OPERATOR_ROLE) {
        EventState storage state = eventStates[eventId];
        require(state.status == uint8(EventStatus.Created), "Can only update before event starts");
        require(newMaxAttendees >= state.attendeeCount, "Cannot set below current attendance");

        uint32 oldMax = state.maxAttendees;
        state.maxAttendees = newMaxAttendees;

        emit MaxAttendeesUpdated(eventId, oldMax, newMaxAttendees);
    }

    // VIEW FUNCTIONS

    /**
     * @dev Get complete event state
     * @param eventId Event ID
     * @return Event state struct
     */
    function getEventState(uint256 eventId) external view returns (EventState memory) {
        return eventStates[eventId];
    }

    /**
     * @dev Get attendee check-in data
     * @param eventId Event ID
     * @param attendee Attendee address
     * @return Check-in data struct
     */
    function getAttendeeCheckIn(uint256 eventId, address attendee) external view returns (CheckInData memory) {
        return attendeeCheckIns[eventId][attendee];
    }

    /**
     * @dev Get all checked-in attendees for an event
     * @param eventId Event ID
     * @return Array of attendee addresses
     */
    function getEventAttendees(uint256 eventId) external view returns (address[] memory) {
        return eventAttendees[eventId];
    }

    /**
     * @dev Check if attendee is checked in
     * @param eventId Event ID
     * @param attendee Attendee address
     * @return True if checked in
     */
    function isAttendeeCheckedIn(uint256 eventId, address attendee) external view returns (bool) {
        return attendeeCheckIns[eventId][attendee].checkInTime > 0;
    }

    /**
     * @dev Get event attendance statistics
     * @param eventId Event ID
     * @return attendeeCount Current attendees
     * @return maxAttendees Maximum allowed
     * @return attendanceRate Percentage (basis points)
     */
    function getAttendanceStats(
        uint256 eventId
    ) external view returns (uint256 attendeeCount, uint256 maxAttendees, uint256 attendanceRate) {
        EventState memory state = eventStates[eventId];
        attendeeCount = state.attendeeCount;
        maxAttendees = state.maxAttendees;

        if (maxAttendees > 0) {
            unchecked {
                attendanceRate = (attendeeCount * 10000) / maxAttendees;
            }
        }
    }
}
