# 🧪 NFT Marketplace Testing Guide

This guide covers comprehensive testing strategies for your NFT Marketplace built with Scaffold-ETH and The Graph.

## 📋 Testing Overview

### Testing Pyramid
1. **Unit Tests** - Smart contract functions
2. **Integration Tests** - Contract interactions
3. **Frontend Tests** - React components
4. **End-to-End Tests** - Complete user flows
5. **Performance Tests** - Load and stress testing

## 🔧 Smart Contract Testing

### 1. Unit Tests

Create comprehensive tests for your marketplace contract:

```typescript
// test/NFTMarketplace.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplace, MyToken } from "../typechain-types";

describe("NFTMarketplace", function () {
  let marketplace: NFTMarketplace;
  let nft: MyToken;
  let owner: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();
    
    // Deploy contracts
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy(owner.address);
    
    const MyToken = await ethers.getContractFactory("MyToken");
    nft = await MyToken.deploy(owner.address);
    
    await marketplace.deployed();
    await nft.deployed();
  });

  describe("Listing Functions", function () {
    it("Should create a listing", async function () {
      // Mint NFT to seller
      await nft.connect(owner).safeMint(seller.address, "ipfs://test");
      
      // Approve marketplace
      await nft.connect(seller).approve(marketplace.address, 0);
      
      // Create listing
      const tx = await marketplace.connect(seller).listItem(
        nft.address,
        0,
        ethers.utils.parseEther("1.0")
      );
      
      await expect(tx)
        .to.emit(marketplace, "ItemListed")
        .withArgs(anyValue, seller.address, nft.address, 0, ethers.utils.parseEther("1.0"));
    });

    it("Should prevent listing without approval", async function () {
      await nft.connect(owner).safeMint(seller.address, "ipfs://test");
      
      await expect(
        marketplace.connect(seller).listItem(
          nft.address,
          0,
          ethers.utils.parseEther("1.0")
        )
      ).to.be.revertedWith("Contract not approved");
    });

    it("Should allow buying listed item", async function () {
      // Setup listing
      await nft.connect(owner).safeMint(seller.address, "ipfs://test");
      await nft.connect(seller).approve(marketplace.address, 0);
      const tx = await marketplace.connect(seller).listItem(
        nft.address,
        0,
        ethers.utils.parseEther("1.0")
      );
      const receipt = await tx.wait();
      const listingId = receipt.events[0].args.listingId;

      // Buy item
      await expect(
        marketplace.connect(buyer).buyItem(listingId, {
          value: ethers.utils.parseEther("1.0")
        })
      ).to.emit(marketplace, "ItemSold");
    });
  });

  describe("Auction Functions", function () {
    it("Should create an auction", async function () {
      await nft.connect(owner).safeMint(seller.address, "ipfs://test");
      await nft.connect(seller).approve(marketplace.address, 0);
      
      const tx = await marketplace.connect(seller).createAuction(
        nft.address,
        0,
        ethers.utils.parseEther("0.5"),
        86400, // 24 hours
        ethers.utils.parseEther("0.1")
      );
      
      await expect(tx)
        .to.emit(marketplace, "AuctionCreated");
    });

    it("Should allow placing bids", async function () {
      // Setup auction
      await nft.connect(owner).safeMint(seller.address, "ipfs://test");
      await nft.connect(seller).approve(marketplace.address, 0);
      const tx = await marketplace.connect(seller).createAuction(
        nft.address,
        0,
        ethers.utils.parseEther("0.5"),
        86400,
        ethers.utils.parseEther("0.1")
      );
      const receipt = await tx.wait();
      const auctionId = receipt.events[0].args.auctionId;

      // Place bid
      await expect(
        marketplace.connect(buyer).placeBid(auctionId, {
          value: ethers.utils.parseEther("0.6")
        })
      ).to.emit(marketplace, "BidPlaced");
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy attacks", async function () {
      // Test with malicious contract
      const MaliciousContract = await ethers.getContractFactory("MaliciousContract");
      const malicious = await MaliciousContract.deploy(marketplace.address);
      
      // Attempt reentrancy attack
      await expect(
        malicious.attack()
      ).to.be.reverted;
    });

    it("Should handle zero address inputs", async function () {
      await expect(
        marketplace.connect(seller).listItem(
          ethers.constants.AddressZero,
          0,
          ethers.utils.parseEther("1.0")
        )
      ).to.be.reverted;
    });
  });
});
```

