"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { EventData } from "~~/utils/eventTicket/types";

const OrganizerDashboard: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingEvent, setUpdatingEvent] = useState<number | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EventTicket" });

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

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (!eventIdCounter || !connectedAddress) return;

      setLoading(true);
      const eventsList: EventData[] = [];
      
      try {
        // Fetch all events and filter by organizer
        for (let i = 1; i <= Number(eventIdCounter); i++) {
          const eventData = await fetchEventData(i);
          if (eventData && eventData.organizer.toLowerCase() === connectedAddress.toLowerCase()) {
            eventsList.push(eventData);
          }
        }
        
        setMyEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
        notification.error("Error fetching events");
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [eventIdCounter, connectedAddress]);

  const fetchEventData = async (eventId: number): Promise<EventData | null> => {
    try {
      // This would typically be done through contract calls
      // For now, we'll create mock data
      return {
        eventId,
        name: `My Event ${eventId}`,
        description: `This is my event description for event ${eventId}`,
        location: `My Location ${eventId}`,
        eventDate: Math.floor(Date.now() / 1000) + (eventId * 86400),
        ticketPrice: "0.1",
        maxTickets: 100,
        ticketsSold: Math.floor(Math.random() * 50),
        organizer: connectedAddress || "",
        isActive: true,
        imageUri: `https://picsum.photos/400/300?random=${eventId}`,
      };
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      return null;
    }
  };

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
    return (parseFloat(event.ticketPrice) * event.ticketsSold).toFixed(4);
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

  if (!isOrganizer) {
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

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <a href="/ipfsUpload" className="btn btn-primary">
            Create New Event
          </a>
          <a href="/events" className="btn btn-secondary">
            Browse All Events
          </a>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
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
                      <img 
                        src={event.imageUri} 
                        alt={event.name}
                        className="w-full h-48 object-cover"
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
