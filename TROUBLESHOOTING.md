# NFT Collection System Troubleshooting Guide

## Issue: Collections Created Successfully But Not Visible in UI

### Possible Causes and Solutions:

### 1. **Environment Variables Not Set**
**Problem**: The frontend can't find the factory contract address.

**Solution**: 
- Check if `NEXT_PUBLIC_FACTORY_CONTRACT` is set in your `.env.local` file
- Make sure the contract address is correct (should be the deployed NFTCollectionFactory address)
- Restart your Next.js development server after setting environment variables

### 2. **Contracts Not Deployed**
**Problem**: The NFTCollectionFactory contract hasn't been deployed yet.

**Solution**:
```bash
# Deploy the contracts
cd packages/hardhat
yarn deploy
```

### 3. **Wrong Network**
**Problem**: Frontend is connected to a different network than where contracts are deployed.

**Solution**:
- Make sure your wallet is connected to the same network as your contracts
- Check that your Hardhat config and frontend are using the same network
- Verify the contract addresses match between deployment and frontend

### 4. **Contract Address Mismatch**
**Problem**: The factory contract address in the frontend doesn't match the deployed contract.

**Solution**:
- Check the deployment logs for the correct contract address
- Update your `.env.local` file with the correct address
- Restart the frontend server

### 5. **Contract ABI Issues**
**Problem**: The contract ABI doesn't match the deployed contract.

**Solution**:
- Make sure you've compiled the contracts after making changes
- Check that the contract names match exactly
- Verify the function signatures in the ABI

## Debugging Steps:

### Step 1: Check Environment Variables
1. Open your browser's developer console
2. Go to the My Collections page
3. Look for the debug information section
4. Verify that "Factory Contract" shows a valid address (not "Not set")

### Step 2: Check Contract Deployment
```bash
# Run the test script to verify contracts
cd packages/hardhat
yarn hardhat run scripts/testCollections.ts --network localhost
```

### Step 3: Check Browser Console
1. Open browser developer tools
2. Go to Console tab
3. Look for debug logs that show:
   - Factory Contract Address
   - User Address
   - User Collections count
   - Any error messages

### Step 4: Verify Contract Functions
```bash
# Test the factory contract directly
cd packages/hardhat
yarn hardhat console --network localhost

# In the console:
const factory = await ethers.getContractAt("NFTCollectionFactory", "YOUR_FACTORY_ADDRESS");
const collections = await factory.getAllCollections();
console.log("Collections:", collections);
```

## Common Error Messages and Solutions:

### "Factory Contract: Not set"
- Set `NEXT_PUBLIC_FACTORY_CONTRACT` in your `.env.local` file
- Restart your Next.js server

### "Error: Contract not found"
- Verify the contract address is correct
- Make sure the contract is deployed on the current network
- Check that you're connected to the right network

### "No collections available"
- Create a collection first using the Create Collection page
- Check that the collection creation transaction was successful
- Verify the collection was added to the factory contract

### "Collection details unavailable"
- The collection contract might not have the `getCollectionInfo` function
- Check that the NFTCollection contract is properly deployed
- Verify the contract ABI includes the required functions

## Testing the System:

### 1. Create a Collection
1. Go to `/create-collection`
2. Fill in the form with test data
3. Click "Create Collection"
4. Wait for transaction confirmation
5. Note the transaction hash

### 2. Verify Collection Creation
1. Go to `/my-collections`
2. Check the debug information
3. Verify the collection appears in the list

### 3. Test Minting
1. Go to `/mint`
2. Select the created collection
3. Fill in NFT details
4. Click "Mint NFT"
5. Wait for confirmation

## Environment Variables Checklist:

Make sure these are set in your `.env.local` file:
```
NEXT_PUBLIC_FACTORY_CONTRACT=0x... (NFTCollectionFactory address)
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x... (NFTMarketplace address)
NEXT_PUBLIC_NFT_CONTRACT=0x... (MyToken address)
```

## Network Configuration:

Ensure your `hardhat.config.ts` and frontend are using the same network:
- Local development: `localhost:8545`
- Testnet: Configure the appropriate RPC URL
- Mainnet: Configure the appropriate RPC URL

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify all contracts are deployed and accessible
3. Test the contracts directly using Hardhat console
4. Make sure your wallet is connected and has the right permissions
5. Check that you have sufficient ETH for gas fees

## Quick Fix Commands:

```bash
# Redeploy everything
cd packages/hardhat
yarn clean
yarn compile
yarn deploy

# Restart frontend
cd packages/nextjs
yarn dev
```
