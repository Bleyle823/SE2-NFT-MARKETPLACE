"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";

export default function StakingPage() {
  const { address } = useAccount();
  const [amountEth, setAmountEth] = useState<string>("0");

  const { data: userInfo } = useScaffoldReadContract({
    contractName: "StakingRewards",
    functionName: "getUserInfo",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  const { writeContractAsync: writeStakingAsync, isMining: isMiningStake } = useScaffoldWriteContract({
    contractName: "StakingRewards",
  });

  const { writeContractAsync: writeTokenAsync, isMining: isMiningApprove } = useScaffoldWriteContract({
    contractName: "RovifyToken",
  });

  const [stakedAmount, pendingRewards, tierLevel, boostMultiplier, hasVoting, hasPremium] = useMemo(() => {
    if (!userInfo) return [0n, 0n, 0, 0, false, false] as const;
    // getUserInfo returns (uint256,uint256,uint32,uint16,bool,bool)
    return [
      BigInt(userInfo[0] as any),
      BigInt(userInfo[1] as any),
      Number(userInfo[2]),
      Number(userInfo[3]),
      Boolean(userInfo[4]),
      Boolean(userInfo[5]),
    ] as const;
  }, [userInfo]);

  const approveAndStake = async () => {
    const wei = parseEther(amountEth || "0");
    if (wei <= 0n) return;
    await writeTokenAsync({ functionName: "approve", args: [
      // approve staking contract to pull tokens
      (await import("~~/contracts/deployedContracts")).deployedContracts?.localhost?.StakingRewards?.address ?? "0x",
      wei,
    ] });
    await writeStakingAsync({ functionName: "stake", args: [wei] });
    setAmountEth("0");
  };

  const withdraw = async () => {
    const wei = parseEther(amountEth || "0");
    if (wei <= 0n) return;
    await writeStakingAsync({ functionName: "withdraw", args: [wei] });
    setAmountEth("0");
  };

  const claim = async () => {
    await writeStakingAsync({ functionName: "claimRewards", args: [] });
  };

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Staking</h1>
      <p className="text-sm opacity-70 mb-6">Stake RVFY to earn rewards and unlock tiers.</p>

      <div className="card bg-base-200 shadow-md mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-70">Your address</div>
              <Address address={address} />
            </div>
            <div>
              <div className="text-sm opacity-70">Currently staked</div>
              <div className="text-lg font-semibold">{formatEther(stakedAmount)} RVFY</div>
            </div>
            <div>
              <div className="text-sm opacity-70">Pending rewards</div>
              <div className="text-lg font-semibold">{formatEther(pendingRewards)} RVFY</div>
            </div>
            <div>
              <div className="text-sm opacity-70">Tier / Boost</div>
              <div className="text-lg font-semibold">Tier {tierLevel} · {boostMultiplier / 10}%</div>
            </div>
            <div>
              <div className="text-sm opacity-70">Privileges</div>
              <div className="text-lg font-semibold">{hasVoting ? "Voting" : "-"} · {hasPremium ? "Premium" : "-"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body">
          <div className="mb-2 text-sm">Amount (RVFY)</div>
          <EtherInput value={amountEth} onChange={setAmountEth} placeholder="0.0" disableUSD toggleType="token" />
          <div className="mt-4 flex gap-3">
            <button className="btn btn-primary" onClick={approveAndStake} disabled={isMiningStake || isMiningApprove}>
              {isMiningStake || isMiningApprove ? "Confirming..." : "Approve & Stake"}
            </button>
            <button className="btn" onClick={withdraw} disabled={isMiningStake}>Withdraw</button>
            <button className="btn btn-secondary" onClick={claim} disabled={isMiningStake}>Claim Rewards</button>
          </div>
        </div>
      </div>
    </div>
  );
}
