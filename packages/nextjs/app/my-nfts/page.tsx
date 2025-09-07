"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
// import { useReadContract } from "wagmi";
import { ListNFTForm } from "~~/components/marketplace/ListNFTForm";

interface NFT {
  tokenId: string;
  contract: string;
  name: string;
  description: string;
  image: string;
  attributes: any[];
}

export default function MyNFTsPage() {
  const { address } = useAccount();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [showListForm, setShowListForm] = useState(false);

  // In a real implementation, you would fetch user's NFTs from multiple contracts
  // For now, we'll simulate with some mock data
  const mockNFTs: NFT[] = [
    {
      tokenId: "1",
      contract: "0x123...",
      name: "My First NFT",
      description: "This is my first NFT",
      image: "https://via.placeholder.com/300x300",
      attributes: [
        { trait_type: "Color", value: "Blue" },
        { trait_type: "Rarity", value: "Common" },
      ],
    },
    {
      tokenId: "2",
      contract: "0x456...",
      name: "Cool Artwork",
      description: "A cool piece of digital art",
      image: "https://via.placeholder.com/300x300",
      attributes: [
        { trait_type: "Style", value: "Abstract" },
        { trait_type: "Rarity", value: "Rare" },
      ],
    },
  ];

  if (!address) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-base-content/70">Please connect your wallet to view your NFTs.</p>
        </div>
      </div>
    );
  }

  const handleListNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setShowListForm(true);
  };

  const handleListed = () => {
    setShowListForm(false);
    setSelectedNFT(null);
    // Refresh the NFT list
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">My NFTs</h1>
          <p className="text-base-content/70">
            View and manage your NFT collection. List them for sale in the marketplace.
          </p>
        </div>

        {mockNFTs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold mb-2">No NFTs Found</h3>
            <p className="text-base-content/70 mb-6">You don&apos;t own any NFTs yet. Start by minting some!</p>
            <a href="/mint" className="btn btn-primary">
              Mint Your First NFT
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockNFTs.map(nft => (
              <div key={`${nft.contract}-${nft.tokenId}`} className="card bg-base-100 shadow-xl">
                <figure className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nft.image} alt={nft.name} className="w-full h-64 object-cover" />

                  {/* Contract Badge */}
                  <div className="absolute top-4 left-4">
                    <div className="badge badge-primary">
                      {nft.contract.slice(0, 6)}...{nft.contract.slice(-4)}
                    </div>
                  </div>
                </figure>

                <div className="card-body">
                  <h2 className="card-title">{nft.name}</h2>
                  <p className="text-sm text-base-content/70 line-clamp-2">{nft.description}</p>

                  {/* Attributes */}
                  {nft.attributes && nft.attributes.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Attributes:</div>
                      <div className="flex flex-wrap gap-1">
                        {nft.attributes.slice(0, 2).map((attr, index) => (
                          <div key={index} className="badge badge-outline badge-sm">
                            {attr.trait_type}: {attr.value}
                          </div>
                        ))}
                        {nft.attributes.length > 2 && (
                          <div className="badge badge-outline badge-sm">+{nft.attributes.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-between mt-4">
                    <div className="text-xs text-base-content/50">Token ID: {nft.tokenId}</div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => handleListNFT(nft)}>
                        List for Sale
                      </button>
                      <button className="btn btn-outline btn-sm">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List NFT Modal */}
        {showListForm && selectedNFT && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">List NFT for Sale</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowListForm(false)}>
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center space-x-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedNFT.image} alt={selectedNFT.name} className="w-16 h-16 object-cover rounded" />
                  <div>
                    <h4 className="font-medium">{selectedNFT.name}</h4>
                    <p className="text-sm text-base-content/70">Token ID: {selectedNFT.tokenId}</p>
                  </div>
                </div>
              </div>

              <ListNFTForm tokenId={selectedNFT.tokenId} nftContract={selectedNFT.contract} onListed={handleListed} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
