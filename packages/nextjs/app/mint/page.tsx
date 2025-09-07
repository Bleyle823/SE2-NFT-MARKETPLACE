"use client";

import React, { useEffect, useState } from "react";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useAccount } from "wagmi";
import { useCollectionsData } from "~~/hooks/useCollectionData";

interface Collection {
  address: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  maxSupply: bigint;
  currentSupply: bigint;
  mintPrice: bigint;
  mintingActive: boolean;
}

export default function MintPage() {
  const { address } = useAccount();
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [nftData, setNftData] = useState({
    name: "",
    description: "",
    image: "",
    attributes: "",
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isMinting, setIsMinting] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read collections from factory contract
  const {
    data: allCollections,
    isLoading: isLoadingAllCollections,
    error: allCollectionsError,
  } = useReadContract({
    address: process.env.NEXT_PUBLIC_FACTORY_CONTRACT as `0x${string}`,
    abi: [
      {
        inputs: [],
        name: "getAllCollections",
        outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getAllCollections",
  });

  // Use the custom hook to load collection data
  const {
    data: collectionsData,
    loading: loadingCollectionsData,
    error: collectionsDataError,
  } = useCollectionsData(allCollections || []);

  // Update collections state when data changes
  useEffect(() => {
    if (collectionsData) {
      setCollections(collectionsData);
    }
    setIsLoadingCollections(isLoadingAllCollections || loadingCollectionsData);
  }, [collectionsData, isLoadingAllCollections, loadingCollectionsData]);

  // Debug logging
  useEffect(() => {
    console.log("Debug - Factory Contract Address:", process.env.NEXT_PUBLIC_FACTORY_CONTRACT);
    console.log("Debug - All Collections:", allCollections);
    console.log("Debug - Collections Data:", collectionsData);
    console.log("Debug - Loading States:", { isLoadingAllCollections, loadingCollectionsData });
    console.log("Debug - Errors:", { allCollectionsError, collectionsDataError });
  }, [
    allCollections,
    collectionsData,
    isLoadingAllCollections,
    loadingCollectionsData,
    allCollectionsError,
    collectionsDataError,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNftData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMint = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedCollection) {
      alert("Please select a collection");
      return;
    }

    if (!nftData.name || !nftData.description || !nftData.image) {
      alert("Please fill in all required fields");
      return;
    }

    const collection = collections.find(c => c.address === selectedCollection);
    if (!collection) {
      alert("Selected collection not found");
      return;
    }

    if (!collection.mintingActive) {
      alert("Minting is not active for this collection");
      return;
    }

    if (collection.currentSupply >= collection.maxSupply) {
      alert("Collection has reached maximum supply");
      return;
    }

    if (!writeContract) return;

    setIsMinting(true);
    try {
      // Create metadata object
      const metadata = {
        name: nftData.name,
        description: nftData.description,
        image: nftData.image,
        attributes: nftData.attributes ? JSON.parse(nftData.attributes) : [],
      };

      // In a real implementation, you would upload this metadata to IPFS
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      await writeContract({
        address: selectedCollection as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "string", name: "uri", type: "string" }],
            name: "mint",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "payable",
            type: "function",
          },
        ],
        functionName: "mint",
        args: [tokenURI],
        value: collection.mintPrice,
      });
    } catch (error) {
      console.error("Minting failed:", error);
      alert("Minting failed. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  const selectedCollectionData = collections.find(c => c.address === selectedCollection);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-base-100 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Mint NFT</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-6">
              {/* Debug Information */}
              <div className="mb-4 p-3 bg-base-200 rounded text-sm">
                <div className="font-semibold mb-1">Debug Info:</div>
                <div>Factory: {process.env.NEXT_PUBLIC_FACTORY_CONTRACT || "Not set"}</div>
                <div>Collections: {allCollections ? allCollections.length : "Loading..."}</div>
                <div>Data: {collectionsData ? collectionsData.length : "Loading..."}</div>
                {allCollectionsError && <div className="text-error">Error: {allCollectionsError.message}</div>}
              </div>

              {/* Collection Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Collection *</label>
                {isLoadingCollections ? (
                  <div className="loading loading-spinner loading-md"></div>
                ) : collections.length === 0 ? (
                  <div className="alert alert-warning">
                    <span>No collections available. Create a collection first!</span>
                  </div>
                ) : (
                  <select
                    value={selectedCollection}
                    onChange={e => setSelectedCollection(e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="">Choose a collection...</option>
                    {collections.map(collection => (
                      <option key={collection.address} value={collection.address}>
                        {collection.name} ({collection.symbol}) - {Number(collection.currentSupply)}/
                        {Number(collection.maxSupply)} minted
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Collection Info */}
              {selectedCollectionData && (
                <div className="p-4 bg-base-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Collection Information</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Name:</span> {selectedCollectionData.name}
                    </div>
                    <div>
                      <span className="font-medium">Symbol:</span> {selectedCollectionData.symbol}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span> {selectedCollectionData.description}
                    </div>
                    <div>
                      <span className="font-medium">Supply:</span> {Number(selectedCollectionData.currentSupply)}/
                      {Number(selectedCollectionData.maxSupply)}
                    </div>
                    <div>
                      <span className="font-medium">Mint Price:</span>{" "}
                      {(Number(selectedCollectionData.mintPrice) / 1e18).toFixed(4)} ETH
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span
                        className={`ml-1 badge ${selectedCollectionData.mintingActive ? "badge-success" : "badge-error"}`}
                      >
                        {selectedCollectionData.mintingActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* NFT Details */}
              <div>
                <label className="block text-sm font-medium mb-2">NFT Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="My Awesome NFT"
                  value={nftData.name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  name="description"
                  placeholder="Describe your NFT..."
                  value={nftData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Image URL *</label>
                <input
                  type="url"
                  name="image"
                  placeholder="https://example.com/nft-image.jpg"
                  value={nftData.image}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Attributes (JSON)</label>
                <textarea
                  name="attributes"
                  placeholder='[{"trait_type": "Color", "value": "Blue"}, {"trait_type": "Rarity", "value": "Common"}]'
                  value={nftData.attributes}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full h-20"
                />
                <p className="text-sm text-base-content/70 mt-1">Optional: JSON array of attributes for your NFT</p>
              </div>

              <div className="text-center">
                <button
                  className={`btn btn-primary btn-lg ${isMinting || isConfirming ? "loading" : ""}`}
                  onClick={handleMint}
                  disabled={isMinting || isConfirming || isConfirmed || !address || !selectedCollection}
                >
                  {isMinting || isConfirming ? "Minting..." : isConfirmed ? "Minted!" : "Mint NFT"}
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">NFT Preview</h2>

              <div className="card bg-base-200 shadow-xl">
                <figure className="relative">
                  {nftData.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nftData.image}
                      alt="NFT Preview"
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
                  <h3 className="card-title">{nftData.name || "NFT Name"}</h3>

                  <p className="text-sm text-base-content/70">
                    {nftData.description || "NFT description will appear here"}
                  </p>

                  {selectedCollectionData && (
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">Collection:</span> {selectedCollectionData.name}
                      </div>
                      <div>
                        <span className="font-medium">Price:</span>{" "}
                        {(Number(selectedCollectionData.mintPrice) / 1e18).toFixed(4)} ETH
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Status */}
              {hash && (
                <div className="p-4 bg-base-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Transaction Status</h3>
                  <div className="text-sm space-y-1">
                    <div>Transaction Hash: {hash}</div>
                    {isConfirming && <div className="text-warning">⏳ Confirming transaction...</div>}
                    {isConfirmed && <div className="text-success">✅ NFT minted successfully!</div>}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-4 bg-info/10 rounded-lg">
                <h3 className="font-semibold mb-2">How to mint an NFT:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Select a collection from the dropdown</li>
                  <li>Fill in the NFT name and description</li>
                  <li>Provide a URL to an image</li>
                  <li>Optionally add attributes in JSON format</li>
                  <li>Click &quot;Mint NFT&quot; to create your NFT</li>
                  <li>Pay the minting fee and wait for confirmation</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
