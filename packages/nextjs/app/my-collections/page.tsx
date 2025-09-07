"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
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

export default function MyCollectionsPage() {
  const { address } = useAccount();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read user's collections from factory contract
  const {
    data: userCollections,
    isLoading: isLoadingUserCollections,
    error: userCollectionsError,
  } = useReadContract({
    address: process.env.NEXT_PUBLIC_FACTORY_CONTRACT as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "creator", type: "address" }],
        name: "getCreatorCollections",
        outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getCreatorCollections",
    args: address ? [address] : undefined,
  });

  // Use the custom hook to load collection data
  const {
    data: collectionsData,
    loading: loadingCollectionsData,
    error: collectionsDataError,
  } = useCollectionsData(userCollections || []);

  // Update collections state when data changes
  useEffect(() => {
    if (collectionsData) {
      setCollections(collectionsData);
    }
    setIsLoading(isLoadingUserCollections || loadingCollectionsData);
  }, [collectionsData, isLoadingUserCollections, loadingCollectionsData]);

  // Debug logging
  useEffect(() => {
    console.log("Debug - Factory Contract Address:", process.env.NEXT_PUBLIC_FACTORY_CONTRACT);
    console.log("Debug - User Address:", address);
    console.log("Debug - User Collections:", userCollections);
    console.log("Debug - Collections Data:", collectionsData);
    console.log("Debug - Loading States:", { isLoadingUserCollections, loadingCollectionsData });
    console.log("Debug - Errors:", { userCollectionsError, collectionsDataError });
  }, [
    userCollections,
    collectionsData,
    isLoadingUserCollections,
    loadingCollectionsData,
    userCollectionsError,
    collectionsDataError,
    address,
  ]);

  if (!address) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-base-content/70">Please connect your wallet to view your collections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">My Collections</h1>
          <p className="text-base-content/70">Manage your NFT collections and view their details.</p>
        </div>

        {/* Debug Information */}
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="text-sm space-y-1">
            <div>Factory Contract: {process.env.NEXT_PUBLIC_FACTORY_CONTRACT || "Not set"}</div>
            <div>User Address: {address || "Not connected"}</div>
            <div>User Collections: {userCollections ? userCollections.length : "Loading..."}</div>
            <div>Collections Data: {collectionsData ? collectionsData.length : "Loading..."}</div>
            <div>Loading: {isLoading ? "Yes" : "No"}</div>
            {userCollectionsError && <div className="text-error">Error: {userCollectionsError.message}</div>}
            {collectionsDataError && <div className="text-error">Data Error: {collectionsDataError}</div>}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold mb-2">No Collections Found</h3>
            <p className="text-base-content/70 mb-6">You haven&apos;t created any NFT collections yet.</p>
            <Link href="/create-collection" className="btn btn-primary">
              Create Your First Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(collection => (
              <div key={collection.address} className="card bg-base-100 shadow-xl">
                <figure className="relative">
                  {collection.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={collection.image} alt={collection.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <span className="text-4xl">🎨</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={`badge ${collection.mintingActive ? "badge-success" : "badge-error"}`}>
                      {collection.mintingActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                </figure>

                <div className="card-body">
                  <h2 className="card-title">{collection.name}</h2>
                  <p className="text-sm text-base-content/70 line-clamp-2">{collection.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Symbol:</span>
                      <span className="font-medium">{collection.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Supply:</span>
                      <span className="font-medium">
                        {Number(collection.currentSupply)}/{Number(collection.maxSupply)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Mint Price:</span>
                      <span className="font-medium">{(Number(collection.mintPrice) / 1e18).toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Progress:</span>
                      <span className="font-medium">
                        {((Number(collection.currentSupply) / Number(collection.maxSupply)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-base-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(Number(collection.currentSupply) / Number(collection.maxSupply)) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <div className="card-actions justify-between mt-4">
                    <div className="text-xs text-base-content/50">
                      {collection.address.slice(0, 6)}...{collection.address.slice(-4)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/mint?collection=${collection.address}`} className="btn btn-primary btn-sm">
                        Mint NFT
                      </Link>
                      <Link href={`/marketplace?collection=${collection.address}`} className="btn btn-outline btn-sm">
                        View in Marketplace
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create New Collection Button */}
        <div className="text-center mt-12">
          <Link href="/create-collection" className="btn btn-primary btn-lg">
            Create New Collection
          </Link>
        </div>
      </div>
    </div>
  );
}
