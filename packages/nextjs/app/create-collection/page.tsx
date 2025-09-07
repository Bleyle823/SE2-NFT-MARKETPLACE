"use client";

import React, { useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useAccount } from "wagmi";

export default function CreateCollectionPage() {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    image: "",
    maxSupply: "",
    mintPrice: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCollection = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    // Validate form data
    if (!formData.name || !formData.symbol || !formData.description || !formData.maxSupply) {
      alert("Please fill in all required fields");
      return;
    }

    const maxSupply = parseInt(formData.maxSupply);
    const mintPrice = parseFloat(formData.mintPrice) || 0;

    if (maxSupply <= 0) {
      alert("Max supply must be greater than 0");
      return;
    }

    if (mintPrice < 0) {
      alert("Mint price cannot be negative");
      return;
    }

    if (!writeContract) return;

    setIsCreating(true);
    try {
      await writeContract({
        address: process.env.NEXT_PUBLIC_FACTORY_CONTRACT as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "string", name: "name", type: "string" },
              { internalType: "string", name: "symbol", type: "string" },
              { internalType: "string", name: "description", type: "string" },
              { internalType: "string", name: "image", type: "string" },
              { internalType: "uint256", name: "maxSupply", type: "uint256" },
              { internalType: "uint256", name: "mintPrice", type: "uint256" },
            ],
            name: "createCollection",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "createCollection",
        args: [
          formData.name,
          formData.symbol,
          formData.description,
          formData.image,
          BigInt(maxSupply),
          BigInt(Math.floor(mintPrice * 1e18)), // Convert ETH to Wei
        ],
      });
    } catch (error) {
      console.error("Collection creation failed:", error);
      alert("Collection creation failed. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-base-100 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Create NFT Collection</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="My Awesome Collection"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Symbol *</label>
                <input
                  type="text"
                  name="symbol"
                  placeholder="MAC"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  maxLength={10}
                  required
                />
                <p className="text-sm text-base-content/70 mt-1">
                  Short symbol for your collection (max 10 characters)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  name="description"
                  placeholder="Describe your NFT collection..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Collection Image URL</label>
                <input
                  type="url"
                  name="image"
                  placeholder="https://example.com/collection-image.jpg"
                  value={formData.image}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                />
                <p className="text-sm text-base-content/70 mt-1">URL to an image representing your collection</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Supply *</label>
                  <input
                    type="number"
                    name="maxSupply"
                    placeholder="1000"
                    value={formData.maxSupply}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    min="1"
                    required
                  />
                  <p className="text-sm text-base-content/70 mt-1">Maximum number of NFTs in this collection</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mint Price (ETH)</label>
                  <input
                    type="number"
                    name="mintPrice"
                    placeholder="0.01"
                    value={formData.mintPrice}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    min="0"
                    step="0.001"
                  />
                  <p className="text-sm text-base-content/70 mt-1">Price to mint each NFT (0 for free)</p>
                </div>
              </div>

              <div className="text-center">
                <button
                  className={`btn btn-primary btn-lg ${isCreating || isConfirming ? "loading" : ""}`}
                  onClick={handleCreateCollection}
                  disabled={isCreating || isConfirming || isConfirmed || !address}
                >
                  {isCreating || isConfirming ? "Creating..." : isConfirmed ? "Created!" : "Create Collection"}
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Collection Preview</h2>

              <div className="card bg-base-200 shadow-xl">
                <figure className="relative">
                  {formData.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.image}
                      alt="Collection Preview"
                      className="w-full h-64 object-cover"
                      onError={e => {
                        e.currentTarget.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=";
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <span className="text-6xl">🎨</span>
                    </div>
                  )}
                </figure>

                <div className="card-body">
                  <h3 className="card-title">{formData.name || "Collection Name"}</h3>

                  <p className="text-sm text-base-content/70">
                    {formData.description || "Collection description will appear here"}
                  </p>

                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">Symbol:</span> {formData.symbol || "SYMBOL"}
                    </div>
                    <div>
                      <span className="font-medium">Max Supply:</span> {formData.maxSupply || "0"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">Mint Price:</span> {formData.mintPrice || "0"} ETH
                    </div>
                    <div className="badge badge-primary">New Collection</div>
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              {hash && (
                <div className="p-4 bg-base-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Transaction Status</h3>
                  <div className="text-sm space-y-1">
                    <div>Transaction Hash: {hash}</div>
                    {isConfirming && <div className="text-warning">⏳ Confirming transaction...</div>}
                    {isConfirmed && <div className="text-success">✅ Collection created successfully!</div>}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-4 bg-info/10 rounded-lg">
                <h3 className="font-semibold mb-2">How to create a collection:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Fill in the collection name and symbol</li>
                  <li>Add a description and optional image</li>
                  <li>Set the maximum supply of NFTs</li>
                  <li>Set the mint price (0 for free minting)</li>
                  <li>Click &quot;Create Collection&quot; to deploy your NFT contract</li>
                  <li>Once created, you can mint NFTs from this collection</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
