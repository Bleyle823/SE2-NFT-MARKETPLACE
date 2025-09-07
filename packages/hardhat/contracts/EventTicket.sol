// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EventTicket is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public tokenIdCounter;
    
    struct Event {
        uint256 eventId;
        string name;
        string description;
        string location;
        uint256 eventDate;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        address organizer;
        bool isActive;
        string imageUri;
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => uint256) public tokenToEvent; // tokenId => eventId
    mapping(address => bool) public eventOrganizers;
    
    uint256 public eventIdCounter;
    
    event EventCreated(uint256 indexed eventId, string name, address indexed organizer);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed to);
    event EventStatusChanged(uint256 indexed eventId, bool isActive);
    
    constructor() ERC721("EventTicket", "ETK") Ownable(msg.sender) {}
    
    function _baseURI() internal pure override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }
    
    modifier onlyOrganizer() {
        require(eventOrganizers[msg.sender] || msg.sender == owner(), "Not authorized organizer");
        _;
    }
    
    function addOrganizer(address organizer) external onlyOwner {
        eventOrganizers[organizer] = true;
    }
    
    function removeOrganizer(address organizer) external onlyOwner {
        eventOrganizers[organizer] = false;
    }
    
    function createEvent(
        string memory name,
        string memory description,
        string memory location,
        uint256 eventDate,
        uint256 ticketPrice,
        uint256 maxTickets,
        string memory imageUri
    ) external onlyOrganizer returns (uint256) {
        require(eventDate > block.timestamp, "Event date must be in the future");
        require(maxTickets > 0, "Max tickets must be greater than 0");
        
        eventIdCounter++;
        uint256 newEventId = eventIdCounter;
        
        events[newEventId] = Event({
            eventId: newEventId,
            name: name,
            description: description,
            location: location,
            eventDate: eventDate,
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            ticketsSold: 0,
            organizer: msg.sender,
            isActive: true,
            imageUri: imageUri
        });
        
        emit EventCreated(newEventId, name, msg.sender);
        return newEventId;
    }
    
    function mintTicket(uint256 eventId, string memory tokenUri) external payable nonReentrant returns (uint256) {
        Event storage eventData = events[eventId];
        require(eventData.isActive, "Event is not active");
        require(eventData.ticketsSold < eventData.maxTickets, "No tickets available");
        require(eventData.eventDate > block.timestamp, "Event has already occurred");
        require(msg.value >= eventData.ticketPrice, "Insufficient payment");
        
        tokenIdCounter++;
        uint256 tokenId = tokenIdCounter;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUri);
        tokenToEvent[tokenId] = eventId;
        
        eventData.ticketsSold++;
        
        // Transfer payment to event organizer
        if (eventData.ticketPrice > 0) {
            payable(eventData.organizer).transfer(eventData.ticketPrice);
        }
        
        emit TicketMinted(tokenId, eventId, msg.sender);
        return tokenId;
    }
    
    function setEventStatus(uint256 eventId, bool isActive) external onlyOrganizer {
        require(events[eventId].organizer == msg.sender, "Not the event organizer");
        events[eventId].isActive = isActive;
        emit EventStatusChanged(eventId, isActive);
    }
    
    function getEvent(uint256 eventId) external view returns (Event memory) {
        return events[eventId];
    }
    
    function getEventByToken(uint256 tokenId) external view returns (Event memory) {
        uint256 eventId = tokenToEvent[tokenId];
        return events[eventId];
    }
    
    function getAvailableTickets(uint256 eventId) external view returns (uint256) {
        Event memory eventData = events[eventId];
        return eventData.maxTickets - eventData.ticketsSold;
    }
    
    // Override functions from OpenZeppelin ERC721, ERC721Enumerable and ERC721URIStorage
    
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
