"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton, AddressInput } from "~~/components/scaffold-eth";
import { IPFSImage } from "~~/components/IPFSImage";
import { EventData } from "~~/utils/eventTicket/types";
import { formatEther } from "viem";

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

const OrganizerDashboard: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingEvent, setUpdatingEvent] = useState<number | null>(null);
  const [newOrganizerAddress, setNewOrganizerAddress] = useState<string>("");
  const [addingOrganizer, setAddingOrganizer] = useState(false);
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

  const { data: isOrganizer } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "eventOrganizers",
    args: [connectedAddress],
    watch: true,
  });

  const { data: contractOwner } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "owner",
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
          // Store as ETH string for consistent UI usage
          ticketPrice: formatEther(eventFromContract.ticketPrice),
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
            error?.message?.includes('sepolia.base.org') ||
            error?.message?.includes('over rate limit')) {
          
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
    const fetchMyEvents = async () => {
      if (!eventIdCounter || !connectedAddress || !eventTicketContract || hasFetchedRef.current) return;

      hasFetchedRef.current = true;
      setLoading(true);
      const eventsList: EventData[] = [];
      
      try {
        setError(null); // Clear any previous errors
        // Fetch all events and filter by organizer with rate limiting
        const totalEvents = Number(eventIdCounter);
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3;
        
        for (let i = 1; i <= totalEvents; i++) {
          setLoadingProgress({current: i, total: totalEvents});
          
          const eventData = await fetchEventDataWithRetry(i);
          if (eventData) {
            if (eventData.organizer.toLowerCase() === connectedAddress.toLowerCase()) {
              eventsList.push(eventData);
            }
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
        
        setMyEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError("Failed to load events. The server may be experiencing high traffic. Please try again in a moment.");
        notification.error("Error fetching events");
      } finally {
        setLoading(false);
        setLoadingProgress(null);
      }
    };

    fetchMyEvents();
  }, [eventIdCounter, connectedAddress, eventTicketContract, fetchEventDataWithRetry]);


  const handleToggleEventStatus = async (eventId: number, currentStatus: boolean) => {
    setUpdatingEvent(eventId);
    const notificationId = notification.loading("Updating event status...");

    try {
      await writeContractAsync({
        functionName: "setEventStatus",
        args: [BigInt(eventId), !currentStatus],
      });

      notification.remove(notificationId);
      notification.success(`Event ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      
      // Refresh events
      window.location.reload();
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error updating event status");
      console.error(error);
    } finally {
      setUpdatingEvent(null);
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

  const getSalesProgress = (event: EventData) => {
    return (event.ticketsSold / event.maxTickets) * 100;
  };

  const getRevenue = (event: EventData) => {
    // ticketPrice is already an ETH string; multiply by tickets sold
    const priceEth = parseFloat(event.ticketPrice || "0");
    return (priceEth * event.ticketsSold).toFixed(4);
  };

  const handleAddOrganizer = async () => {
    if (!newOrganizerAddress) {
      notification.error("Please enter an address");
      return;
    }

    setAddingOrganizer(true);
    const notificationId = notification.loading("Adding organizer...");

    try {
      await writeContractAsync({
        functionName: "addOrganizer",
        args: [newOrganizerAddress as `0x${string}`],
      });

      notification.remove(notificationId);
      notification.success("Organizer added successfully!");
      setNewOrganizerAddress("");
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error adding organizer");
      console.error(error);
    } finally {
      setAddingOrganizer(false);
    }
  };

  if (!isConnected || isConnecting) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Organizer Dashboard</span>
        </h1>
        <div className="mt-8">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  // Check if user is contract owner
  const isOwner = contractOwner && connectedAddress && contractOwner.toLowerCase() === connectedAddress.toLowerCase();

  if (!isOrganizer && !isOwner) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Organizer Dashboard</span>
        </h1>
        <div className="text-center mt-8">
          <div className="alert alert-warning max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>You are not authorized as an event organizer.</span>
          </div>
          <p className="text-base-content/70 mt-4">
            Contact the contract owner to become an event organizer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Organizer Dashboard</span>
        </h1>
        <p className="text-center text-base-content/70 mb-8">
          Manage your events and track ticket sales
        </p>

        {/* Quick Stats */}
        <div className="stats shadow mb-8">
          <div className="stat">
            <div className="stat-title">Total Events</div>
            <div className="stat-value text-primary">{myEvents.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Active Events</div>
            <div className="stat-value text-secondary">
              {myEvents.filter(e => e.isActive).length}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Tickets Sold</div>
            <div className="stat-value text-accent">
              {myEvents.reduce((sum, e) => sum + e.ticketsSold, 0)}
            </div>
          </div>
        </div>

        {/* Admin Section - Only for contract owner */}
        {isOwner && (
          <div className="card w-full max-w-md bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-warning">Admin Panel</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Add new event organizers to the platform
              </p>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Organizer Address</span>
                </label>
                <AddressInput
                  value={newOrganizerAddress}
                  onChange={setNewOrganizerAddress}
                  placeholder="0x..."
                />
              </div>
              
              <div className="card-actions justify-end">
                <button
                  className={`btn btn-warning ${addingOrganizer ? "loading" : ""}`}
                  disabled={addingOrganizer || !newOrganizerAddress}
                  onClick={handleAddOrganizer}
                >
                  {addingOrganizer ? "Adding..." : "Add Organizer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <a href="/ipfsUpload" className="btn btn-primary">
            Create New Event
          </a>
          <a href="/events" className="btn btn-secondary">
            Browse All Events
          </a>
        </div>

        {/* Error Display */}
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

        {/* Events List */}
        {loading ? (
          <div className="flex flex-col justify-center items-center space-y-4">
            <span className="loading loading-spinner loading-lg"></span>
            <div className="text-center">
              <p className="text-lg">Loading your events...</p>
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
          <div className="w-full max-w-6xl px-4">
            {myEvents.length === 0 ? (
              <div className="text-center">
                <div className="text-xl text-base-content/70 mb-4">No events created yet</div>
                <p className="text-base-content/50 mb-6">
                  Create your first event to start selling tickets!
                </p>
                <a href="/ipfsUpload" className="btn btn-primary">
                  Create Your First Event
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myEvents.map((event) => (
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
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="card-title">{event.name}</h2>
                        <div className={`badge ${event.isActive ? 'badge-success' : 'badge-error'}`}>
                          {event.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
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
                          <span className="font-semibold">💰 Price:</span>
                          <span>{event.ticketPrice} ETH</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">🎟️ Sales:</span>
                          <span>{event.ticketsSold} / {event.maxTickets}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">💵 Revenue:</span>
                          <span>{getRevenue(event)} ETH</span>
                        </div>
                      </div>

                      {/* Sales Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Sales Progress</span>
                          <span>{getSalesProgress(event).toFixed(1)}%</span>
                        </div>
                        <progress 
                          className="progress progress-primary w-full" 
                          value={getSalesProgress(event)} 
                          max="100"
                        ></progress>
                      </div>

                      <div className="card-actions justify-end mt-4">
                        <button
                          className={`btn btn-sm ${
                            event.isActive ? 'btn-error' : 'btn-success'
                          } ${updatingEvent === event.eventId ? 'loading' : ''}`}
                          disabled={updatingEvent === event.eventId}
                          onClick={() => handleToggleEventStatus(event.eventId, event.isActive)}
                        >
                          {updatingEvent === event.eventId 
                            ? 'Updating...' 
                            : event.isActive 
                              ? 'Deactivate' 
                              : 'Activate'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OrganizerDashboard;
