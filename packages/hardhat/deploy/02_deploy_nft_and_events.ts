import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const admin = deployer;
  const baseTokenURI = "https://rovify.local";

  const rovifyToken = await deployments.get("RovifyToken");

  // Event Ticket NFT
  const ticketNFT = await deploy("EventTicketNFT", {
    from: deployer,
    args: [rovifyToken.address, admin, baseTokenURI],
    log: true,
    autoMine: true,
  });

  // EventFactory(rovifyToken, admin)
  await deploy("EventFactory", {
    from: deployer,
    args: [rovifyToken.address, admin],
    log: true,
    autoMine: true,
  });

  // EventManager(admin)
  await deploy("EventManager", {
    from: deployer,
    args: [admin],
    log: true,
    autoMine: true,
  });

  // Grant MINTER role on NFT to TicketSales later (after TicketSales deploy) in next script
  log("NFT and event mgmt contracts deployed");
};

export default func;
func.tags = ["NFT", "Events"];

