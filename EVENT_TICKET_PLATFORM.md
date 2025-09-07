# Event Ticket Platform - NFT-based Event Management System

## Overview

This project has been transformed from a simple NFT example into a comprehensive NFT-based event ticket platform. Users can create events, mint tickets as NFTs, and manage their event tickets through a modern web interface.

## Features

### 🎫 Event Management
- **Create Events**: Event organizers can create events with details like name, description, location, date, ticket price, and maximum tickets
- **Event Status Control**: Organizers can activate/deactivate events
- **Revenue Tracking**: Real-time tracking of ticket sales and revenue

### 🎟️ NFT Ticket System
- **Unique Tickets**: Each ticket is a unique NFT with rich metadata
- **IPFS Storage**: Ticket metadata is stored on IPFS for decentralization
- **Custom Attributes**: Support for seat numbers, venue sections, and custom traits
- **Event Details**: Each ticket contains comprehensive event information

### 🎪 User Experience
- **Event Discovery**: Browse and search for upcoming events
- **Ticket Purchase**: Buy tickets directly with ETH
- **Ticket Management**: View and manage your NFT tickets
- **Organizer Dashboard**: Comprehensive dashboard for event organizers

## Smart Contract Architecture

### EventTicket Contract
The main contract (`EventTicket.sol`) extends OpenZeppelin's ERC721 standard with:

- **Event Management**: Create and manage events
- **Ticket Minting**: Mint tickets as NFTs with payment
- **Access Control**: Organizer-only functions for event management
- **Revenue Distribution**: Automatic payment to event organizers

### Key Functions
- `createEvent()`: Create a new event
- `mintTicket()`: Purchase and mint a ticket
- `setEventStatus()`: Activate/deactivate events
- `getEvent()`: Retrieve event information

## Frontend Architecture

### Pages
1. **Home** (`/`): Platform overview and navigation
2. **Events** (`/events`): Browse and purchase event tickets
3. **My Tickets** (`/myNFTs`): View and manage your NFT tickets
4. **Create Event** (`/ipfsUpload`): Event creation and ticket metadata generation
5. **Organizer Dashboard** (`/organizer`): Manage your events and track sales

### Components
- **EventCard**: Display event information and purchase options
- **TicketCard**: Show ticket details with event information
- **EventForm**: Create new events with validation
- **MetadataGenerator**: Generate rich ticket metadata

## Metadata Structure

Each ticket NFT contains:
```json
{
  "name": "Event Name - Ticket #123",
  "description": "Official ticket for Event Name",
  "image": "https://ipfs.io/ipfs/...",
  "attributes": [
    {
      "trait_type": "Event Date",
      "value": "2024-01-15T19:00:00Z",
      "display_type": "date"
    },
    {
      "trait_type": "Seat Number",
      "value": "A12"
    }
  ],
  "event_details": {
    "event_id": 1,
    "event_name": "Concert",
    "event_date": "2024-01-15T19:00:00Z",
    "location": "Madison Square Garden",
    "organizer": "0x...",
    "ticket_type": "VIP",
    "seat_number": "A12"
  }
}
```

## Getting Started

### Prerequisites
- Node.js and Yarn
- Hardhat development environment
- MetaMask or compatible wallet

### Installation
1. Clone the repository
2. Install dependencies: `yarn install`
3. Start local blockchain: `yarn chain`
4. Deploy contracts: `yarn deploy`
5. Start frontend: `yarn start`

### Usage
1. **Connect Wallet**: Connect your MetaMask wallet
2. **Create Event**: Go to "Create Event" to set up your event
3. **Browse Events**: Visit "Events" to see available events
4. **Purchase Tickets**: Click "Buy Ticket" to mint an NFT ticket
5. **Manage Tickets**: View your tickets in "My Tickets"

## Development

### Contract Development
- Contracts are in `packages/hardhat/contracts/`
- Deploy scripts in `packages/hardhat/deploy/`
- Tests in `packages/hardhat/test/`

### Frontend Development
- React components in `packages/nextjs/app/`
- Utilities in `packages/nextjs/utils/`
- Hooks in `packages/nextjs/hooks/`

### Key Technologies
- **Smart Contracts**: Solidity with OpenZeppelin
- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS with DaisyUI
- **Blockchain**: Wagmi and RainbowKit
- **Storage**: IPFS for metadata

## Security Features

- **Access Control**: Only authorized organizers can create events
- **Payment Security**: Secure ETH transfers for ticket purchases
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Input Validation**: Comprehensive validation for all inputs

## Future Enhancements

- **Secondary Market**: Allow ticket resale
- **Refund System**: Implement refund mechanisms
- **Multi-token Support**: Support for different payment tokens
- **Event Categories**: Categorize events by type
- **Analytics**: Advanced analytics for organizers
- **Mobile App**: Native mobile application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
