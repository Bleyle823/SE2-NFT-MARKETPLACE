import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the EventTicketNFT contract for NFT-based event ticketing
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployEventTicketNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("EventTicketNFT", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to verify it was deployed correctly
  const eventTicketNFT = await hre.ethers.getContract("EventTicketNFT", deployer);
  console.log("👋 EventTicketNFT deployed to:", await eventTicketNFT.getAddress());
};

export default deployEventTicketNFT;

deployEventTicketNFT.tags = ["EventTicketNFT"];
