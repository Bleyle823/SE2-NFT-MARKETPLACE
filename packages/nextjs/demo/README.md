# Event Ticketing NFT System Demo

This MVP provides a complete NFT-based event ticketing system with the following features:

## 🎯 Core Features

### 1. **Event Creation with Image Upload**
- Drag & drop image upload to IPFS via Pinata
- Event metadata including name, description, date, price, and max supply
- Real-time image preview and IPFS URL display

### 2. **Event Browsing & Ticket Purchasing**
- Browse all active events with beautiful image cards
- Real-time availability tracking
- Direct ticket purchase with ETH payment
- Automatic NFT minting with IPFS metadata

### 3. **Personal Ticket Management**
- View all owned tickets with event images
- List tickets for resale on the marketplace
- Cancel marketplace listings
- Track event status and dates

### 4. **Marketplace Trading**
- Browse all tickets available for resale
- Purchase tickets from other users
- Secure escrow system for buyer-seller transactions
- Real-time price and availability updates

## 🚀 Quick Start Guide

### 1. Setup Pinata (Required for image uploads)
Follow the instructions in `PINATA_SETUP.md` to configure IPFS integration.

### 2. Start the Development Environment
```bash
# Terminal 1: Start local blockchain
cd packages/hardhat
npm run chain

# Terminal 2: Deploy contracts
npm run deploy

# Terminal 3: Start frontend
cd ../nextjs
npm run dev
```

### 3. Connect Your Wallet
- Open http://localhost:3000
- Connect your MetaMask wallet
- Switch to localhost network (Chain ID: 31337)

### 4. Test the Complete Flow

#### Create an Event
1. Go to "Event Tickets" → "Create Event"
2. Upload an event image (drag & drop)
3. Fill in event details
4. Click "Create Event"

#### Buy a Ticket
1. Go to "Browse Events"
2. Find your event
3. Click "Buy Ticket"
4. Confirm transaction

#### List for Resale
1. Go to "My Tickets"
2. Set a resale price
3. Click "List for Sale"

#### Buy from Marketplace
1. Go to "Marketplace"
2. Find a listed ticket
3. Click "Buy Ticket"

## 🏗️ Architecture Overview

### Smart Contracts
- **EventTicketNFT.sol**: Main contract handling events, tickets, and marketplace
- **ERC721 Compliant**: Standard NFT functionality with enumerable extension
- **Marketplace Integration**: Built-in escrow system for secure trading

### Frontend Components
- **CreateEvent**: Event creation with image upload
- **EventList**: Browse and purchase tickets
- **MyTickets**: Personal ticket management
- **Marketplace**: Ticket resale platform
- **ImageUpload**: Drag-and-drop IPFS integration

### IPFS Integration
- **Pinata Service**: Handles image and metadata uploads
- **Metadata Generation**: Creates proper NFT metadata with event details
- **Gateway Integration**: Displays images from IPFS

## 🔧 Technical Features

### Blockchain Features
- **Gas Optimized**: Efficient smart contract design
- **Security**: ReentrancyGuard and Ownable protections
- **Events**: Comprehensive event logging for frontend updates

### Frontend Features
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Automatic data refresh after transactions
- **Error Handling**: User-friendly error messages and loading states
- **Type Safety**: Full TypeScript integration

### IPFS Features
- **Image Storage**: Permanent decentralized image hosting
- **Metadata Storage**: JSON metadata for NFT standards
- **Gateway Access**: Fast image loading via Pinata gateways

## 📊 Demo Data Examples

### Sample Event Data
```json
{
  "name": "Blockchain Conference 2024",
  "description": "Annual conference for blockchain developers and enthusiasts",
  "eventDate": "2024-12-15T10:00:00Z",
  "ticketPrice": "0.1 ETH",
  "maxSupply": 100
}
```

### Sample Ticket Metadata
```json
{
  "name": "Blockchain Conference 2024 - Ticket #1",
  "description": "Access to the exclusive blockchain conference...",
  "image": "https://gateway.pinata.cloud/ipfs/QmXxXxXx...",
  "attributes": [
    {"trait_type": "Event", "value": "Blockchain Conference 2024"},
    {"trait_type": "Ticket Number", "value": "1"},
    {"trait_type": "Event Date", "value": "Dec 15, 2024"}
  ]
}
```

## 🎨 UI/UX Highlights

- **Modern Design**: Clean, professional interface using DaisyUI
- **Intuitive Navigation**: Tab-based navigation between features
- **Visual Feedback**: Loading states, success messages, error alerts
- **Image-First**: Beautiful event cards with IPFS images
- **Mobile Responsive**: Optimized for all screen sizes

## 🔐 Security Considerations

- **Smart Contract Security**: Tested with standard security practices
- **Frontend Security**: Environment variables for sensitive data
- **IPFS Security**: Content-addressed storage prevents tampering
- **Wallet Integration**: Secure connection via RainbowKit

This MVP demonstrates a production-ready foundation for NFT-based event ticketing with room for additional features like QR code generation, event check-in systems, and advanced marketplace features.
