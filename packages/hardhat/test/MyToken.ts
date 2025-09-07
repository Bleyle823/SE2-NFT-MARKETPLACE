import { expect } from "chai";
import { ethers } from "hardhat";
import { MyToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MyToken", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const MyTokenFactory = await ethers.getContractFactory("MyToken");
    myToken = await MyTokenFactory.deploy(owner.address);
    await myToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await myToken.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await myToken.name()).to.equal("MyToken");
      expect(await myToken.symbol()).to.equal("MTK");
    });

    it("Should start with zero total supply", async function () {
      expect(await myToken.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    describe("safeMint", function () {
      it("Should allow owner to mint tokens", async function () {
        const tokenURI = "ipfs://QmTest";
        await expect(myToken.safeMint(addr1.address, tokenURI))
          .to.emit(myToken, "TokenMinted")
          .withArgs(addr1.address, 0, tokenURI);

        expect(await myToken.ownerOf(0)).to.equal(addr1.address);
        expect(await myToken.tokenURI(0)).to.equal(tokenURI);
        expect(await myToken.totalSupply()).to.equal(1);
      });

      it("Should not allow non-owner to mint tokens", async function () {
        const tokenURI = "ipfs://QmTest";
        await expect(
          myToken.connect(addr1).safeMint(addr2.address, tokenURI)
        ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
      });

      it("Should increment token IDs correctly", async function () {
        await myToken.safeMint(addr1.address, "ipfs://QmTest1");
        await myToken.safeMint(addr2.address, "ipfs://QmTest2");
        
        expect(await myToken.ownerOf(0)).to.equal(addr1.address);
        expect(await myToken.ownerOf(1)).to.equal(addr2.address);
        expect(await myToken.totalSupply()).to.equal(2);
      });
    });

    describe("mintToSelf", function () {
      it("Should allow anyone to mint tokens to themselves", async function () {
        const tokenURI = "ipfs://QmTest";
        await expect(myToken.connect(addr1).mintToSelf(tokenURI))
          .to.emit(myToken, "TokenMinted")
          .withArgs(addr1.address, 0, tokenURI);

        expect(await myToken.ownerOf(0)).to.equal(addr1.address);
        expect(await myToken.tokenURI(0)).to.equal(tokenURI);
      });

      it("Should correctly track total supply", async function () {
        await myToken.connect(addr1).mintToSelf("ipfs://QmTest1");
        await myToken.connect(addr2).mintToSelf("ipfs://QmTest2");
        await myToken.connect(addr1).mintToSelf("ipfs://QmTest3");
        
        expect(await myToken.totalSupply()).to.equal(3);
        expect(await myToken.ownerOf(0)).to.equal(addr1.address);
        expect(await myToken.ownerOf(1)).to.equal(addr2.address);
        expect(await myToken.ownerOf(2)).to.equal(addr1.address);
      });
    });
  });

  describe("Token URI", function () {
    it("Should return correct token URI", async function () {
      const tokenURI = "ipfs://QmTestURI";
      await myToken.mintToSelf(tokenURI);
      expect(await myToken.tokenURI(0)).to.equal(tokenURI);
    });

    it("Should revert for non-existent token", async function () {
      await expect(myToken.tokenURI(999))
        .to.be.revertedWithCustomError(myToken, "ERC721NonexistentToken");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await myToken.connect(addr1).mintToSelf("ipfs://QmTest");
    });

    it("Should allow token owner to transfer", async function () {
      await myToken.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await myToken.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should allow approved address to transfer", async function () {
      await myToken.connect(addr1).approve(addr2.address, 0);
      await myToken.connect(addr2).transferFrom(addr1.address, addr2.address, 0);
      expect(await myToken.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should not allow unauthorized transfer", async function () {
      await expect(
        myToken.connect(addr2).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.revertedWithCustomError(myToken, "ERC721InsufficientApproval");
    });
  });
});
