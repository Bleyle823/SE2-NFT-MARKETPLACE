"use client";

import React, { useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useAccount } from "wagmi";

interface ListNFTFormProps {
  tokenId: string;
  nftContract: string;
  onListed?: () => void;
}

export function ListNFTForm({ tokenId, nftContract, onListed }: ListNFTFormProps) {
  const { address } = useAccount();
  const [price, setPrice] = useState("");
  const [isListing, setIsListing] = useState(false);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleListNFT = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      alert("Please enter a valid price");
      return;
    }

    if (!writeContract) return;

    setIsListing(true);
    try {
      await writeContract({
        address: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "nftContract", type: "address" },
              { internalType: "uint256", name: "tokenId", type: "uint256" },
              { internalType: "uint256", name: "price", type: "uint256" },
            ],
            name: "listItem",
            outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "listItem",
        args: [
          nftContract as `0x${string}`,
          BigInt(tokenId),
          BigInt(Math.floor(parseFloat(price) * 1e18)), // Convert ETH to Wei
        ],
      });
    } catch (error) {
      console.error("Listing failed:", error);
      alert("Listing failed. Please try again.");
    } finally {
      setIsListing(false);
    }
  };

  React.useEffect(() => {
    if (isConfirmed && onListed) {
      onListed();
    }
  }, [isConfirmed, onListed]);

  return (
    <div className="p-6 bg-base-100 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">List NFT for Sale</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Price (ETH)</label>
          <input
            type="number"
            placeholder="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="input input-bordered w-full"
            min="0"
            step="0.001"
          />
        </div>

        <div className="text-center">
          <button
            className={`btn btn-primary ${isListing || isConfirming ? "loading" : ""}`}
            onClick={handleListNFT}
            disabled={isListing || isConfirming || isConfirmed || !address}
          >
            {isListing || isConfirming ? "Listing..." : isConfirmed ? "Listed!" : "List NFT"}
          </button>
        </div>

        {hash && (
          <div className="mt-4 p-3 bg-base-200 rounded text-sm">
            <div>Transaction: {hash.slice(0, 10)}...</div>
            {isConfirming && <div className="text-warning">Confirming...</div>}
            {isConfirmed && <div className="text-success">Listed successfully!</div>}
          </div>
        )}
      </div>
    </div>
  );
}
