# 🚀 NFT Marketplace Deployment Guide

This guide will walk you through deploying your NFT Marketplace built with Scaffold-ETH and The Graph.

## 📋 Prerequisites

- Node.js (>= v20.18.3)
- Yarn package manager
- Git
- MetaMask or compatible wallet
- Test ETH for gas fees
- The Graph Studio account

## 🏗️ Step 1: Smart Contract Deployment

### 1.1 Local Development Setup

```bash
# Clone and setup the project
cd SE2-NFT-MARKETPLACE-1
yarn install

# Start local blockchain
yarn chain

# In a new terminal, deploy contracts
yarn deploy
```

### 1.2 Test Network Deployment (Sepolia)

```bash
# Set up environment variables
cp packages/hardhat/.env.example packages/hardhat/.env

# Add your private key and RPC URL to .env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id

# Deploy to Sepolia
yarn hardhat:deploy --network sepolia
```

### 1.3 Mainnet Deployment

```bash
# Update .env with mainnet RPC URL
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your_project_id

# Deploy to mainnet (be very careful!)
yarn hardhat:deploy --network mainnet
```

## 🔗 Step 2: The Graph Subgraph Deployment

### 2.1 Install Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

### 2.2 Initialize Subgraph

```bash
cd packages/nextjs/services/graph
graph init --studio nft-marketplace
```

### 2.3 Configure Subgraph

Update `subgraph.yaml` with your deployed contract address:

```yaml
dataSources:
  - kind: ethereum
    name: NFTMarketplace
    network: sepolia  # or mainnet
    source:
      address: "0xYourDeployedContractAddress"
      abi: NFTMarketplace
      startBlock: 12345678  # Block when contract was deployed
```

### 2.4 Deploy Subgraph

```bash
# Authenticate with The Graph Studio
graph auth --studio your_deploy_key

# Build and deploy
graph codegen
graph build
graph deploy --studio nft-marketplace
```

## 🌐 Step 3: Frontend Deployment

### 3.1 Environment Configuration

Create `.env.local` in `packages/nextjs/`:

```env
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0xYourDeployedMarketplaceAddress
NEXT_PUBLIC_NFT_CONTRACT=0xYourDeployedNFTAddress
NEXT_PUBLIC_GRAPH_URL=https://api.thegraph.com/subgraphs/name/your-username/nft-marketplace
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
```

### 3.2 Local Development

```bash
# Start the frontend
yarn start

# Visit http://localhost:3000
```

### 3.3 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd packages/nextjs
vercel

# Follow the prompts and deploy
```

### 3.4 IPFS Integration

For NFT metadata storage, set up Pinata:

1. Create account at [pinata.cloud](https://pinata.cloud)
2. Get API keys
3. Add to environment variables
4. Use the provided Pinata service in your app

## 🧪 Step 4: Testing

### 4.1 Smart Contract Tests

```bash
# Run all tests
yarn hardhat:test

# Run specific test file
yarn hardhat:test test/NFTMarketplace.ts
```

### 4.2 Frontend Tests

```bash
cd packages/nextjs
yarn test
```

### 4.3 Integration Testing

1. **Mint NFTs**: Use the mint function to create test NFTs
2. **List Items**: Create listings with different prices
3. **Create Auctions**: Set up auctions with various parameters
4. **Place Bids**: Test the bidding system
5. **Purchase Items**: Buy NFTs through the marketplace
6. **Withdraw Funds**: Test the withdrawal functionality

## 📊 Step 5: Monitoring & Analytics

### 5.1 The Graph Dashboard

Monitor your subgraph at [The Graph Studio](https://thegraph.com/studio/):
- Check indexing status
- Monitor query performance
- View error logs

### 5.2 Contract Monitoring

Use tools like:
- [Etherscan](https://etherscan.io) for contract verification
- [Tenderly](https://tenderly.co) for transaction monitoring
- [OpenZeppelin Defender](https://defender.openzeppelin.com) for security monitoring

## 🔧 Step 6: Production Optimizations

### 6.1 Gas Optimization

```solidity
// Use efficient data types
uint256 public constant MAX_FEE = 1000; // Instead of uint256

// Pack structs efficiently
struct Listing {
    uint256 tokenId;
    address nftContract;
    address seller;
    uint256 price;
    bool active;
    uint256 createdAt;
}
```

### 6.2 Frontend Optimizations

```typescript
// Implement caching
const { data } = useQuery(GET_LISTINGS, {
  fetchPolicy: 'cache-first',
  pollInterval: 30000,
});

// Use pagination
const { data } = useQuery(GET_LISTINGS, {
  variables: { first: 20, skip: page * 20 },
});
```

### 6.3 Security Considerations

1. **Access Control**: Implement proper role-based access
2. **Reentrancy Protection**: Use ReentrancyGuard
3. **Input Validation**: Validate all user inputs
4. **Emergency Functions**: Include pause/unpause functionality

## 🚨 Troubleshooting

### Common Issues

1. **Contract Deployment Fails**
   - Check gas limits
   - Verify RPC URL
   - Ensure sufficient ETH for gas

2. **Subgraph Not Indexing**
   - Check start block number
   - Verify contract address
   - Review mapping functions

3. **Frontend Connection Issues**
   - Verify contract addresses
   - Check network configuration
   - Ensure wallet is connected

### Support Resources

- [Scaffold-ETH Documentation](https://docs.scaffoldeth.io)
- [The Graph Documentation](https://thegraph.com/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 📈 Next Steps

1. **Add More Features**:
   - Royalty system
   - Batch operations
   - Advanced filtering
   - Social features

2. **Scale the Platform**:
   - Implement Layer 2 solutions
   - Add multi-chain support
   - Optimize for mobile

3. **Community Building**:
   - Create documentation
   - Set up Discord/Telegram
   - Launch marketing campaigns

## 🎉 Congratulations!

You've successfully deployed a full-featured NFT Marketplace! Your platform now includes:

- ✅ Smart contract marketplace with listings, auctions, and offers
- ✅ React frontend with modern UI/UX
- ✅ The Graph indexing for efficient data queries
- ✅ IPFS integration for metadata storage
- ✅ Wallet connectivity and transaction handling

Happy building! 🚀
