// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../../interfaces/nft/ITicketNFT.sol";
import "../../interfaces/core/IRovifyToken.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EventTicketNFT
 * @dev NFT tickets for events
 */
contract EventTicketNFT is IEventTicketNFT, ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, ReentrancyGuard {
    using Strings for uint256;

    // ===== ROLES =====
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ===== STATE VARIABLES =====
    IRovifyToken public immutable rovifyToken;
    uint256 private _tokenIdCounter;

    // ===== STORAGE =====
    mapping(uint256 => TicketMetadata) private ticketMetadata;
    mapping(uint256 => uint256[]) private eventTickets; // eventId => tokenIds
    mapping(uint256 => bool) private usedTickets;
    mapping(uint256 => string) private customTokenURIs;

    // ===== CONFIGURATION =====
    struct PlatformConfig {
        uint256 transferFee; // Fee for secondary transfers (in RVFY)
        uint256 royaltyRate; // Royalty rate for secondary sales (basis points)
        bool transfersEnabled; // Global transfer toggle
        string baseTokenURI; // Base URI for token metadata
    }

    PlatformConfig public config;

    // ===== EVENTS =====
    event TicketTransferabilityChanged(uint256 indexed tokenId, bool transferable);
    event TransferFeeCollected(uint256 indexed tokenId, uint256 fee);

    constructor(
        address _rovifyToken,
        address _admin,
        string memory _baseTokenURI
    ) ERC721("Rovify Event Ticket", "RET") {
        rovifyToken = IRovifyToken(_rovifyToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);

        config = PlatformConfig({
            transferFee: 10 * 10 ** 18, // 10 RVFY
            royaltyRate: 250, // 2.5%
            transfersEnabled: true,
            baseTokenURI: _baseTokenURI
        });

        _tokenIdCounter = 1; // Start from ID 1
    }

    /**
     * @dev Mint a new ticket NFT
     */
    function mintTicket(
        address to,
        uint256 eventId,
        string calldata ticketType,
        bool isTransferable
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256 ticketTokenId) {
        require(to != address(0), "Cannot mint to zero address");
        require(eventId > 0, "Invalid event ID");
        require(bytes(ticketType).length > 0, "Ticket type required");

        ticketTokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Store ticket metadata
        ticketMetadata[ticketTokenId] = TicketMetadata({
            eventId: eventId,
            originalPurchaser: to,
            purchaseTime: block.timestamp,
            seatNumber: 0, // Can be set later
            ticketType: ticketType,
            isTransferable: isTransferable,
            isUsed: false
        });

        // Add to event tickets
        eventTickets[eventId].push(ticketTokenId);

        // Mint NFT
        _safeMint(to, ticketTokenId);

        // Generate and set token URI
        string memory generatedURI = _generateTokenURI(ticketTokenId);
        _setTokenURI(ticketTokenId, generatedURI);

        emit TicketMinted(ticketTokenId, eventId, to, ticketType);
    }

    /**
     * @dev Use a ticket (mark as used)
     */
    function useTicket(uint256 tokenId) external nonReentrant {
        require(_tokenExists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender || hasRole(OPERATOR_ROLE, msg.sender), "Not authorized to use ticket");
        require(!usedTickets[tokenId], "Ticket already used");

        usedTickets[tokenId] = true;
        ticketMetadata[tokenId].isUsed = true;

        emit TicketUsed(tokenId, ticketMetadata[tokenId].eventId, msg.sender);
    }

    /**
     * @dev Set ticket transferability
     */
    function setTicketTransferability(uint256 tokenId, bool transferable) external onlyRole(OPERATOR_ROLE) {
        require(_tokenExists(tokenId), "Token does not exist");

        ticketMetadata[tokenId].isTransferable = transferable;
        emit TicketTransferabilityChanged(tokenId, transferable);
    }

    /**
     * @dev Set seat number for ticket
     */
    function setSeatNumber(uint256 tokenId, uint256 seatNumber) external onlyRole(OPERATOR_ROLE) {
        require(_tokenExists(tokenId), "Token does not exist");
        ticketMetadata[tokenId].seatNumber = seatNumber;
    }

    /**
     * @dev Override _update to handle restrictions and fees (replaces _beforeTokenTransfer in v5)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        // Skip checks for minting and burning
        if (from != address(0) && to != address(0)) {
            require(config.transfersEnabled, "Transfers disabled");
            require(ticketMetadata[tokenId].isTransferable, "Ticket not transferable");
            require(!usedTickets[tokenId], "Cannot transfer used ticket");

            // Collect transfer fee (if applicable)
            if (config.transferFee > 0) {
                rovifyToken.transferFrom(from, address(this), config.transferFee);
                emit TransferFeeCollected(tokenId, config.transferFee);
            }
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Check if token exists (replaces deprecated _exists in v5)
     */
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Generate dynamic token URI
     */
    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        TicketMetadata memory metadata = ticketMetadata[tokenId];

        // Create JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name": "Event Ticket #',
                tokenId.toString(),
                '", "description": "Rovify Event Ticket for Event #',
                metadata.eventId.toString(),
                '", "image": "',
                config.baseTokenURI,
                "/images/",
                tokenId.toString(),
                ".png",
                '", "attributes": [',
                '{"trait_type": "Event ID", "value": "',
                metadata.eventId.toString(),
                '"},',
                '{"trait_type": "Ticket Type", "value": "',
                metadata.ticketType,
                '"},',
                '{"trait_type": "Purchase Time", "value": "',
                metadata.purchaseTime.toString(),
                '"},',
                '{"trait_type": "Transferable", "value": "',
                metadata.isTransferable ? "true" : "false",
                '"},',
                '{"trait_type": "Used", "value": "',
                metadata.isUsed ? "true" : "false",
                '"}'
            )
        );

        if (metadata.seatNumber > 0) {
            json = string(
                abi.encodePacked(
                    json,
                    ', {"trait_type": "Seat Number", "value": "',
                    metadata.seatNumber.toString(),
                    '"}'
                )
            );
        }

        json = string(abi.encodePacked(json, "]}"));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @dev Update platform configuration
     */
    function updateConfig(PlatformConfig calldata newConfig) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newConfig.royaltyRate <= 1000, "Royalty rate too high"); // Max 10%
        config = newConfig;
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get ticket metadata
     */
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory) {
        require(_tokenExists(tokenId), "Token does not exist");
        return ticketMetadata[tokenId];
    }

    /**
     * @dev Get all tickets for an event
     */
    function getEventTickets(uint256 eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }

    /**
     * @dev Check if ticket is used
     */
    function isTicketUsed(uint256 tokenId) external view returns (bool) {
        require(_tokenExists(tokenId), "Token does not exist");
        return usedTickets[tokenId];
    }

    /**
     * @dev Get tickets owned by address
     */
    function getOwnerTickets(address owner) external view returns (uint256[] memory tokens) {
        uint256 balance = balanceOf(owner);
        tokens = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
    }

    /**
     * @dev Get event tickets for owner
     */
    function getOwnerEventTickets(address owner, uint256 eventId) external view returns (uint256[] memory tokens) {
        uint256[] memory allEventTickets = eventTickets[eventId];
        uint256[] memory tempTokens = new uint256[](allEventTickets.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allEventTickets.length; i++) {
            if (ownerOf(allEventTickets[i]) == owner) {
                tempTokens[count] = allEventTickets[i];
                count++;
            }
        }

        // Copy to correctly sized array
        tokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokens[i] = tempTokens[i];
        }
    }

    /**
     * @dev Get current token ID counter
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Check if token exists (public version)
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _tokenExists(tokenId);
    }

    // ===== REQUIRED OVERRIDES =====

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
