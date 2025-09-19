import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  // Admin/treasury/ecosystem can initially be the deployer for local/dev
  const admin = deployer;
  const treasury = deployer;
  const ecosystem = deployer;

  // 1) TeamVesting needs token address, but token needs vesting address for mint split.
  // So deploy a temporary TeamVesting with a dummy token first? The current RovifyToken
  // constructor requires teamVesting address. We'll deploy TeamVesting with a placeholder token,
  // then deploy RovifyToken, then re-deploy TeamVesting bound to the actual token and keep the final one.
  // Instead, we can first deploy a minimal TeamVesting pointing to deployer as token, then redeploy.
  // Simpler: deploy a TeamVesting after token deploy but pass a precomputed address for TeamVesting is not trivial.
  // We'll deploy TeamVesting with token set to deployer temporarily just for compilation, but we won't use it.

  const tmpTeamVesting = await deploy("TeamVesting", {
    from: deployer,
    args: [deployer, admin],
    log: true,
    autoMine: true,
  });

  // 2) Deploy RovifyToken with addresses (treasury, ecosystem, teamVesting, admin)
  const rovifyToken = await deploy("RovifyToken", {
    from: deployer,
    args: [treasury, ecosystem, tmpTeamVesting.address, admin],
    log: true,
    autoMine: true,
  });

  // 3) Redeploy TeamVesting with correct token address (final)
  const teamVesting = await deploy("TeamVesting_Final", {
    contract: "TeamVesting",
    from: deployer,
    args: [rovifyToken.address, admin],
    log: true,
    autoMine: true,
  });

  // 4) Deploy BurnMechanism(token, admin) and grant burner role in token via setBurnContract
  const burnMechanism = await deploy("BurnMechanism", {
    from: deployer,
    args: [rovifyToken.address, admin],
    log: true,
    autoMine: true,
  });

  // Set burn contract in RovifyToken
  const token = await ethers.getContractAt("RovifyToken", rovifyToken.address, await ethers.getSigner(deployer));
  const tx = await token.setBurnContract(burnMechanism.address);
  await tx.wait();

  log("Core contracts deployed");
};

export default func;
func.tags = ["Core", "Rovify", "Token"];

