"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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
}

export const MyTickets = () => {
  const { address } = useAccount();
  const [listingPrices, setListingPrices] = useState<Record<string, string>>({});
  const [loadingTickets, setLoadingTickets] = useState<Record<string, boolean>>({});

  const { data: balance } = useScaffoldReadContract({
    contractName: "EventTicketNFT",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: events } = useScaffoldReadContract({
    contractName: "EventTicketNFT",
    functionName: "getAllEvents",
  });

  const { writeContractAsync: writeEventTicketNFTAsync, isMining } = useScaffoldWriteContract("EventTicketNFT");

  // Get all tickets owned by the user
  const getTicketIds = () => {
    if (!balance || !address) return [];
    const ticketIds = [];
    for (let i = 0; i < Number(balance); i++) {
      ticketIds.push(i);
    }
    return ticketIds;
  };

  const useTicketData = (tokenIndex: number) => {
    return useScaffoldReadContract({
      contractName: "EventTicketNFT",
      functionName: "tokenOfOwnerByIndex",
      args: [address, BigInt(tokenIndex)],
    });
  };

  const useTicketInfo = (ticketId: bigint | undefined) => {
    return useScaffoldReadContract({
      contractName: "EventTicketNFT",
      functionName: "getTicket",
      args: ticketId ? [ticketId] : undefined,
    });
  };

  const useMarketplaceListing = (ticketId: bigint | undefined) => {
    return useScaffoldReadContract({
      contractName: "EventTicketNFT",
      functionName: "getMarketplaceListing",
      args: ticketId ? [ticketId] : undefined,
    });
  };

  const handleListTicket = async (ticketId: bigint) => {
    try {
      const priceStr = listingPrices[ticketId.toString()];
      if (!priceStr || parseFloat(priceStr) <= 0) {
        alert("Please enter a valid price");
        return;
      }

      setLoadingTickets(prev => ({ ...prev, [ticketId.toString()]: true }));

      await writeEventTicketNFTAsync({
        functionName: "listTicket",
        args: [ticketId, parseEther(priceStr)],
      });

      setListingPrices(prev => ({ ...prev, [ticketId.toString()]: "" }));
      alert("Ticket listed successfully!");
    } catch (error) {
      console.error("Error listing ticket:", error);
      alert("Error listing ticket. Please try again.");
    } finally {
      setLoadingTickets(prev => ({ ...prev, [ticketId.toString()]: false }));
    }
  };

  const handleCancelListing = async (ticketId: bigint) => {
    try {
      setLoadingTickets(prev => ({ ...prev, [ticketId.toString()]: true }));

      await writeEventTicketNFTAsync({
        functionName: "cancelListing",
        args: [ticketId],
      });

      alert("Listing cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling listing:", error);
      alert("Error cancelling listing. Please try again.");
    } finally {
      setLoadingTickets(prev => ({ ...prev, [ticketId.toString()]: false }));
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
        <p>Please connect your wallet to view your tickets.</p>
      </div>
    );
  }

  if (!balance || balance === 0n) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">🎟️</div>
        <h3 className="text-2xl font-bold mb-2">No Tickets Yet</h3>
        <p className="text-gray-600">Purchase tickets from the events page to see them here!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-center">My Tickets</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getTicketIds().map((tokenIndex) => {
          return <TicketCard key={tokenIndex} tokenIndex={tokenIndex} />;
        })}
      </div>
    </div>
  );

  function TicketCard({ tokenIndex }: { tokenIndex: number }) {
    const { address } = useAccount();
    const { data: ticketId } = useTicketData(tokenIndex);
    const { data: ticketInfo } = useTicketInfo(ticketId);
    const { data: marketplaceListing } = useMarketplaceListing(ticketId);

    if (!ticketId || !ticketInfo) {
      return (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      );
    }

    const eventInfo = getEventInfo(ticketInfo.eventId);
    const isListed = marketplaceListing?.isActive;
    const eventPast = eventInfo ? isEventPast(eventInfo.eventDate) : false;
    const canList = !isListed && !eventPast;

    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg">
            {eventInfo?.name || "Loading..."}
            <div className="badge badge-secondary">#{ticketInfo.ticketNumber.toString()}</div>
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
            </div>
          )}

          <div className="flex flex-wrap gap-1 mt-3">
            {eventPast && (
              <div className="badge badge-neutral badge-sm">Past Event</div>
            )}
            {isListed && (
              <div className="badge badge-warning badge-sm">Listed for Sale</div>
            )}
          </div>

          {isListed && marketplaceListing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">Listed Price:</span>
                <span className="font-mono text-sm">{formatEther(marketplaceListing.price)} ETH</span>
              </div>
              <button
                onClick={() => handleCancelListing(ticketId)}
                disabled={loadingTickets[ticketId.toString()] || isMining}
                className="btn btn-sm btn-outline btn-error w-full mt-2"
              >
                {loadingTickets[ticketId.toString()] ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Cancelling...
                  </>
                ) : (
                  "Cancel Listing"
                )}
              </button>
            </div>
          )}

          {canList && (
            <div className="mt-4 space-y-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-semibold">List for Sale (ETH)</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.1"
                  value={listingPrices[ticketId.toString()] || ""}
                  onChange={(e) => 
                    setListingPrices(prev => ({ 
                      ...prev, 
                      [ticketId.toString()]: e.target.value 
                    }))
                  }
                  className="input input-bordered input-sm"
                />
              </div>
              <button
                onClick={() => handleListTicket(ticketId)}
                disabled={loadingTickets[ticketId.toString()] || isMining}
                className="btn btn-sm btn-primary w-full"
              >
                {loadingTickets[ticketId.toString()] ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Listing...
                  </>
                ) : (
                  "List for Sale"
                )}
              </button>
            </div>
          )}

          {eventPast && !isListed && (
            <div className="mt-4">
              <div className="badge badge-info badge-sm w-full">Event has ended</div>
            </div>
          )}
        </div>
      </div>
    );
  }
};
