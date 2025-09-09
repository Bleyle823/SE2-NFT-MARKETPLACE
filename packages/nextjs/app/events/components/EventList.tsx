"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { getIPFSUrl, createAndUploadTicketMetadata } from "~~/services/pinata";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

export const EventList = () => {
  const [selectedEventId, setSelectedEventId] = useState<bigint | null>(null);

  const { data: events, refetch: refetchEvents } = useScaffoldReadContract({
    contractName: "EventTicketNFT",
    functionName: "getAllEvents",
  });

  const { writeContractAsync: writeEventTicketNFTAsync, isMining } = useScaffoldWriteContract("EventTicketNFT");

  const handleBuyTicket = async (eventId: bigint, ticketPrice: bigint) => {
    try {
      setSelectedEventId(eventId);
      
      // First, buy the ticket
      const result = await writeEventTicketNFTAsync({
        functionName: "buyTicket",
        args: [eventId],
        value: ticketPrice,
      });

      // Get the event details for metadata creation
      const event = events?.find((e: Event) => e.id === eventId);
      if (event && result) {
        try {
          // Create and upload ticket metadata to IPFS
          const ticketNumber = (event.soldTickets + 1n).toString();
          const eventData = {
            name: event.name,
            description: event.description,
            eventDate: formatDate(event.eventDate),
            ticketPrice: formatEther(event.ticketPrice),
            maxSupply: event.maxSupply.toString(),
            eventId: event.id.toString(),
          };

          const metadataCID = await createAndUploadTicketMetadata(
            eventData,
            event.imageCID,
            ticketNumber
          );

          // Note: In a production app, you'd want to get the actual ticket ID from the transaction receipt
          // and then update the metadata. For now, we'll skip this step as it requires more complex transaction handling
          console.log("Ticket metadata uploaded to IPFS:", metadataCID);
        } catch (metadataError) {
          console.error("Error uploading ticket metadata:", metadataError);
          // Don't fail the whole transaction for metadata issues
        }
      }

      refetchEvents();
      alert("Ticket purchased successfully!");
    } catch (error) {
      console.error("Error buying ticket:", error);
      alert("Error buying ticket. Please try again.");
    } finally {
      setSelectedEventId(null);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const isEventSoldOut = (event: Event) => {
    return event.soldTickets >= event.maxSupply;
  };

  const isEventPast = (event: Event) => {
    const now = Math.floor(Date.now() / 1000);
    return Number(event.eventDate) <= now;
  };

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">🎪</div>
        <h3 className="text-2xl font-bold mb-2">No Events Yet</h3>
        <p className="text-gray-600">Be the first to create an event!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-center">Available Events</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: Event) => {
          const soldOut = isEventSoldOut(event);
          const eventPast = isEventPast(event);
          const canBuyTicket = event.isActive && !soldOut && !eventPast;
          
          return (
            <div key={event.id.toString()} className="card bg-base-100 shadow-xl">
              {event.imageCID && (
                <figure className="relative h-48">
                  <img
                    src={getIPFSUrl(event.imageCID)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                </figure>
              )}
              <div className="card-body">
                <h3 className="card-title text-lg">{event.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Date:</span>
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-semibold">Price:</span>
                    <span className="font-mono">{formatEther(event.ticketPrice)} ETH</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-semibold">Available:</span>
                    <span>
                      {(event.maxSupply - event.soldTickets).toString()} / {event.maxSupply.toString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {!event.isActive && (
                    <div className="badge badge-error badge-sm">Inactive</div>
                  )}
                  {eventPast && (
                    <div className="badge badge-neutral badge-sm">Past Event</div>
                  )}
                  {soldOut && (
                    <div className="badge badge-warning badge-sm">Sold Out</div>
                  )}
                  {canBuyTicket && (
                    <div className="badge badge-success badge-sm">Available</div>
                  )}
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => handleBuyTicket(event.id, event.ticketPrice)}
                    disabled={!canBuyTicket || isMining}
                    className={`btn btn-sm ${
                      canBuyTicket ? "btn-primary" : "btn-disabled"
                    }`}
                  >
                    {isMining && selectedEventId === event.id ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Buying...
                      </>
                    ) : (
                      "Buy Ticket"
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
