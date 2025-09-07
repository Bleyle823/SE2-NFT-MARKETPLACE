"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { EventData } from "~~/utils/eventTicket/types";
import { parseEther } from "viem";

const Events: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintingTicket, setMintingTicket] = useState<number | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EventTicket" });

  const { data: eventIdCounter } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "eventIdCounter",
    watch: true,
  });

  useEffect(() => {
    const fetchEvents = async () => {
      if (!eventIdCounter) return;

      setLoading(true);
      const eventsList: EventData[] = [];
      
      try {
        // Fetch all events
        for (let i = 1; i <= Number(eventIdCounter); i++) {
          const eventData = await fetchEventData(i);
          if (eventData) {
            eventsList.push(eventData);
          }
        }
        
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
        notification.error("Error fetching events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [eventIdCounter]);

  const fetchEventData = async (eventId: number): Promise<EventData | null> => {
    try {
      // This would typically be done through contract calls
      // For now, we'll create mock data
      return {
        eventId,
        name: `Event ${eventId}`,
        description: `This is a sample event description for event ${eventId}`,
        location: `Location ${eventId}`,
        eventDate: Math.floor(Date.now() / 1000) + (eventId * 86400), // Different dates for each event
        ticketPrice: "0.1",
        maxTickets: 100,
        ticketsSold: Math.floor(Math.random() * 50), // Random sold tickets
        organizer: "0x1234567890123456789012345678901234567890",
        isActive: true,
        imageUri: `https://picsum.photos/400/300?random=${eventId}`,
      };
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      return null;
    }
  };

  const handleMintTicket = async (eventId: number, ticketPrice: string) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    setMintingTicket(eventId);
    const notificationId = notification.loading("Minting ticket...");

    try {
      // Generate a simple token URI for the ticket
      const tokenUri = `QmSampleHash${eventId}${Date.now()}`;
      
      await writeContractAsync({
        functionName: "mintTicket",
        args: [BigInt(eventId), tokenUri],
        value: parseEther(ticketPrice),
      });

      notification.remove(notificationId);
      notification.success("Ticket minted successfully!");
      
      // Refresh events to update ticket counts
      window.location.reload();
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error minting ticket");
      console.error(error);
    } finally {
      setMintingTicket(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAvailableTickets = (event: EventData) => {
    return event.maxTickets - event.ticketsSold;
  };

  const isEventActive = (event: EventData) => {
    return event.isActive && event.eventDate > Math.floor(Date.now() / 1000);
  };

  if (!isConnected || isConnecting) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Discover Events</span>
        </h1>
        <div className="mt-8">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">Discover Events</span>
        </h1>

        {loading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl px-4">
            {events.map((event) => (
              <div key={event.eventId} className="card bg-base-100 shadow-xl">
                <figure>
                  <img 
                    src={event.imageUri} 
                    alt={event.name}
                    className="w-full h-48 object-cover"
                  />
                </figure>
                <div className="card-body">
                  <h2 className="card-title">{event.name}</h2>
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">📅 Date:</span>
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">📍 Location:</span>
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">🎫 Price:</span>
                      <span>{event.ticketPrice} ETH</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">🎟️ Available:</span>
                      <span>{getAvailableTickets(event)} / {event.maxTickets}</span>
                    </div>
                  </div>

                  <div className="card-actions justify-end">
                    {isEventActive(event) && getAvailableTickets(event) > 0 ? (
                      <button
                        className={`btn btn-primary ${
                          mintingTicket === event.eventId ? "loading" : ""
                        }`}
                        disabled={mintingTicket === event.eventId}
                        onClick={() => handleMintTicket(event.eventId, event.ticketPrice)}
                      >
                        {mintingTicket === event.eventId ? "Minting..." : "Buy Ticket"}
                      </button>
                    ) : (
                      <button className="btn btn-disabled" disabled>
                        {!isEventActive(event) ? "Event Ended" : "Sold Out"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="text-center mt-8">
            <p className="text-xl text-base-content/70">No events found</p>
            <p className="text-sm text-base-content/50 mt-2">
              Create your first event to get started!
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Events;
