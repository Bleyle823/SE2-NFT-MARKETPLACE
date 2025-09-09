"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { getIPFSUrl } from "~~/services/pinata";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface MarketplaceListing {
  ticketId: bigint;
  seller: string;
  price: bigint;
  isActive: boolean;
}

interface Ticket {
  id: bigint;
  eventId: bigint;
  ticketNumber: bigint;
  metadataURI: string;
}

interface Event {
  id: bigint;
  name: string;
  description: string;
  eventDate: bigint;
  ticketPrice: bigint;
  maxSupply: bigint;
  soldTickets: bigint;
  organizer: string;
  isActive: boolean;
  imageCID: string;
}

export const Marketplace = () => {
  const { address } = useAccount();
  const [loadingPurchases, setLoadingPurchases] = useState<Record<string, boolean>>({});

  const { data: activeListings } = useScaffoldReadContract({
    contractName: "EventTicketNFT",
    functionName: "getActiveListings",
  });

  const { data: events } = useScaffoldReadContract({
    contractName: "EventTicketNFT",
    functionName: "getAllEvents",
  });

  const { writeContractAsync: writeEventTicketNFTAsync, isMining } = useScaffoldWriteContract("EventTicketNFT");

  const useMarketplaceListing = (ticketId: bigint | undefined) => {
    return useScaffoldReadContract({
      contractName: "EventTicketNFT",
      functionName: "getMarketplaceListing",
      args: ticketId ? [ticketId] : undefined,
    });
  };

  const useTicketInfo = (ticketId: bigint | undefined) => {
    return useScaffoldReadContract({
      contractName: "EventTicketNFT",
      functionName: "getTicket",
      args: ticketId ? [ticketId] : undefined,
    });
  };

  const handleBuyTicket = async (ticketId: bigint, price: bigint) => {
    try {
      setLoadingPurchases(prev => ({ ...prev, [ticketId.toString()]: true }));

      await writeEventTicketNFTAsync({
        functionName: "buyListedTicket",
        args: [ticketId],
        value: price,
      });

      alert("Ticket purchased successfully!");
    } catch (error) {
      console.error("Error buying ticket:", error);
      alert("Error buying ticket. Please try again.");
    } finally {
      setLoadingPurchases(prev => ({ ...prev, [ticketId.toString()]: false }));
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getEventInfo = (eventId: bigint): Event | undefined => {
    return events?.find((event: Event) => event.id === eventId);
  };

  const isEventPast = (eventDate: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    return Number(eventDate) <= now;
  };

  if (!address) {
    return (
      <div className="text-center py-8">
        <p>Please connect your wallet to view the marketplace.</p>
      </div>
    );
  }

  if (!activeListings || activeListings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-2xl font-bold mb-2">No Tickets Listed</h3>
        <p className="text-gray-600">Check back later for tickets available for resale!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-center">Marketplace</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeListings.map((ticketId: bigint) => {
          return <MarketplaceCard key={ticketId.toString()} ticketId={ticketId} />;
        })}
      </div>
    </div>
  );

  function MarketplaceCard({ ticketId }: { ticketId: bigint }) {
    const { data: listing } = useMarketplaceListing(ticketId);
    const { data: ticketInfo } = useTicketInfo(ticketId);

    if (!listing || !ticketInfo || !listing.isActive) {
      return null;
    }

    const eventInfo = getEventInfo(ticketInfo.eventId);
    const eventPast = eventInfo ? isEventPast(eventInfo.eventDate) : false;
    const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();
    const canBuy = !eventPast && !isOwnListing;

    return (
      <div className="card bg-base-100 shadow-xl">
        {eventInfo?.imageCID && (
          <figure className="relative h-32">
            <img
              src={getIPFSUrl(eventInfo.imageCID)}
              alt={eventInfo.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <div className="badge badge-secondary">#{ticketInfo.ticketNumber.toString()}</div>
            </div>
          </figure>
        )}
        <div className="card-body">
          <h3 className="card-title text-lg">
            {eventInfo?.name || "Loading..."}
            {!eventInfo?.imageCID && (
              <div className="badge badge-secondary">#{ticketInfo.ticketNumber.toString()}</div>
            )}
          </h3>
          
          {eventInfo && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Event Date:</span>
                <span>{formatDate(eventInfo.eventDate)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-semibold">Original Price:</span>
                <span className="font-mono">{formatEther(eventInfo.ticketPrice)} ETH</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-semibold">Sale Price:</span>
                <span className="font-mono text-lg font-bold text-primary">
                  {formatEther(listing.price)} ETH
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-semibold">Seller:</span>
                <span className="font-mono text-xs">
                  {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1 mt-3">
            {eventPast && (
              <div className="badge badge-neutral badge-sm">Past Event</div>
            )}
            {isOwnListing && (
              <div className="badge badge-info badge-sm">Your Listing</div>
            )}
            {!eventPast && !isOwnListing && (
              <div className="badge badge-success badge-sm">Available</div>
            )}
          </div>

          <div className="card-actions justify-end mt-4">
            {canBuy ? (
              <button
                onClick={() => handleBuyTicket(ticketId, listing.price)}
                disabled={loadingPurchases[ticketId.toString()] || isMining}
                className="btn btn-primary btn-sm"
              >
                {loadingPurchases[ticketId.toString()] ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Buying...
                  </>
                ) : (
                  "Buy Ticket"
                )}
              </button>
            ) : isOwnListing ? (
              <div className="badge badge-info">Your listing</div>
            ) : eventPast ? (
              <div className="badge badge-neutral">Event ended</div>
            ) : (
              <div className="badge badge-error">Cannot buy</div>
            )}
          </div>
        </div>
      </div>
    );
  }
};
