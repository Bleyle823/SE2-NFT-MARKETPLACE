import { ethers } from "hardhat";

async function main() {
  console.log("Testing NFT Collection System...");

  // Get the factory contract
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_CONTRACT;
  if (!factoryAddress) {
    console.error("NEXT_PUBLIC_FACTORY_CONTRACT environment variable not set");
    return;
  }

  const factory = await ethers.getContractAt("NFTCollectionFactory", factoryAddress);
  console.log("Factory contract address:", factoryAddress);

  // Get all collections
  try {
    const allCollections = await factory.getAllCollections();
    console.log("Total collections:", allCollections.length);

    if (allCollections.length > 0) {
      console.log("Collection addresses:", allCollections);

      // Test reading collection info
      for (let i = 0; i < Math.min(allCollections.length, 3); i++) {
        const collectionAddress = allCollections[i];
        console.log(`\nTesting collection ${i + 1}: ${collectionAddress}`);

        try {
          const collection = await ethers.getContractAt("NFTCollection", collectionAddress);
          const info = await collection.getCollectionInfo();
          console.log("Collection info:", {
            name: info[0],
            symbol: info[1],
            description: info[2],
            image: info[3],
            maxSupply: info[4].toString(),
            currentSupply: info[5].toString(),
            mintPrice: ethers.utils.formatEther(info[6]),
            mintingActive: info[7],
          });
        } catch (error) {
          console.error(`Error reading collection ${collectionAddress}:`, error);
        }
      }
    } else {
      console.log("No collections found. Create a collection first!");
    }
  } catch (error) {
    console.error("Error reading collections:", error);
  }

  // Test with a specific user address if provided
  const testUserAddress = process.env.TEST_USER_ADDRESS;
  if (testUserAddress) {
    console.log(`\nTesting collections for user: ${testUserAddress}`);
    try {
      const userCollections = await factory.getCreatorCollections(testUserAddress);
      console.log("User collections:", userCollections.length);
      if (userCollections.length > 0) {
        console.log("User collection addresses:", userCollections);
      }
    } catch (error) {
      console.error("Error reading user collections:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
