"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useMarketplace } from "~~/contexts/MarketplaceContext";
import { EventCard } from "~~/components/marketplace/EventCard";
import { 
  CalendarDaysIcon, 
  TicketIcon, 
  UserIcon, 
  ChartBarIcon,
  FireIcon,
  StarIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { state, loadEvents, purchaseTicket } = useMarketplace();

  const stats = [
    { label: "Total Events", value: state.events.length.toString(), icon: CalendarDaysIcon },
    { label: "Tickets Sold", value: state.events.reduce((sum, event) => sum + event.ticketsSold, 0).toString(), icon: TicketIcon },
    { label: "Active Users", value: "12,345", icon: UserIcon },
    { label: "Total Volume", value: "2,456 RVFY", icon: ChartBarIcon },
  ];

  const handleBuyTicket = async (eventId: number) => {
    if (!connectedAddress) {
      alert("Please connect your wallet to purchase tickets");
      return;
    }

    try {
      await purchaseTicket(eventId, 1);
      alert("Ticket purchased successfully!");
    } catch (error) {
      console.error("Error purchasing ticket:", error);
      alert("Failed to purchase ticket. Please try again.");
    }
  };

  const handleViewDetails = (eventId: number) => {
    console.log("View details for event:", eventId);
  };

  // Convert events from context to display format
  const featuredEvents = state.events.slice(0, 3).map(event => ({
    id: event.id,
    title: event.name,
    description: event.description,
    date: new Date(event.startTime).toLocaleDateString(),
    time: `${new Date(event.startTime).toLocaleTimeString()} - ${new Date(event.endTime).toLocaleTimeString()}`,
    location: event.location,
    venue: event.location,
    price: `${event.ticketPrice} RVFY`,
    originalPrice: `${parseInt(event.ticketPrice) * 1.2} RVFY`,
    image: event.imageUrl || "/api/placeholder/400/300",
    ticketsLeft: event.availableTickets,
    totalTickets: event.maxAttendees,
    category: event.tags[0] || "General",
    rating: 4.5,
    reviewCount: Math.floor(Math.random() * 100),
    isVirtual: event.isVirtual,
    tags: event.tags
  }));

  return (
    <>
      <div className="flex flex-col grow">
        {/* Hero Section */}
        <div className="hero min-h-[60vh] bg-gradient-to-br from-primary/20 to-secondary/20">
          <div className="hero-content text-center">
            <div className="max-w-4xl">
              <h1 className="text-5xl font-bold mb-6">
                Welcome to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Rovify Marketplace
                </span>
              </h1>
              <p className="text-xl mb-8 text-base-content/80">
                Discover, buy, and trade event tickets as NFTs. Experience events like never before with 
                blockchain-powered ticketing and anti-scalping protection.
              </p>
              <div className="flex justify-center items-center space-x-2 flex-col mb-8">
                <p className="text-lg font-medium">Connected Address:</p>
                <Address address={connectedAddress} />
              </div>
              <div className="flex gap-4 justify-center">
                <Link href="/events" className="btn btn-primary btn-lg">
                  <CalendarDaysIcon className="h-6 w-6" />
                  Browse Events
                </Link>
                <Link href="/tickets" className="btn btn-outline btn-lg">
                  <TicketIcon className="h-6 w-6" />
                  My Tickets
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-16 bg-base-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Platform Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="card bg-base-200 shadow-lg">
                  <div className="card-body text-center">
                    <stat.icon className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="text-2xl font-bold text-primary">{stat.value}</h3>
                    <p className="text-base-content/70">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Events */}
        <div className="py-16 bg-base-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold">Featured Events</h2>
              <Link href="/events" className="btn btn-outline">
                View All Events
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onBuyTicket={handleBuyTicket}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-base-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Rovify?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TicketIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Anti-Scalping Protection</h3>
                <p className="text-base-content/70">
                  Advanced algorithms prevent ticket scalping and ensure fair pricing for all users.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StarIcon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-2">NFT Ownership</h3>
                <p className="text-base-content/70">
                  Your tickets are unique NFTs that you truly own and can trade on the secondary market.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">Creator Rewards</h3>
                <p className="text-base-content/70">
                  Event creators earn ongoing royalties from secondary sales and platform rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