### 2. Integration Tests

Test interactions between contracts:

```typescript
describe("Contract Integration", function () {
  it("Should handle complete marketplace flow", async function () {
    // 1. Mint NFT
    await nft.connect(owner).safeMint(seller.address, "ipfs://test");
    
    // 2. List for sale
    await nft.connect(seller).approve(marketplace.address, 0);
    const listTx = await marketplace.connect(seller).listItem(
      nft.address,
      0,
      ethers.utils.parseEther("1.0")
    );
    
    // 3. Buy NFT
    const listReceipt = await listTx.wait();
    const listingId = listReceipt.events[0].args.listingId;
    
    await marketplace.connect(buyer).buyItem(listingId, {
      value: ethers.utils.parseEther("1.0")
    });
    
    // 4. Verify ownership transfer
    expect(await nft.ownerOf(0)).to.equal(buyer.address);
    
    // 5. Verify seller can withdraw funds
    const sellerBalance = await marketplace.pendingWithdrawals(seller.address);
    expect(sellerBalance).to.be.gt(0);
  });
});
```

## 🎨 Frontend Testing

### 1. Component Tests

```typescript
// components/__tests__/NFTMarketplaceCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NFTMarketplaceCard } from '../marketplace/NFTMarketplaceCard';
import { MockedProvider } from '@apollo/client/testing';

const mockListing = {
  listingId: '0x123',
  tokenId: '1',
  nftContract: '0x456',
  seller: '0x789',
  price: '1.0',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('NFTMarketplaceCard', () => {
  it('renders listing information correctly', () => {
    render(
      <MockedProvider>
        <NFTMarketplaceCard 
          listing={mockListing} 
          onPurchase={jest.fn()} 
        />
      </MockedProvider>
    );
    
    expect(screen.getByText('NFT #1')).toBeInTheDocument();
    expect(screen.getByText('1.0 ETH')).toBeInTheDocument();
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('calls onPurchase when buy button is clicked', async () => {
    const mockOnPurchase = jest.fn();
    
    render(
      <MockedProvider>
        <NFTMarketplaceCard 
          listing={mockListing} 
          onPurchase={mockOnPurchase} 
        />
      </MockedProvider>
    );
    
    const buyButton = screen.getByText('Buy Now');
    fireEvent.click(buyButton);
    
    await waitFor(() => {
      expect(mockOnPurchase).toHaveBeenCalled();
    });
  });
});
```

### 2. Hook Tests

```typescript
// hooks/__tests__/useGraphData.test.ts
import { renderHook } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useActiveListings } from '../useGraphData';

const mocks = [
  {
    request: {
      query: GET_ACTIVE_LISTINGS,
      variables: { first: 20, skip: 0, orderBy: 'createdAt', orderDirection: 'desc' },
    },
    result: {
      data: {
        listings: [
          {
            id: '0x123',
            tokenId: '1',
            nftContract: '0x456',
            seller: { id: '0x789' },
            price: '1000000000000000000',
            createdAt: '1640995200',
            updatedAt: '1640995200',
          },
        ],
      },
    },
  },
];

describe('useActiveListings', () => {
  it('fetches and returns listings data', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );

    const { result } = renderHook(() => useActiveListings(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.listings).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.listings[0].tokenId).toBe('1');
  });
});
```

## 🔄 End-to-End Testing

### 1. Playwright Tests

