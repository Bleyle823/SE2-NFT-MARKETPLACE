import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the MyToken NFT contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployMyToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("MyToken", {
    from: deployer,
    // Contract constructor arguments - pass deployer as initial owner
    args: [deployer],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const myToken = await hre.ethers.getContract<Contract>("MyToken", deployer);
  console.log("🎨 MyToken NFT deployed at:", await myToken.getAddress());
  console.log("🎨 Token Name:", await myToken.name());
  console.log("🎨 Token Symbol:", await myToken.symbol());
};

export default deployMyToken;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags MyToken
deployMyToken.tags = ["MyToken", "NFT"];
