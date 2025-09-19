import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const admin = deployer;

  const rovifyToken = await deployments.get("RovifyToken");
  const burnMechanism = await deployments.get("BurnMechanism");
  const ticketNFT = await deployments.get("EventTicketNFT");

  // EventPayouts(burnMechanism, treasury, admin)
  const eventPayouts = await deploy("EventPayouts", {
    from: deployer,
    args: [burnMechanism.address, deployer, admin],
    log: true,
    autoMine: true,
  });

  // TicketSales(rovifyToken, ticketNFT, treasury, admin)
  const ticketSales = await deploy("TicketSales", {
    from: deployer,
    args: [rovifyToken.address, ticketNFT.address, deployer, admin],
    log: true,
    autoMine: true,
  });

  // TicketMarketplace(rovifyToken, ticketNFT, eventPayouts, admin)
  await deploy("TicketMarketplace", {
    from: deployer,
    args: [rovifyToken.address, ticketNFT.address, eventPayouts.address, admin],
    log: true,
    autoMine: true,
  });

  // Post deploy role grants
  const nft = await ethers.getContractAt("EventTicketNFT", ticketNFT.address);
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const hasMinter = await nft.hasRole(MINTER_ROLE, ticketSales.address);
  if (!hasMinter) {
    const tx = await nft.grantRole(MINTER_ROLE, ticketSales.address);
    await tx.wait();
  }

  log("Sales, payouts, and marketplace deployed and wired");
};

export default func;
func.tags = ["Sales", "Payouts", "Marketplace"];

