import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const admin = deployer;

  const rovifyToken = await deployments.get("RovifyToken");

  // StakingRewards(stakingToken, admin)
  await deploy("StakingRewards", {
    from: deployer,
    args: [rovifyToken.address, admin],
    log: true,
    autoMine: true,
  });

  // CreatorMarketplace(rovifyToken, admin)
  await deploy("CreatorMarketplace", {
    from: deployer,
    args: [rovifyToken.address, admin],
    log: true,
    autoMine: true,
  });
};

export default func;
func.tags = ["Staking", "Creator"];

