// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IEventManagement
 * @dev Interface for event management contracts
 */
interface IEventFactory {
    struct EventParams {
        string name;
        string description;
        string imageUrl;
        string location;
        uint256 startTime;
        uint256 endTime;
        uint256 ticketPrice;
        uint256 maxAttendees;
        bool isVirtual;
        string[] tags;
    }

    event EventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string name,
        uint256 startTime,
        uint256 ticketPrice
    );

    function createEvent(EventParams calldata params) external returns (uint256 eventId);
    function getEvent(uint256 eventId) external view returns (EventParams memory);
    function getCreatorEvents(address creator) external view returns (uint256[] memory);
    function updateEvent(uint256 eventId, EventParams calldata params) external;
    function cancelEvent(uint256 eventId) external;
}

interface IEventManager {
    enum EventStatus {
        Created,
        Active,
        Paused,
        Cancelled,
        Completed
    }

    event EventStatusChanged(uint256 indexed eventId, EventStatus newStatus);
    event AttendeeCheckedIn(uint256 indexed eventId, address indexed attendee, uint256 ticketId);

    function startEvent(uint256 eventId) external;
    function pauseEvent(uint256 eventId) external;
    function completeEvent(uint256 eventId) external;
    function checkInAttendee(uint256 eventId, address attendee, uint256 ticketId) external;
    function getEventStatus(uint256 eventId) external view returns (EventStatus);
    function getEventAttendees(uint256 eventId) external view returns (address[] memory);
}

interface ITicketSales {
    struct SaleParams {
        uint256 eventId;
        uint256 price;
        uint256 maxSupply;
        uint256 maxPerWallet;
        uint256 saleStart;
        uint256 saleEnd;
        bool whitelistOnly;
    }

    event TicketSaleConfigured(uint256 indexed eventId, uint256 price, uint256 maxSupply);
    event TicketPurchased(uint256 indexed eventId, address indexed buyer, uint256 quantity, uint256 totalCost);

    function configureSale(SaleParams calldata params) external;
    function purchaseTickets(uint256 eventId, uint256 quantity) external payable;
    function purchaseWithRVFY(uint256 eventId, uint256 quantity) external;
    function getSaleInfo(uint256 eventId) external view returns (SaleParams memory);
    function getTicketsSold(uint256 eventId) external view returns (uint256);
}
