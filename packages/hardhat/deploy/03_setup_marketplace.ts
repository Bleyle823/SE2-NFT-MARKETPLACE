import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Optional: Sets up initial configuration and mints sample NFTs for testing
 * This script is only for development/testing purposes
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deployments } = hre;

  // Only run on local networks for testing
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("⚠️  Skipping marketplace setup on non-local network");
    return;
  }

  try {
    // Get deployed contracts
    const myToken = await hre.ethers.getContract<Contract>("MyToken", deployer);
    const nftMarketplace = await hre.ethers.getContract<Contract>("NFTMarketplace", deployer);

    const myTokenAddress = await myToken.getAddress();
    const marketplaceAddress = await nftMarketplace.getAddress();

    console.log("\n📋 Setting up marketplace for testing...");
    console.log("MyToken address:", myTokenAddress);
    console.log("NFTMarketplace address:", marketplaceAddress);

    // Mint some sample NFTs for testing
    console.log("\n🎨 Minting sample NFTs...");
    
    const sampleTokenURIs = [
      "ipfs://QmSampleToken1",
      "ipfs://QmSampleToken2",
      "ipfs://QmSampleToken3"
    ];

    for (let i = 0; i < sampleTokenURIs.length; i++) {
      const tx = await myToken.mintToSelf(sampleTokenURIs[i]);
      await tx.wait();
      console.log(`  ✅ Minted token ${i} with URI: ${sampleTokenURIs[i]}`);
    }

    const totalSupply = await myToken.totalSupply();
    console.log(`\n📊 Total NFTs minted: ${totalSupply}`);

    // Approve marketplace to handle the first NFT (for demo purposes)
    if (totalSupply > 0n) {
      console.log("\n🔐 Approving marketplace for token 0...");
      const approveTx = await myToken.approve(marketplaceAddress, 0);
      await approveTx.wait();
      console.log("  ✅ Marketplace approved for token 0");

      // Optionally list the first NFT on the marketplace
      console.log("\n📝 Creating a sample listing...");
      const listingTx = await nftMarketplace.listItem(
        myTokenAddress,
        0, // tokenId
        hre.ethers.parseEther("0.1") // price in ETH
      );
      const receipt = await listingTx.wait();
      
      // Find the listing ID from the event
      const itemListedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "ItemListed"
      );
      
      if (itemListedEvent) {
        console.log("  ✅ NFT listed successfully!");
        console.log("  💰 Price: 0.1 ETH");
      }
    }

    console.log("\n✨ Marketplace setup complete!");
    console.log("\n📚 Available functions:");
    console.log("  - MyToken: mintToSelf(), safeMint(), approve()");
    console.log("  - NFTMarketplace: listItem(), buyItem(), createAuction(), placeBid(), makeOffer()");
    
  } catch (error) {
    console.error("❌ Error during marketplace setup:", error);
  }
};

export default setupMarketplace;

// This will run after MyToken and NFTMarketplace are deployed
setupMarketplace.tags = ["Setup"];
setupMarketplace.dependencies = ["MyToken", "NFTMarketplace"];
