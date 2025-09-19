"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useMarketplace } from "~~/contexts/MarketplaceContext";
import { TicketCard } from "~~/components/marketplace/TicketCard";
import { 
  TicketIcon, 
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  QrCodeIcon,
  ShareIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

const TicketsPage = () => {
  const { address } = useAccount();
  const { state, loadUserTickets, useTicket, listTicketForSale, enableTicketTransferability } = useMarketplace();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isUsingTicket, setIsUsingTicket] = useState<number | null>(null);

  // Load user tickets on component mount
  useEffect(() => {
    if (address) {
      loadUserTickets();
    }
  }, [address, loadUserTickets]);

  const tabs = [
    { id: "upcoming", name: "Upcoming", count: state.userTickets.filter(t => t.status === "active").length },
    { id: "past", name: "Past Events", count: state.userTickets.filter(t => t.status === "used").length },
    { id: "transferred", name: "Transferred", count: state.userTickets.filter(t => t.status === "transferred").length },
  ];

  const handleUseTicket = async (ticketId: number) => {
    if (!address) {
      alert("Please connect your wallet to use tickets");
      return;
    }

    setIsUsingTicket(ticketId);
    try {
      await useTicket(ticketId);
      alert("Ticket used successfully!");
    } catch (error) {
      console.error("Error using ticket:", error);
      alert("Failed to use ticket. Please try again.");
    } finally {
      setIsUsingTicket(null);
    }
  };

  const handleTransferTicket = async (ticketId: number) => {
    try {
      // 1) Ensure transferable
      await enableTicketTransferability(ticketId);

      // 2) Ask listing details
      const priceEth = window.prompt("Enter listing price (ETH)", "0.01");
      if (!priceEth) return;
      const durationHoursStr = window.prompt("Enter listing duration (hours)", "24");
      if (!durationHoursStr) return;
      const durationHours = Math.max(1, parseInt(durationHoursStr));
      const expiresAt = Math.floor(Date.now() / 1000) + durationHours * 3600;
      const priceWei = parseEther(priceEth).toString();

      // 3) List on marketplace (also sets approval under the hood)
      await listTicketForSale(ticketId, priceWei, expiresAt);
      alert("Ticket listed on marketplace.");
    } catch (e) {
      console.error(e);
      alert("Failed to list ticket. Check you are on the right network and try again.");
    }
  };

  const handleViewQR = (ticket: any) => {
    setSelectedTicket(ticket);
  };

  const upcomingTickets = [
    {
      id: 1,
      eventTitle: "Crypto Conference 2024",
      eventDate: "March 15, 2024",
      eventTime: "9:00 AM - 6:00 PM",
      eventLocation: "San Francisco, CA",
      venue: "Moscone Center",
      ticketType: "VIP Pass",
      seatNumber: "A-15",
      price: "150 RVFY",
      purchaseDate: "March 1, 2024",
      qrCode: "crypto-conf-2024-vip-a15",
      status: "active",
      isTransferable: true,
      eventImage: "/api/placeholder/300/200",
      category: "Conference"
    },
    {
      id: 2,
      eventTitle: "NFT Art Gallery Opening",
      eventDate: "March 22, 2024",
      eventTime: "7:00 PM - 11:00 PM",
      eventLocation: "New York, NY",
      venue: "Digital Art Museum",
      ticketType: "General Admission",
      seatNumber: "GA-42",
      price: "75 RVFY",
      purchaseDate: "March 5, 2024",
      qrCode: "nft-gallery-opening-ga-42",
      status: "active",
      isTransferable: true,
      eventImage: "/api/placeholder/300/200",
      category: "Art"
    },
    {
      id: 3,
      eventTitle: "Blockchain Music Festival",
      eventDate: "April 5, 2024",
      eventTime: "2:00 PM - 12:00 AM",
      eventLocation: "Miami, FL",
      venue: "Bayfront Park",
      ticketType: "Early Bird",
      seatNumber: "EB-78",
      price: "200 RVFY",
      purchaseDate: "February 20, 2024",
      qrCode: "blockchain-music-fest-eb-78",
      status: "active",
      isTransferable: false,
      eventImage: "/api/placeholder/300/200",
      category: "Music"
    },
    {
      id: 4,
      eventTitle: "Virtual Reality Gaming Tournament",
      eventDate: "April 12, 2024",
      eventTime: "10:00 AM - 8:00 PM",
      eventLocation: "Virtual",
      venue: "Metaverse Arena",
      ticketType: "Competitor Pass",
      seatNumber: "VR-12",
      price: "50 RVFY",
      purchaseDate: "March 10, 2024",
      qrCode: "vr-gaming-tournament-vr-12",
      status: "active",
      isTransferable: true,
      eventImage: "/api/placeholder/300/200",
      category: "Technology"
    },
    {
      id: 5,
      eventTitle: "DeFi Workshop Series",
      eventDate: "April 20, 2024",
      time: "9:00 AM - 5:00 PM",
      eventLocation: "London, UK",
      venue: "Tech Hub London",
      ticketType: "Student Pass",
      seatNumber: "ST-25",
      price: "120 RVFY",
      purchaseDate: "March 8, 2024",
      qrCode: "defi-workshop-student-st-25",
      status: "active",
      isTransferable: true,
      eventImage: "/api/placeholder/300/200",
      category: "Conference"
    }
  ];

  const pastTickets = [
    {
      id: 6,
      eventTitle: "Web3 Summit 2023",
      eventDate: "December 15, 2023",
      eventTime: "9:00 AM - 6:00 PM",
      eventLocation: "Berlin, Germany",
      venue: "Estrel Hotel",
      ticketType: "General Admission",
      seatNumber: "GA-156",
      price: "180 RVFY",
      purchaseDate: "November 20, 2023",
      qrCode: "web3-summit-2023-ga-156",
      status: "used",
      isTransferable: false,
      eventImage: "/api/placeholder/300/200",
      category: "Conference"
    }
  ];

  const transferredTickets = [
    {
      id: 7,
      eventTitle: "Crypto Art Exhibition",
      eventDate: "January 20, 2024",
      eventTime: "6:00 PM - 10:00 PM",
      eventLocation: "Tokyo, Japan",
      venue: "Digital Art Space",
      ticketType: "VIP Pass",
      seatNumber: "VIP-08",
      price: "100 RVFY",
      purchaseDate: "January 5, 2024",
      qrCode: "crypto-art-exhibition-vip-08",
      status: "transferred",
      isTransferable: false,
      eventImage: "/api/placeholder/300/200",
      category: "Art",
      transferredTo: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
    }
  ];

  const getTicketsByTab = () => {
    switch (activeTab) {
      case "upcoming":
        return state.userTickets.filter(t => t.status === "active");
      case "past":
        return state.userTickets.filter(t => t.status === "used");
      case "transferred":
        return state.userTickets.filter(t => t.status === "transferred");
      default:
        return [];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="h-5 w-5 text-success" />;
      case "used":
        return <CheckCircleIcon className="h-5 w-5 text-info" />;
      case "transferred":
        return <ArrowPathIcon className="h-5 w-5 text-warning" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-error" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "used":
        return "Used";
      case "transferred":
        return "Transferred";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">My Tickets</h1>
          <p className="text-xl text-base-content/70">
            Manage your event tickets and NFT collection
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-100 p-1 mb-8 w-fit mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
              <span className="badge badge-sm ml-2">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {state.loading && (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4 text-base-content/70">Loading tickets...</p>
          </div>
        )}

        {/* Tickets Grid */}
        {!state.loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getTicketsByTab().map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onViewQR={handleViewQR}
                onTransfer={handleTransferTicket}
                onViewDetails={(ticketId) => console.log("View details:", ticketId)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {getTicketsByTab().length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-base-content/70 mb-4">
              {activeTab === "upcoming" 
                ? "You don't have any upcoming events. Browse events to purchase tickets."
                : `You don't have any ${activeTab} tickets.`
              }
            </p>
            {activeTab === "upcoming" && (
              <button className="btn btn-primary">
                Browse Events
              </button>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {selectedTicket && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Ticket QR Code</h3>
              <div className="text-center">
                <div className="bg-base-200 rounded-lg p-8 mb-4">
                  <QrCodeIcon className="h-32 w-32 mx-auto text-primary/50" />
                  <p className="text-sm text-base-content/70 mt-2">
                    QR Code: {selectedTicket.qrCode || "Generated QR Code"}
                  </p>
                </div>
                <div className="text-left space-y-2 text-sm">
                  <p><strong>Event:</strong> {selectedTicket.eventTitle || "Event Title"}</p>
                  <p><strong>Date:</strong> {selectedTicket.eventDate || "Event Date"}</p>
                  <p><strong>Seat:</strong> {selectedTicket.seatNumber || "Seat Number"}</p>
                  <p><strong>Type:</strong> {selectedTicket.ticketType || "Ticket Type"}</p>
                </div>
              </div>
              <div className="modal-action">
                <button 
                  className="btn btn-outline"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <ShareIcon className="h-4 w-4 mr-1" />
                  Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
