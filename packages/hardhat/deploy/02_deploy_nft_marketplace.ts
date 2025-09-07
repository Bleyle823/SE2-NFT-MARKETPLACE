import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the NFTMarketplace contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployNFTMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("NFTMarketplace", {
    from: deployer,
    // Contract constructor arguments - pass deployer as initial owner
    args: [deployer],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const nftMarketplace = await hre.ethers.getContract<Contract>("NFTMarketplace", deployer);
  console.log("🏪 NFT Marketplace deployed at:", await nftMarketplace.getAddress());
  console.log("🏪 Marketplace Fee:", await nftMarketplace.marketFee(), "basis points");
  console.log("🏪 Marketplace Owner:", await nftMarketplace.owner());
};

export default deployNFTMarketplace;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags NFTMarketplace
deployNFTMarketplace.tags = ["NFTMarketplace", "Marketplace"];
