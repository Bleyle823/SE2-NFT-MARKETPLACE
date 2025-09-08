"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { NFTListingCard } from "~~/components/marketplace/NFTListingCard";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

interface Listing {
  listingId: bigint;
  nftContract: string;
  tokenId: bigint;
  seller: string;
  price: bigint;
  isActive: boolean;
  createdAt: bigint;
}

const Marketplace: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Get marketplace contract
  const { data: marketplaceContract } = useScaffoldContract({
    contractName: "NFTMarketplace",
  });

  // Fetch active listings
  const fetchListings = async () => {
    if (!marketplaceContract) return;
    
    try {
      const activeListings = await marketplaceContract.read.getActiveListings();
      setListings(activeListings);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [marketplaceContract]);

  if (!mounted) return null;

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">NFT Ticket Marketplace</span>
          </h1>
          <p className="text-center text-base-content/70 mb-8">
            Buy and sell event tickets securely on the blockchain
          </p>
        </div>

        {!isConnected || isConnecting ? (
          <div className="flex flex-col items-center gap-4">
            <RainbowKitCustomConnectButton />
            <p className="text-base-content/70">Connect your wallet to view listings</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : listings && listings.length > 0 ? (
          <>
            <div className="flex justify-between items-center px-5 mb-6">
              <div className="text-sm text-base-content/70">
                {listings.length} ticket{listings.length !== 1 ? 's' : ''} available for purchase
              </div>
              <button 
                className="btn btn-sm btn-outline" 
                onClick={fetchListings}
              >
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-5 pb-10">
              {listings.map((listing: Listing) => (
                <NFTListingCard
                  key={listing.listingId.toString()}
                  listingId={listing.listingId}
                  nftContract={listing.nftContract}
                  tokenId={listing.tokenId}
                  seller={listing.seller}
                  price={listing.price}
                  isActive={listing.isActive}
                  onBuySuccess={fetchListings}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No Active Listings</h3>
              <p className="text-base-content/70 mb-4">
                Be the first to list your event tickets for resale!
              </p>
              <div className="flex gap-3 justify-center">
                <a href="/myNFTs" className="btn btn-primary">
                  List Your Tickets
                </a>
                <a href="/events" className="btn btn-secondary">
                  Browse Events
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Marketplace;