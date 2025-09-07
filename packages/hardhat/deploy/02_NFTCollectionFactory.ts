import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployNFTCollectionFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying NFTCollectionFactory...");

  const nftCollectionFactory = await deploy("NFTCollectionFactory", {
    from: deployer,
    args: [deployer], // initialOwner
    log: true,
    autoMine: true,
  });

  console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);

  // Verify the deployment
  if (nftCollectionFactory.newlyDeployed) {
    console.log("NFTCollectionFactory is newly deployed!");
  }
};

export default deployNFTCollectionFactory;
deployNFTCollectionFactory.tags = ["NFTCollectionFactory"];
