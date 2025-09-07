import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplace, MyToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("NFTMarketplace", function () {
  let marketplace: NFTMarketplace;
  let nftContract: MyToken;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let addr3: SignerWithAddress;

  const SAMPLE_URI = "ipfs://QmTest";
  const LISTING_PRICE = ethers.parseEther("1");
  const AUCTION_STARTING_PRICE = ethers.parseEther("0.5");
  const AUCTION_DURATION = 3600; // 1 hour

  beforeEach(async function () {
    [owner, seller, buyer, addr3] = await ethers.getSigners();
    
    // Deploy NFT contract
    const MyTokenFactory = await ethers.getContractFactory("MyToken");
    nftContract = await MyTokenFactory.deploy(owner.address);
    await nftContract.waitForDeployment();

    // Deploy Marketplace contract
    const MarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await MarketplaceFactory.deploy(owner.address);
    await marketplace.waitForDeployment();

    // Mint NFTs for testing
    await nftContract.connect(seller).mintToSelf(SAMPLE_URI);
    await nftContract.connect(seller).mintToSelf(SAMPLE_URI + "2");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should set the correct initial market fee", async function () {
      expect(await marketplace.marketFee()).to.equal(250); // 2.5%
    });
  });

  describe("Fixed Price Listings", function () {
    describe("listItem", function () {
      it("Should list an NFT for sale", async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        const tx = await marketplace.connect(seller).listItem(nftAddress, 0, LISTING_PRICE);
        const receipt = await tx.wait();
        
        // Get listing ID from event
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = marketplace.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "ItemListed";
          } catch {
            return false;
          }
        });
        
        expect(event).to.not.be.undefined;
      });

      it("Should not list NFT with zero price", async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        await expect(
          marketplace.connect(seller).listItem(nftAddress, 0, 0)
        ).to.be.revertedWith("Price must be greater than zero");
      });

      it("Should not list NFT not owned by seller", async function () {
        const nftAddress = await nftContract.getAddress();
        
        await expect(
          marketplace.connect(buyer).listItem(nftAddress, 0, LISTING_PRICE)
        ).to.be.revertedWith("Not the owner");
      });

      it("Should not list NFT without approval", async function () {
        const nftAddress = await nftContract.getAddress();
        
        await expect(
          marketplace.connect(seller).listItem(nftAddress, 0, LISTING_PRICE)
        ).to.be.revertedWith("Contract not approved");
      });
    });

    describe("buyItem", function () {
      let listingId: string;

      beforeEach(async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        const tx = await marketplace.connect(seller).listItem(nftAddress, 0, LISTING_PRICE);
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = marketplace.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "ItemListed";
          } catch {
            return false;
          }
        });
        
        const parsedEvent = marketplace.interface.parseLog({
          topics: event!.topics as string[],
          data: event!.data
        });
        listingId = parsedEvent!.args[0];
      });

      it("Should allow buying a listed NFT", async function () {
        await expect(
          marketplace.connect(buyer).buyItem(listingId, { value: LISTING_PRICE })
        ).to.emit(marketplace, "ItemSold");

        expect(await nftContract.ownerOf(0)).to.equal(buyer.address);
      });

      it("Should handle market fees correctly", async function () {
        const initialOwnerBalance = await marketplace.pendingWithdrawals(owner.address);
        const initialSellerBalance = await marketplace.pendingWithdrawals(seller.address);

        await marketplace.connect(buyer).buyItem(listingId, { value: LISTING_PRICE });

        const fee = (LISTING_PRICE * 250n) / 10000n; // 2.5% fee
        const sellerAmount = LISTING_PRICE - fee;

        expect(await marketplace.pendingWithdrawals(owner.address)).to.equal(initialOwnerBalance + fee);
        expect(await marketplace.pendingWithdrawals(seller.address)).to.equal(initialSellerBalance + sellerAmount);
      });

      it("Should refund excess payment", async function () {
        const excessPayment = LISTING_PRICE + ethers.parseEther("0.5");
        await marketplace.connect(buyer).buyItem(listingId, { value: excessPayment });

        const refund = await marketplace.pendingWithdrawals(buyer.address);
        expect(refund).to.equal(ethers.parseEther("0.5"));
      });

      it("Should not allow buying with insufficient payment", async function () {
        await expect(
          marketplace.connect(buyer).buyItem(listingId, { value: ethers.parseEther("0.5") })
        ).to.be.revertedWith("Insufficient payment");
      });

      it("Should not allow buying inactive listing", async function () {
        await marketplace.connect(buyer).buyItem(listingId, { value: LISTING_PRICE });
        
        await expect(
          marketplace.connect(addr3).buyItem(listingId, { value: LISTING_PRICE })
        ).to.be.revertedWith("Listing not active");
      });
    });

    describe("cancelListing", function () {
      let listingId: string;

      beforeEach(async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        const tx = await marketplace.connect(seller).listItem(nftAddress, 0, LISTING_PRICE);
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = marketplace.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "ItemListed";
          } catch {
            return false;
          }
        });
        
        const parsedEvent = marketplace.interface.parseLog({
          topics: event!.topics as string[],
          data: event!.data
        });
        listingId = parsedEvent!.args[0];
      });

      it("Should allow seller to cancel listing", async function () {
        await expect(marketplace.connect(seller).cancelListing(listingId))
          .to.emit(marketplace, "ListingCanceled")
          .withArgs(listingId);
      });

      it("Should allow owner to cancel any listing", async function () {
        await expect(marketplace.connect(owner).cancelListing(listingId))
          .to.emit(marketplace, "ListingCanceled")
          .withArgs(listingId);
      });

      it("Should not allow others to cancel listing", async function () {
        await expect(
          marketplace.connect(buyer).cancelListing(listingId)
        ).to.be.revertedWith("Not authorized");
      });
    });
  });

  describe("Auction System", function () {
    describe("createAuction", function () {
      it("Should create an auction", async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        await expect(
          marketplace.connect(seller).createAuction(
            nftAddress,
            0,
            AUCTION_STARTING_PRICE,
            AUCTION_DURATION
          )
        ).to.emit(marketplace, "AuctionCreated");
      });

      it("Should not create auction with zero starting price", async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        await expect(
          marketplace.connect(seller).createAuction(nftAddress, 0, 0, AUCTION_DURATION)
        ).to.be.revertedWith("Starting price must be greater than zero");
      });

      it("Should not create auction with zero duration", async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        await expect(
          marketplace.connect(seller).createAuction(nftAddress, 0, AUCTION_STARTING_PRICE, 0)
        ).to.be.revertedWith("Duration must be greater than zero");
      });
    });

    describe("placeBid and endAuction", function () {
      let auctionId: string;

      beforeEach(async function () {
        const nftAddress = await nftContract.getAddress();
        await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
        
        const tx = await marketplace.connect(seller).createAuction(
          nftAddress,
          0,
          AUCTION_STARTING_PRICE,
          AUCTION_DURATION
        );
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = marketplace.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "AuctionCreated";
          } catch {
            return false;
          }
        });
        
        const parsedEvent = marketplace.interface.parseLog({
          topics: event!.topics as string[],
          data: event!.data
        });
        auctionId = parsedEvent!.args[0];
      });

      it("Should allow placing bids", async function () {
        const bidAmount = ethers.parseEther("1");
        await expect(
          marketplace.connect(buyer).placeBid(auctionId, { value: bidAmount })
        ).to.emit(marketplace, "BidPlaced")
          .withArgs(auctionId, buyer.address, bidAmount);
      });

      it("Should not allow bid below starting price", async function () {
        const lowBid = ethers.parseEther("0.1");
        await expect(
          marketplace.connect(buyer).placeBid(auctionId, { value: lowBid })
        ).to.be.revertedWith("Bid below starting price");
      });

      it("Should refund previous bidder", async function () {
        const firstBid = ethers.parseEther("1");
        const secondBid = ethers.parseEther("2");

        await marketplace.connect(buyer).placeBid(auctionId, { value: firstBid });
        await marketplace.connect(addr3).placeBid(auctionId, { value: secondBid });

        expect(await marketplace.pendingWithdrawals(buyer.address)).to.equal(firstBid);
      });

      it("Should end auction and transfer NFT to winner", async function () {
        const bidAmount = ethers.parseEther("1");
        await marketplace.connect(buyer).placeBid(auctionId, { value: bidAmount });

        // Fast forward time
        await time.increase(AUCTION_DURATION + 1);

        await expect(marketplace.endAuction(auctionId))
          .to.emit(marketplace, "AuctionEnded")
          .withArgs(auctionId, buyer.address, bidAmount);

        expect(await nftContract.ownerOf(0)).to.equal(buyer.address);
      });

      it("Should not end auction before time", async function () {
        await expect(marketplace.endAuction(auctionId))
          .to.be.revertedWith("Auction still ongoing");
      });
    });
  });

  describe("Offer System", function () {
    it("Should allow making offers", async function () {
      const nftAddress = await nftContract.getAddress();
      const offerAmount = ethers.parseEther("0.5");
      const expiration = (await time.latest()) + 3600;

      await expect(
        marketplace.connect(buyer).makeOffer(nftAddress, 0, expiration, { value: offerAmount })
      ).to.emit(marketplace, "OfferMade");
    });

    it("Should allow accepting offers", async function () {
      const nftAddress = await nftContract.getAddress();
      const offerAmount = ethers.parseEther("0.5");
      const expiration = (await time.latest()) + 3600;

      await marketplace.connect(buyer).makeOffer(nftAddress, 0, expiration, { value: offerAmount });
      await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);

      await expect(marketplace.connect(seller).acceptOffer(nftAddress, 0, 0))
        .to.emit(marketplace, "OfferAccepted");

      expect(await nftContract.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should allow withdrawing offers", async function () {
      const nftAddress = await nftContract.getAddress();
      const offerAmount = ethers.parseEther("0.5");
      const expiration = (await time.latest()) + 3600;

      await marketplace.connect(buyer).makeOffer(nftAddress, 0, expiration, { value: offerAmount });
      await marketplace.connect(buyer).withdrawOffer(nftAddress, 0, 0);

      expect(await marketplace.pendingWithdrawals(buyer.address)).to.equal(offerAmount);
    });
  });

  describe("Withdrawal System", function () {
    it("Should allow withdrawing pending funds", async function () {
      // Create a listing and buy it to generate pending withdrawals
      const nftAddress = await nftContract.getAddress();
      await nftContract.connect(seller).approve(await marketplace.getAddress(), 0);
      
      const tx = await marketplace.connect(seller).listItem(nftAddress, 0, LISTING_PRICE);
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = marketplace.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          return parsed?.name === "ItemListed";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = marketplace.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data
      });
      const listingId = parsedEvent!.args[0];

      await marketplace.connect(buyer).buyItem(listingId, { value: LISTING_PRICE });

      const pendingAmount = await marketplace.pendingWithdrawals(seller.address);
      expect(pendingAmount).to.be.gt(0);

      const initialBalance = await ethers.provider.getBalance(seller.address);
      const withdrawTx = await marketplace.connect(seller).withdraw();
      const withdrawReceipt = await withdrawTx.wait();
      const gasUsed = withdrawReceipt!.gasUsed * withdrawReceipt!.gasPrice;
      const finalBalance = await ethers.provider.getBalance(seller.address);

      expect(finalBalance).to.equal(initialBalance + pendingAmount - gasUsed);
      expect(await marketplace.pendingWithdrawals(seller.address)).to.equal(0);
    });

    it("Should not allow withdrawing with zero balance", async function () {
      await expect(marketplace.connect(buyer).withdraw())
        .to.be.revertedWith("No funds to withdraw");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set market fee", async function () {
      await expect(marketplace.setMarketFee(500))
        .to.emit(marketplace, "MarketFeeUpdated")
        .withArgs(500);

      expect(await marketplace.marketFee()).to.equal(500);
    });

    it("Should not allow setting fee above maximum", async function () {
      await expect(marketplace.setMarketFee(1001))
        .to.be.revertedWith("Fee too high");
    });

    it("Should not allow non-owner to set market fee", async function () {
      await expect(marketplace.connect(buyer).setMarketFee(500))
        .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });
});
