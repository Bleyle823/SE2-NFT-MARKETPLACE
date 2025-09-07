"use client";

import React, { useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface Listing {
  listingId: string;
  tokenId: string;
  nftContract: string;
  seller: string;
  price: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NFTMarketplaceCardProps {
  listing: Listing;
  onPurchase: () => void;
}

export function NFTMarketplaceCard({ listing }: NFTMarketplaceCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get NFT metadata (tokenURI)
  const { data: tokenURI } = useScaffoldReadContract({
    contractName: "MyToken",
    functionName: "tokenURI",
    args: [BigInt(listing.tokenId)],
  });

  // Get NFT owner
  const { data: owner } = useScaffoldReadContract({
    contractName: "MyToken",
    functionName: "ownerOf",
    args: [BigInt(listing.tokenId)],
  });

  // Purchase function
  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handlePurchase = async () => {
    if (!writeContract) return;

    setIsPurchasing(true);
    try {
      await writeContract({
        address: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "bytes32", name: "listingId", type: "bytes32" }],
            name: "buyItem",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
        functionName: "buyItem",
        args: [listing.listingId as `0x${string}`],
        value: BigInt(Math.floor(parseFloat(listing.price) * 1e18)),
      });
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Parse metadata if available
  const metadata = tokenURI ? JSON.parse(tokenURI) : null;

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <figure className="relative">
        {metadata?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.image}
            alt={metadata.name || `NFT #${listing.tokenId}`}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <span className="text-4xl">🎨</span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
          {listing.price} ETH
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <div className="badge badge-success">For Sale</div>
        </div>
      </figure>

      <div className="card-body">
        <h2 className="card-title">{metadata?.name || `NFT #${listing.tokenId}`}</h2>

        {metadata?.description && <p className="text-sm text-base-content/70 line-clamp-2">{metadata.description}</p>}

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-base-content/50">Seller:</span>
            <Address address={listing.seller as `0x${string}`} />
          </div>
          <div>
            <span className="text-base-content/50">Owner:</span>
            <Address address={owner as `0x${string}`} />
          </div>
        </div>

        {/* Attributes */}
        {metadata?.attributes && metadata.attributes.length > 0 && (
          <div className="collapse collapse-arrow">
            <input type="checkbox" checked={showDetails} onChange={e => setShowDetails(e.target.checked)} />
            <div className="collapse-title text-sm font-medium">View Attributes ({metadata.attributes.length})</div>
            <div className="collapse-content">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {metadata.attributes.slice(0, 4).map((attr: any, index: number) => (
                  <div key={index} className="text-xs">
                    <div className="font-medium">{attr.trait_type}</div>
                    <div className="text-base-content/70">{attr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="card-actions justify-between items-center mt-4">
          <div className="text-xs text-base-content/50">Listed {new Date(listing.createdAt).toLocaleDateString()}</div>

          <button
            className={`btn btn-primary btn-sm ${isPurchasing || isConfirming ? "loading" : ""}`}
            onClick={handlePurchase}
            disabled={isPurchasing || isConfirming || isConfirmed}
          >
            {isPurchasing || isConfirming ? "Processing..." : isConfirmed ? "Purchased!" : "Buy Now"}
          </button>
        </div>

        {/* Transaction Status */}
        {hash && (
          <div className="mt-2 p-2 bg-base-200 rounded text-xs">
            <div>Transaction: {hash.slice(0, 10)}...</div>
            {isConfirming && <div className="text-warning">Confirming...</div>}
            {isConfirmed && <div className="text-success">Confirmed!</div>}
          </div>
        )}
      </div>
    </div>
  );
}
