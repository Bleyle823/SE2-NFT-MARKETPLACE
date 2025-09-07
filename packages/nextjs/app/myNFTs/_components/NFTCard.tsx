"use client";

import { EventTicket } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";

interface NFTCardProps {
  nft: EventTicket;
}

export const NFTCard = ({ nft }: NFTCardProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getEventStatus = () => {
    if (!nft.eventData) return "Unknown";
    
    const now = Math.floor(Date.now() / 1000);
    if (nft.eventData.eventDate < now) {
      return "Event Ended";
    } else if (nft.eventData.eventDate - now < 86400) { // Less than 24 hours
      return "Event Soon";
    } else {
      return "Upcoming";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Event Ended":
        return "badge-error";
      case "Event Soon":
        return "badge-warning";
      case "Upcoming":
        return "badge-success";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <figure>
        <img 
          src={nft.image || "/placeholder-ticket.png"} 
          alt={nft.name || "Event Ticket"}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://via.placeholder.com/400x300/1f2937/ffffff?text=Event+Ticket";
          }}
        />
      </figure>
      
      <div className="card-body">
        <div className="flex items-start justify-between mb-2">
          <h2 className="card-title text-lg">{nft.name || "Event Ticket"}</h2>
          <div className={`badge ${getStatusColor(getEventStatus())}`}>
            {getEventStatus()}
          </div>
        </div>
        
        <p className="text-sm text-base-content/70 line-clamp-2">
          {nft.description || "No description available"}
        </p>

        {/* Event Details */}
        {nft.event_details && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">🎪 Event:</span>
              <span>{nft.event_details.event_name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">📅 Date:</span>
              <span>{formatDate(nft.event_details.event_date)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">📍 Location:</span>
              <span>{nft.event_details.location}</span>
            </div>
            
            {nft.event_details.ticket_type && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">🎫 Type:</span>
                <span>{nft.event_details.ticket_type}</span>
              </div>
            )}
            
            {nft.event_details.seat_number && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">🪑 Seat:</span>
                <span>{nft.event_details.seat_number}</span>
              </div>
            )}
            
            {nft.event_details.venue_section && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">🏟️ Section:</span>
                <span>{nft.event_details.venue_section}</span>
              </div>
            )}
          </div>
        )}

        {/* Attributes */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mt-3">
            <h4 className="font-semibold text-sm mb-2">Attributes:</h4>
            <div className="flex flex-wrap gap-1">
              {nft.attributes.slice(0, 3).map((attr, index) => (
                <div key={index} className="badge badge-outline badge-sm">
                  {attr.trait_type}: {attr.value}
                </div>
              ))}
              {nft.attributes.length > 3 && (
                <div className="badge badge-outline badge-sm">
                  +{nft.attributes.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token Info */}
        <div className="divider my-2"></div>
        <div className="text-xs text-base-content/50 space-y-1">
          <div className="flex justify-between">
            <span>Token ID:</span>
            <span>#{nft.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Owner:</span>
            <Address address={nft.owner} />
          </div>
          {nft.event_details?.organizer && (
            <div className="flex justify-between">
              <span>Organizer:</span>
              <Address address={nft.event_details.organizer} />
            </div>
          )}
        </div>

        <div className="card-actions justify-end mt-4">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (nft.uri) {
                window.open(nft.uri, '_blank');
              }
            }}
          >
            View on IPFS
          </button>
        </div>
      </div>
    </div>
  );
};