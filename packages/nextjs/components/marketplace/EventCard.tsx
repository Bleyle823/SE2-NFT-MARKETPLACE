"use client";

import { 
  CalendarDaysIcon, 
  MapPinIcon,
  ClockIcon,
  TicketIcon,
  FireIcon,
  StarIcon
} from "@heroicons/react/24/outline";

interface EventCardProps {
  event: {
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    venue: string;
    price: string;
    originalPrice?: string;
    image: string;
    ticketsLeft: number;
    totalTickets: number;
    category: string;
    rating: number;
    reviewCount: number;
    isVirtual: boolean;
    tags: string[];
    isOnSale?: boolean;
  };
  onBuyTicket?: (eventId: number) => void;
  onViewDetails?: (eventId: number) => void;
}

export const EventCard = ({ event, onBuyTicket, onViewDetails }: EventCardProps) => {
  const ticketPercentage = (event.ticketsLeft / event.totalTickets) * 100;

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 group">
      <figure className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <CalendarDaysIcon className="h-16 w-16 text-primary/50" />
        </div>
        {event.isVirtual && (
          <div className="absolute top-4 right-4">
            <span className="badge badge-primary">Virtual</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="badge badge-secondary">{event.category}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-base-100/90 backdrop-blur-sm rounded-lg p-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/70">Tickets Available</span>
              <span className="font-medium">{event.ticketsLeft} of {event.totalTickets}</span>
            </div>
            <progress 
              className="progress progress-primary w-full mt-1" 
              value={ticketPercentage} 
              max="100"
            ></progress>
          </div>
        </div>
      </figure>

      <div className="card-body">
        <div className="flex items-start justify-between mb-2">
          <h3 className="card-title text-lg group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center text-warning">
            <StarIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{event.rating}</span>
            <span className="text-xs text-base-content/50 ml-1">({event.reviewCount})</span>
          </div>
        </div>

        <p className="text-sm text-base-content/70 mb-4 line-clamp-2">
          {event.description}
        </p>

        <div className="space-y-2 text-sm text-base-content/70 mb-4">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center">
            <MapPinIcon className="h-4 w-4 mr-2" />
            <span>{event.location}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {event.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="badge badge-outline badge-sm">
              {tag}
            </span>
          ))}
          {event.tags.length > 3 && (
            <span className="badge badge-outline badge-sm">
              +{event.tags.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-warning">
            <FireIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">
              {event.ticketsLeft} left
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{event.price}</div>
            {event.originalPrice && event.originalPrice !== event.price && (
              <div className="text-sm text-base-content/50 line-through">
                {event.originalPrice}
              </div>
            )}
          </div>
        </div>

        <div className="card-actions">
          <button 
            className="btn btn-primary btn-sm flex-1"
            disabled={event.isOnSale === false}
            onClick={() => onBuyTicket?.(event.id)}
          >
            <TicketIcon className="h-4 w-4 mr-1" />
            {event.isOnSale === false ? "Sale Inactive" : "Buy Ticket"}
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => onViewDetails?.(event.id)}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};
