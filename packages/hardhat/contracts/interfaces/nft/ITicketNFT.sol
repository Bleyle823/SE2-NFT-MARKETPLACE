// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IEventTicketNFT
 * @dev Interface for event ticket NFTs
 */
interface IEventTicketNFT is IERC721 {
    struct TicketMetadata {
        uint256 eventId;
        address originalPurchaser;
        uint256 purchaseTime;
        uint256 seatNumber;
        string ticketType;
        bool isTransferable;
        bool isUsed;
    }

    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed recipient, string ticketType);

    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId, address indexed user);

    function mintTicket(
        address to,
        uint256 eventId,
        string calldata ticketType,
        bool isTransferable
    ) external returns (uint256 tokenId);

    function useTicket(uint256 tokenId) external;
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory);
    function getEventTickets(uint256 eventId) external view returns (uint256[] memory);
    function setTicketTransferability(uint256 tokenId, bool transferable) external;
}