```typescript
// e2e/marketplace.spec.ts
import { test, expect } from '@playwright/test';

test.describe('NFT Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/marketplace');
  });

  test('should display marketplace page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('NFT Marketplace');
    await expect(page.locator('[data-testid="stats-panel"]')).toBeVisible();
  });

  test('should filter listings by price range', async ({ page }) => {
    // Set price range filter
    await page.fill('input[placeholder="Min"]', '0.1');
    await page.fill('input[placeholder="Max"]', '1.0');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="nft-card"]');
    
    // Verify all displayed prices are within range
    const priceElements = await page.locator('[data-testid="price-badge"]').all();
    for (const element of priceElements) {
      const priceText = await element.textContent();
      const price = parseFloat(priceText?.replace(' ETH', '') || '0');
      expect(price).toBeGreaterThanOrEqual(0.1);
      expect(price).toBeLessThanOrEqual(1.0);
    }
  });

  test('should allow purchasing an NFT', async ({ page }) => {
    // Connect wallet (mock)
    await page.click('[data-testid="connect-wallet"]');
    
    // Click buy button on first NFT
    await page.click('[data-testid="nft-card"]:first-child [data-testid="buy-button"]');
    
    // Confirm transaction
    await page.click('[data-testid="confirm-transaction"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

## 📊 Performance Testing

### 1. Load Testing

```typescript
// performance/load-test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle multiple concurrent users', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // All users navigate to marketplace simultaneously
    await Promise.all(
      pages.map(page => page.goto('http://localhost:3000/marketplace'))
    );
    
    // Verify all pages load successfully
    for (const page of pages) {
      await expect(page.locator('h1')).toContainText('NFT Marketplace');
    }
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle large datasets', async ({ page }) => {
    // Mock large dataset
    await page.route('**/graphql', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            listings: Array.from({ length: 1000 }, (_, i) => ({
              id: `0x${i}`,
              tokenId: i.toString(),
              price: '1000000000000000000',
              // ... other fields
            })),
          },
        }),
      });
    });
    
    await page.goto('http://localhost:3000/marketplace');
    
    // Verify page loads within acceptable time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="nft-card"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });
});
```

## 🛡️ Security Testing

### 1. Smart Contract Security

```typescript
describe('Security Tests', () => {
  it('should prevent integer overflow', async function () {
    const maxUint256 = ethers.constants.MaxUint256;
    
    await expect(
      marketplace.connect(seller).listItem(
        nft.address,
        0,
        maxUint256
      )
    ).to.be.reverted;
  });

  it('should handle edge cases in auction timing', async function () {
    // Test auction with very short duration
    await expect(
      marketplace.connect(seller).createAuction(
        nft.address,
        0,
        ethers.utils.parseEther("0.5"),
        1, // 1 second
        ethers.utils.parseEther("0.1")
      )
    ).to.be.revertedWith("Invalid duration");
  });
});
```

### 2. Frontend Security

```typescript
describe('Frontend Security', () => {
  it('should sanitize user inputs', async ({ page }) => {
    await page.goto('http://localhost:3000/marketplace');
    
    // Try to inject malicious script
    await page.fill('[data-testid="search-input"]', '<script>alert("xss")</script>');
    await page.click('[data-testid="search-button"]');
    
    // Verify no alert appears
    page.on('dialog', dialog => {
      expect(dialog.message()).not.toContain('xss');
    });
  });
});
```

## 📈 Test Automation

### 1. CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'yarn'
    
    - name: Install dependencies
      run: yarn install
    
    - name: Run smart contract tests
      run: yarn hardhat:test
    
    - name: Run frontend tests
      run: yarn test
    
    - name: Run E2E tests
      run: yarn test:e2e
    
    - name: Run security audit
      run: yarn audit
```

### 2. Test Coverage

```json
// package.json
{
  "scripts": {
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## 🎯 Testing Best Practices

1. **Test Coverage**: Aim for >90% code coverage
2. **Test Isolation**: Each test should be independent
3. **Mock External Dependencies**: Use mocks for blockchain calls
4. **Test Edge Cases**: Include boundary conditions
5. **Performance Benchmarks**: Set acceptable response times
6. **Security Focus**: Test for common vulnerabilities
7. **User Experience**: Test from user perspective
8. **Regression Testing**: Ensure new changes don't break existing functionality

## 🚀 Running Tests

```bash
# Run all tests
yarn test

# Run specific test suites
yarn hardhat:test
yarn test:frontend
yarn test:e2e

# Run with coverage
yarn test:coverage

# Run in watch mode
yarn test:watch
```

This comprehensive testing strategy ensures your NFT Marketplace is robust, secure, and ready for production! 🎉
