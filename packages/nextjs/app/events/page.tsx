"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { IPFSImage } from "~~/components/IPFSImage";
import { EventData } from "~~/utils/eventTicket/types";
import { parseEther } from "viem";

// Utility function to get a valid image URL with fallback
const getValidImageUrl = (imageUri: string | undefined): string => {
  if (!imageUri || imageUri.trim() === '') {
    return '/placeholder-event.svg';
  }
  
  // Check if it's a valid URL
  try {
    new URL(imageUri);
    return imageUri;
  } catch {
    return '/placeholder-event.svg';
  }
};

const Events: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintingTicket, setMintingTicket] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{current: number, total: number} | null>(null);
  const hasFetchedRef = useRef(false);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EventTicket" });
  const { data: eventTicketContract } = useScaffoldContract({ contractName: "EventTicket" });

  const { data: eventIdCounter } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "eventIdCounter",
    watch: true,
  });

  // Reset fetch flag when eventIdCounter changes (new events added)
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [eventIdCounter]);

  const fetchEventDataWithRetry = useCallback(async (eventId: number, maxRetries: number = 5): Promise<EventData | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!eventTicketContract) {
          console.error("EventTicket contract not available");
          return null;
        }

        // Fetch event data from the smart contract
        const eventFromContract = await eventTicketContract.read.getEvent([BigInt(eventId)]);
        
        return {
          eventId: Number(eventFromContract.eventId),
          name: eventFromContract.name,
          description: eventFromContract.description,
          location: eventFromContract.location,
          eventDate: Number(eventFromContract.eventDate),
          ticketPrice: eventFromContract.ticketPrice.toString(),
          maxTickets: Number(eventFromContract.maxTickets),
          ticketsSold: Number(eventFromContract.ticketsSold),
          organizer: eventFromContract.organizer,
          isActive: eventFromContract.isActive,
          imageUri: eventFromContract.imageUri,
        };
      } catch (error: any) {
        console.error(`Error fetching event ${eventId} (attempt ${attempt}):`, error);
        
        // Handle rate limiting specifically with exponential backoff
        if (error?.message?.includes('429') || 
            error?.message?.includes('Too Many Requests') ||
            error?.message?.includes('sepolia.base.org')) {
          
          if (attempt < maxRetries) {
            // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s
            const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
            // Add jitter to prevent thundering herd (random 0-25% of base delay)
            const jitter = Math.random() * 0.25 * baseDelay;
            const delay = baseDelay + jitter;
            
            console.warn(`Rate limited while fetching event ${eventId}, retrying in ${Math.round(delay)}ms... (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error(`Max retries reached for event ${eventId} due to rate limiting`);
            return null;
          }
        }
        
        // For other errors, don't retry
        return null;
      }
    }
    
    return null;
  }, [eventTicketContract]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!eventIdCounter || !eventTicketContract || hasFetchedRef.current) return;

      hasFetchedRef.current = true;
      setLoading(true);
      const eventsList: EventData[] = [];
      
      try {
        setError(null); // Clear any previous errors
        // Fetch all events with rate limiting to prevent 429 errors
        const totalEvents = Number(eventIdCounter);
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3;
        
        for (let i = 1; i <= totalEvents; i++) {
          setLoadingProgress({current: i, total: totalEvents});
          
          const eventData = await fetchEventDataWithRetry(i);
          if (eventData) {
            eventsList.push(eventData);
            consecutiveFailures = 0; // Reset failure counter on success
          } else {
            consecutiveFailures++;
            
            // Circuit breaker: if too many consecutive failures, stop fetching
            if (consecutiveFailures >= maxConsecutiveFailures) {
              console.warn(`Too many consecutive failures (${consecutiveFailures}), stopping event fetch to prevent further rate limiting`);
              setError(`Some events could not be loaded due to network issues. ${eventsList.length} events loaded successfully.`);
              break;
            }
          }
          
          // Add a longer delay between requests to prevent rate limiting
          if (i < totalEvents) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError("Failed to load events. The server may be experiencing high traffic. Please try again in a moment.");
        notification.error("Error fetching events. Please try again.");
      } finally {
        setLoading(false);
        setLoadingProgress(null);
      }
    };

    fetchEvents();
  }, [eventIdCounter, eventTicketContract, fetchEventDataWithRetry]);

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
        <div className="mt-4 text-center max-w-md">
          <p className="text-sm text-base-content/70">
            Connect your wallet to view and purchase event tickets. Make sure you're connected to the Base Sepolia network.
          </p>
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

        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Loading Error</h3>
              <div className="text-xs">{error}</div>
            </div>
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center space-y-4">
            <span className="loading loading-spinner loading-lg"></span>
            <div className="text-center">
              <p className="text-lg">Loading events...</p>
              {loadingProgress && (
                <div className="mt-2">
                  <div className="text-sm text-base-content/70">
                    Loading event {loadingProgress.current} of {loadingProgress.total}
                  </div>
                  <progress 
                    className="progress progress-primary w-64 mt-2" 
                    value={loadingProgress.current} 
                    max={loadingProgress.total}
                  ></progress>
                </div>
              )}
              <p className="text-xs text-base-content/50 mt-2">
                This may take a moment due to network rate limiting...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl px-4">
            {events.map((event) => (
              <div key={event.eventId} className="card bg-base-100 shadow-xl">
                <figure>
                  <IPFSImage
                    src={event.imageUri || ''}
                    alt={event.name}
                    className="w-full h-48"
                    fallbackSrc="/placeholder-event.svg"
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
