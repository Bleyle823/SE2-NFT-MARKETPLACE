// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventTicketNFT
 * @dev NFT-based event ticketing system with marketplace functionality
 */
contract EventTicketNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    uint256 public eventIdCounter;
    uint256 public ticketIdCounter;

    struct Event {
        uint256 id;
        string name;
        string description;
        uint256 eventDate;
        uint256 ticketPrice;
        uint256 maxSupply;
        uint256 soldTickets;
        address organizer;
        bool isActive;
        string imageCID; // IPFS CID for event image
    }

    struct Ticket {
        uint256 id;
        uint256 eventId;
        uint256 ticketNumber;
        string metadataURI;
    }

    struct MarketplaceListing {
        uint256 ticketId;
        address seller;
        uint256 price;
        bool isActive;
    }

    // Mappings
    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => MarketplaceListing) public marketplaceListings;
    mapping(uint256 => uint256) public ticketToEvent; // ticketId => eventId
    
    // Events
    event EventCreated(uint256 indexed eventId, string name, address indexed organizer, uint256 ticketPrice, uint256 maxSupply);
    event TicketMinted(uint256 indexed ticketId, uint256 indexed eventId, address indexed buyer, uint256 ticketNumber);
    event TicketListed(uint256 indexed ticketId, address indexed seller, uint256 price);
    event TicketSold(uint256 indexed ticketId, address indexed seller, address indexed buyer, uint256 price);
    event TicketListingCancelled(uint256 indexed ticketId, address indexed seller);

    constructor() ERC721("EventTicketNFT", "ETNFT") Ownable(msg.sender) {}

    /**
     * @dev Create a new event
     */
    function createEvent(
        string memory _name,
        string memory _description,
        uint256 _eventDate,
        uint256 _ticketPrice,
        uint256 _maxSupply,
        string memory _imageCID
    ) external returns (uint256) {
        require(_eventDate > block.timestamp, "Event date must be in the future");
        require(_ticketPrice > 0, "Ticket price must be greater than 0");
        require(_maxSupply > 0, "Max supply must be greater than 0");
        require(bytes(_name).length > 0, "Event name cannot be empty");

        eventIdCounter++;
        uint256 eventId = eventIdCounter;

        events[eventId] = Event({
            id: eventId,
            name: _name,
            description: _description,
            eventDate: _eventDate,
            ticketPrice: _ticketPrice,
            maxSupply: _maxSupply,
            soldTickets: 0,
            organizer: msg.sender,
            isActive: true,
            imageCID: _imageCID
        });

        emit EventCreated(eventId, _name, msg.sender, _ticketPrice, _maxSupply);
        return eventId;
    }

    /**
     * @dev Purchase a ticket for an event
     */
    function buyTicket(uint256 _eventId) external payable nonReentrant returns (uint256) {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.isActive, "Event is not active");
        require(eventInfo.soldTickets < eventInfo.maxSupply, "Event is sold out");
        require(msg.value >= eventInfo.ticketPrice, "Insufficient payment");
        require(block.timestamp < eventInfo.eventDate, "Event has already passed");

        ticketIdCounter++;
        uint256 ticketId = ticketIdCounter;
        uint256 ticketNumber = eventInfo.soldTickets + 1;

        // Update event sold tickets
        eventInfo.soldTickets++;

        // Create ticket with temporary metadata URI - will be updated by frontend
        tickets[ticketId] = Ticket({
            id: ticketId,
            eventId: _eventId,
            ticketNumber: ticketNumber,
            metadataURI: ""
        });

        ticketToEvent[ticketId] = _eventId;

        // Mint NFT to buyer
        _safeMint(msg.sender, ticketId);

        // Transfer payment to event organizer
        (bool success, ) = payable(eventInfo.organizer).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit TicketMinted(ticketId, _eventId, msg.sender, ticketNumber);
        return ticketId;
    }

    /**
     * @dev List a ticket for resale on the marketplace
     */
    function listTicket(uint256 _ticketId, uint256 _price) external {
        require(ownerOf(_ticketId) == msg.sender, "You don't own this ticket");
        require(_price > 0, "Price must be greater than 0");
        require(!marketplaceListings[_ticketId].isActive, "Ticket is already listed");

        // Check if event hasn't passed yet
        uint256 eventId = ticketToEvent[_ticketId];
        require(events[eventId].eventDate > block.timestamp, "Cannot sell tickets for past events");

        marketplaceListings[_ticketId] = MarketplaceListing({
            ticketId: _ticketId,
            seller: msg.sender,
            price: _price,
            isActive: true
        });

        emit TicketListed(_ticketId, msg.sender, _price);
    }

    /**
     * @dev Buy a ticket from the marketplace
     */
    function buyListedTicket(uint256 _ticketId) external payable nonReentrant {
        MarketplaceListing storage listing = marketplaceListings[_ticketId];
        require(listing.isActive, "Ticket is not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        require(ownerOf(_ticketId) == listing.seller, "Seller no longer owns the ticket");

        // Check if event hasn't passed yet
        uint256 eventId = ticketToEvent[_ticketId];
        require(events[eventId].eventDate > block.timestamp, "Cannot buy tickets for past events");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Deactivate listing
        listing.isActive = false;

        // Transfer ticket ownership
        _transfer(seller, msg.sender, _ticketId);

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit TicketSold(_ticketId, seller, msg.sender, price);
    }

    /**
     * @dev Cancel a marketplace listing
     */
    function cancelListing(uint256 _ticketId) external {
        MarketplaceListing storage listing = marketplaceListings[_ticketId];
        require(listing.seller == msg.sender, "You are not the seller");
        require(listing.isActive, "Listing is not active");

        listing.isActive = false;

        emit TicketListingCancelled(_ticketId, msg.sender);
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 _eventId) external view returns (Event memory) {
        return events[_eventId];
    }

    /**
     * @dev Get ticket details
     */
    function getTicket(uint256 _ticketId) external view returns (Ticket memory) {
        return tickets[_ticketId];
    }

    /**
     * @dev Get marketplace listing details
     */
    function getMarketplaceListing(uint256 _ticketId) external view returns (MarketplaceListing memory) {
        return marketplaceListings[_ticketId];
    }

    /**
     * @dev Get all events (for frontend display)
     */
    function getAllEvents() external view returns (Event[] memory) {
        Event[] memory allEvents = new Event[](eventIdCounter);
        for (uint256 i = 1; i <= eventIdCounter; i++) {
            allEvents[i - 1] = events[i];
        }
        return allEvents;
    }

    /**
     * @dev Get active marketplace listings
     */
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // First, count active listings
        for (uint256 i = 1; i <= ticketIdCounter; i++) {
            if (marketplaceListings[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array and populate
        uint256[] memory activeListings = new uint256[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= ticketIdCounter; i++) {
            if (marketplaceListings[i].isActive) {
                activeListings[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeListings;
    }

    /**
     * @dev Get tickets owned by an address for a specific event
     */
    function getTicketsByEventAndOwner(uint256 _eventId, address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory eventTickets = new uint256[](balance);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 ticketId = tokenOfOwnerByIndex(_owner, i);
            if (ticketToEvent[ticketId] == _eventId) {
                eventTickets[currentIndex] = ticketId;
                currentIndex++;
            }
        }
        
        // Resize array to actual size
        uint256[] memory result = new uint256[](currentIndex);
        for (uint256 i = 0; i < currentIndex; i++) {
            result[i] = eventTickets[i];
        }
        
        return result;
    }

    /**
     * @dev Update ticket metadata URI after IPFS upload
     */
    function updateTicketMetadata(uint256 _ticketId, string memory _metadataURI) external {
        require(ownerOf(_ticketId) == msg.sender, "You don't own this ticket");
        require(bytes(_metadataURI).length > 0, "Metadata URI cannot be empty");
        
        tickets[_ticketId].metadataURI = _metadataURI;
    }

    /**
     * @dev Override tokenURI to return ticket metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory metadataURI = tickets[tokenId].metadataURI;
        if (bytes(metadataURI).length > 0) {
            return string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", metadataURI));
        }
        
        // Fallback to generated URI if no IPFS metadata is set
        return _generateMetadataURI(tickets[tokenId].eventId, tickets[tokenId].ticketNumber);
    }

    /**
     * @dev Generate metadata URI for a ticket
     * In a real implementation, this would point to IPFS metadata
     */
    function _generateMetadataURI(uint256 _eventId, uint256 _ticketNumber) internal view returns (string memory) {
        // For MVP, we'll use a simple concatenation
        // In production, this would be an IPFS hash with proper JSON metadata
        return string(abi.encodePacked(
            "https://ipfs.io/ipfs/QmTicketMetadata",
            "/event/", 
            _toString(_eventId),
            "/ticket/",
            _toString(_ticketNumber)
        ));
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Emergency function to deactivate an event (only owner)
     */
    function deactivateEvent(uint256 _eventId) external onlyOwner {
        events[_eventId].isActive = false;
    }

    /**
     * @dev Override transfer functions to handle marketplace listings
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // If ticket is listed on marketplace and being transferred, cancel the listing
        if (marketplaceListings[tokenId].isActive) {
            marketplaceListings[tokenId].isActive = false;
            emit TicketListingCancelled(tokenId, marketplaceListings[tokenId].seller);
        }
        
        return super._update(to, tokenId, auth);
    }
}
