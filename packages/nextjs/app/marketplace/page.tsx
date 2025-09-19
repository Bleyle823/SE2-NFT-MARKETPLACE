"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useMarketplace } from "~~/contexts/MarketplaceContext";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { formatEther } from "viem";
import { 
  ShoppingBagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  TagIcon
} from "@heroicons/react/24/outline";

const MarketplacePage = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { state, contractService } = useMarketplace();
  const { data: ticketMarketplaceInfo } = useDeployedContractInfo("TicketMarketplace");
  const { data: eventTicketNFTInfo } = useDeployedContractInfo("EventTicketNFT");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [listedTickets, setListedTickets] = useState<any[]>([]);

  const categories = [
    { id: "all", name: "All Tickets" },
    { id: "fixed", name: "Fixed Price" },
    { id: "auction", name: "Auctions" },
  ];

  // Load active ticket listings
  useEffect(() => {
    const loadListings = async () => {
      try {
        if (!publicClient || !ticketMarketplaceInfo?.address || !ticketMarketplaceInfo?.abi || !eventTicketNFTInfo?.address || !eventTicketNFTInfo?.abi) {
          setListedTickets([]);
          return;
        }

        const tmAddr = ticketMarketplaceInfo.address as `0x${string}`;
        const tmAbi = ticketMarketplaceInfo.abi as any;
        const nftAddr = eventTicketNFTInfo.address as `0x${string}`;
        const nftAbi = eventTicketNFTInfo.abi as any;

        const aggregate: any[] = [];
        for (const ev of state.events) {
          try {
            const tokenIds = (await publicClient.readContract({
              address: tmAddr,
              abi: tmAbi,
              functionName: "getEventListings",
              args: [BigInt(ev.id)],
            })) as bigint[];

            for (const tokenId of tokenIds) {
              try {
                const listing = (await publicClient.readContract({
                  address: tmAddr,
                  abi: tmAbi,
                  functionName: "listings",
                  args: [tokenId],
                })) as any;

                const price = listing.price ?? listing[0];
                const expiresAt = Number(listing.expiresAt ?? listing[1]);
                const listingType = Number(listing.listingType ?? listing[4]);
                const status = Number(listing.status ?? listing[5]);
                if (status !== 0) continue; // only Active

                aggregate.push({
                  id: Number(tokenId),
                  tokenId: Number(tokenId),
                  title: ev.name,
                  description: ev.description,
                  price: formatEther(price as bigint),
                  currency: "ETH",
                  eventId: ev.id,
                  category: listingType === 0 ? "fixed" : "auction",
                  image: ev.imageUrl || "/api/placeholder/300/200",
                  expiresAt,
                  listingType,
                });
              } catch {}
            }
          } catch {}
        }

        setListedTickets(aggregate);
      } catch {
        setListedTickets([]);
      }
    };

    loadListings();
  }, [publicClient, ticketMarketplaceInfo?.address, ticketMarketplaceInfo?.abi, eventTicketNFTInfo?.address, eventTicketNFTInfo?.abi, state.events]);

  const mockListings = [
    {
      id: 1,
      title: "Custom Smart Contract Development",
      description: "Professional smart contract development services for your blockchain project. Includes testing, deployment, and documentation.",
      price: "500",
      currency: "RVFY",
      seller: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      category: "service",
      rating: 4.9,
      reviewCount: 23,
      deliveryTime: 7,
      isDigital: false,
      tags: ["Smart Contracts", "Solidity", "Blockchain"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 2,
      title: "NFT Art Collection - Digital Assets",
      description: "Exclusive collection of 10 unique digital art pieces, perfect for NFT projects or digital galleries.",
      price: "150",
      currency: "RVFY",
      seller: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      category: "digital",
      rating: 4.7,
      reviewCount: 15,
      deliveryTime: 1,
      isDigital: true,
      tags: ["NFT", "Digital Art", "Collection"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 3,
      title: "Blockchain Consulting Session",
      description: "1-hour consultation session with a blockchain expert. Get advice on your project, tokenomics, and implementation strategies.",
      price: "200",
      currency: "RVFY",
      seller: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      category: "consultation",
      rating: 4.8,
      reviewCount: 31,
      deliveryTime: 1,
      isDigital: true,
      tags: ["Consulting", "Blockchain", "Strategy"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 4,
      title: "Virtual Event Planning Experience",
      description: "Complete virtual event planning service including platform setup, attendee management, and technical support.",
      price: "300",
      currency: "RVFY",
      seller: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      category: "experience",
      rating: 4.6,
      reviewCount: 8,
      deliveryTime: 14,
      isDigital: false,
      tags: ["Event Planning", "Virtual Events", "Management"],
      image: "/api/placeholder/300/200"
    }
  ];

  const filteredListings = listedTickets.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return parseFloat(a.price) - parseFloat(b.price);
      case "rating":
        return b.rating - a.rating;
      case "newest":
      default:
        return b.id - a.id;
    }
  });

  const handlePurchaseListing = async (tokenId: number) => {
    if (!address) {
      alert("Please connect your wallet to purchase");
      return;
    }

    try {
      const listing = listedTickets.find(l => l.id === tokenId);
      if (!listing) throw new Error("Listing not found");
      await contractService.ticketMarketplace.buyTicket({
        functionName: "buyTicket",
        args: [BigInt(tokenId)],
        value: BigInt(Math.floor(parseFloat(listing.price) * 1e18)),
      });
      alert("Purchase successful!");
    } catch (error) {
      console.error("Error purchasing listing:", error);
      alert("Failed to purchase. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Ticket Marketplace</h1>
          <p className="text-xl text-base-content/70">Browse and buy listed event tickets</p>
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
                  placeholder="Search listings, services, or creators..."
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
                <option value="newest">Sort by Newest</option>
                <option value="price">Sort by Price</option>
                <option value="rating">Sort by Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedListings.map((listing) => (
            <div key={listing.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <figure className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <ShoppingBagIcon className="h-16 w-16 text-primary/50" />
                </div>
                <div className="absolute top-4 right-4">
                  <span className="badge badge-secondary capitalize">{listing.category}</span>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="badge badge-primary">
                    {listing.isDigital ? "Digital" : "Physical"}
                  </span>
                </div>
              </figure>

              <div className="card-body">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="card-title text-lg group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  <div className="flex items-center text-warning" />
                </div>

                <p className="text-sm text-base-content/70 mb-4 line-clamp-2">
                  {listing.description}
                </p>

                <div className="space-y-2 text-sm text-base-content/70 mb-4" />

                <div className="flex flex-wrap gap-1 mb-4" />

                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-primary">
                    {listing.price} {listing.currency}
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="btn btn-primary btn-sm flex-1"
                    onClick={() => handlePurchaseListing(listing.id)}
                  >
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    Purchase
                  </button>
                  <button className="btn btn-outline btn-sm">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {sortedListings.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBagIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No listings found</h3>
            <p className="text-base-content/70">
              Try adjusting your search criteria or create a new listing
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
