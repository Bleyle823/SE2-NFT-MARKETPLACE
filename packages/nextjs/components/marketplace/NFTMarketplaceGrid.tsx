"use client";

import React, { useEffect, useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { NFTMarketplaceCard } from "./NFTMarketplaceCard";
import { useReadContract } from "wagmi";

interface NFTMarketplaceGridProps {
  filters: {
    priceRange: [number, number];
    collection: string;
    sortBy: string;
    searchQuery: string;
  };
}

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

export function NFTMarketplaceGrid({ filters }: NFTMarketplaceGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get active listings from contract
  const { data: activeListings, refetch } = useReadContract({
    address: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT as `0x${string}`,
    abi: [
      {
        inputs: [],
        name: "getActiveListings",
        outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getActiveListings",
  });

  // Fetch listing details for each active listing
  useEffect(() => {
    const fetchListings = async () => {
      if (!activeListings || activeListings.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const listingPromises = activeListings.map(async (listingId: string) => {
          // In a real implementation, you would fetch from The Graph or make multiple contract calls
          // For now, we'll simulate the data structure
          return {
            listingId,
            tokenId: "1", // This would come from contract call
            nftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT as string,
            seller: "0x123...", // This would come from contract call
            price: "0.1", // This would come from contract call
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

        const fetchedListings = await Promise.all(listingPromises);
        setListings(fetchedListings);
      } catch (err) {
        setError("Failed to fetch listings");
        console.error("Error fetching listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [activeListings]);

  // Filter and sort listings
  const filteredListings = listings
    .filter(listing => {
      const price = parseFloat(listing.price);
      return (
        price >= filters.priceRange[0] &&
        price <= filters.priceRange[1] &&
        (filters.collection === "all" || listing.nftContract === filters.collection) &&
        (filters.searchQuery === "" ||
          listing.tokenId.includes(filters.searchQuery) ||
          listing.seller.toLowerCase().includes(filters.searchQuery.toLowerCase()))
      );
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "priceLowToHigh":
          return parseFloat(a.price) - parseFloat(b.price);
        case "priceHighToLow":
          return parseFloat(b.price) - parseFloat(a.price);
        case "recentlyListed":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">❌ {error}</div>
        <button onClick={() => refetch()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (filteredListings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-2xl font-bold mb-2">No NFTs Found</h3>
        <p className="text-base-content/70 mb-6">
          {listings.length === 0 ? "No NFTs are currently listed for sale." : "No NFTs match your current filters."}
        </p>
        {listings.length > 0 && (
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredListings.map(listing => (
        <NFTMarketplaceCard
          key={listing.listingId}
          listing={listing}
          onPurchase={() => {
            // Handle purchase logic
            console.log("Purchase:", listing.listingId);
          }}
        />
      ))}
    </div>
  );
}
