"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useMarketplace } from "~~/contexts/MarketplaceContext";
import { EventCard } from "~~/components/marketplace/EventCard";
import { 
  CalendarDaysIcon, 
  TicketIcon, 
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  FireIcon,
  StarIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

const EventsPage = () => {
  const { address } = useAccount();
  const { state, loadEvents, purchaseTicket } = useMarketplace();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  const categories = [
    { id: "all", name: "All Events" },
    { id: "conference", name: "Conference" },
    { id: "music", name: "Music" },
    { id: "art", name: "Art" },
    { id: "sports", name: "Sports" },
    { id: "tech", name: "Technology" },
  ];

  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleBuyTicket = async (eventId: number) => {
    if (!address) {
      alert("Please connect your wallet to purchase tickets");
      return;
    }

    setIsPurchasing(eventId);
    try {
      await purchaseTicket(eventId, 1);
      alert("Ticket purchased successfully!");
    } catch (error) {
      console.error("Error purchasing ticket:", error);
      alert("Failed to purchase ticket. Please try again.");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleViewDetails = (eventId: number) => {
    // Navigate to event details page
    console.log("View details for event:", eventId);
  };

  // Convert events from context to display format
  const displayEvents = state.events.map(event => ({
    id: event.id,
    title: event.name,
    description: event.description,
    date: new Date(event.startTime).toLocaleDateString(),
    time: `${new Date(event.startTime).toLocaleTimeString()} - ${new Date(event.endTime).toLocaleTimeString()}`,
    location: event.location,
    venue: event.location,
    price: `${Number(event.ticketPrice) / 1e18} ETH`,
    originalPrice: `${(Number(event.ticketPrice) / 1e18) * 1.2} ETH`,
    image: event.imageUrl || "/api/placeholder/400/300",
    ticketsLeft: event.availableTickets,
    totalTickets: event.maxAttendees,
    category: event.tags[0] || "General",
    rating: 4.5,
    reviewCount: Math.floor(Math.random() * 100),
    isVirtual: event.isVirtual,
    tags: event.tags,
    isOnSale: event.isOnSale,
  }));

  const filteredEvents = displayEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || event.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return parseFloat(a.price) - parseFloat(b.price);
      case "rating":
        return b.rating - a.rating;
      case "tickets":
        return b.ticketsLeft - a.ticketsLeft;
      case "date":
      default:
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Discover Amazing Events</h1>
          <p className="text-xl text-base-content/70">
            Find and purchase tickets for events happening around the world
          </p>
          <div className="mt-6">
            <Link href="/create-event" className="btn btn-primary btn-lg">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search events, venues, or tags..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                className="select select-bordered w-full"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <select
                className="select select-bordered w-full"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="price">Sort by Price</option>
                <option value="rating">Sort by Rating</option>
                <option value="tickets">Sort by Availability</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {state.loading && (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4 text-base-content/70">Loading events...</p>
          </div>
        )}

        {/* Events Grid */}
        {!state.loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onBuyTicket={handleBuyTicket}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {sortedEvents.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-base-content/70">
              Try adjusting your search criteria or browse all events
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
