"use client";

import React, { useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

// // import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function CreateNFTPage() {
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftImageUrl, setNftImageUrl] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Get the NFT contract address
  // const { data: nftContractAddress } = useScaffoldReadContract({
  //   contractName: "MyToken",
  //   functionName: "name",
  // });

  const handleMint = async () => {
    if (!nftName || !nftDescription || !nftImageUrl) {
      alert("Please fill in all fields");
      return;
    }

    if (!writeContract) return;

    setIsMinting(true);
    try {
      // Create metadata object
      const metadata = {
        name: nftName,
        description: nftDescription,
        image: nftImageUrl,
        attributes: [
          {
            trait_type: "Created By",
            value: "NFT Marketplace",
          },
        ],
      };

      // In a real implementation, you would upload this metadata to IPFS
      // For now, we'll use a placeholder URI
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      await writeContract({
        address: process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "to", type: "address" },
              { internalType: "string", name: "uri", type: "string" },
            ],
            name: "safeMint",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "safeMint",
        args: [process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`, tokenURI],
      });
    } catch (error) {
      console.error("Minting failed:", error);
      alert("Minting failed. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-base-100 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Create New NFT</h1>

          <div className="space-y-6">
            {/* NFT Name */}
            <div>
              <label className="block text-sm font-medium mb-2">NFT Name *</label>
              <input
                type="text"
                placeholder="Enter NFT name..."
                value={nftName}
                onChange={e => setNftName(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* NFT Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                placeholder="Enter NFT description..."
                value={nftDescription}
                onChange={e => setNftDescription(e.target.value)}
                className="textarea textarea-bordered w-full h-24"
                required
              />
            </div>

            {/* NFT Image URL */}
            <div>
              <label className="block text-sm font-medium mb-2">Image URL *</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={nftImageUrl}
                onChange={e => setNftImageUrl(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <p className="text-sm text-base-content/70 mt-1">Enter a URL to an image file (JPG, PNG, GIF, etc.)</p>
            </div>

            {/* Preview */}
            {nftImageUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded-lg p-4 bg-base-200">
                  <div className="max-w-xs mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nftImageUrl}
                      alt="NFT Preview"
                      className="w-full h-48 object-cover rounded-lg mb-3"
                      onError={e => {
                        e.currentTarget.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=";
                      }}
                    />
                    <h3 className="font-semibold">{nftName || "Untitled NFT"}</h3>
                    <p className="text-sm text-base-content/70">{nftDescription || "No description"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mint Button */}
            <div className="text-center">
              <button
                className={`btn btn-primary btn-lg ${isMinting || isConfirming ? "loading" : ""}`}
                onClick={handleMint}
                disabled={isMinting || isConfirming || isConfirmed || !nftName || !nftDescription || !nftImageUrl}
              >
                {isMinting || isConfirming ? "Minting..." : isConfirmed ? "Minted!" : "Mint NFT"}
              </button>
            </div>

            {/* Transaction Status */}
            {hash && (
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">Transaction Status</h3>
                <div className="text-sm space-y-1">
                  <div>Transaction Hash: {hash}</div>
                  {isConfirming && <div className="text-warning">⏳ Confirming transaction...</div>}
                  {isConfirmed && <div className="text-success">✅ NFT minted successfully!</div>}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-4 bg-info/10 rounded-lg">
              <h3 className="font-semibold mb-2">How to create an NFT:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Fill in the NFT name and description</li>
                <li>Provide a URL to an image (you can use services like Imgur, IPFS, or any image hosting service)</li>
                <li>Click &quot;Mint NFT&quot; to create your NFT on the blockchain</li>
                <li>Once minted, you can list it for sale in the marketplace</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
