"use client";

import { 
  TicketIcon, 
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  QrCodeIcon,
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface TicketCardProps {
  ticket: {
    id: number;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    venue: string;
    ticketType: string;
    seatNumber: string;
    price: string;
    purchaseDate: string;
    qrCode: string;
    status: "active" | "used" | "transferred" | "cancelled";
    isTransferable: boolean;
    eventImage: string;
    category: string;
    transferredTo?: string;
  };
  onViewQR?: (ticket: any) => void;
  onTransfer?: (ticketId: number) => void;
  onViewDetails?: (ticketId: number) => void;
}

export const TicketCard = ({ ticket, onViewQR, onTransfer, onViewDetails }: TicketCardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="h-5 w-5 text-success" />;
      case "used":
        return <CheckCircleIcon className="h-5 w-5 text-info" />;
      case "transferred":
        return <ArrowPathIcon className="h-5 w-5 text-warning" />;
      case "cancelled":
        return <XCircleIcon className="h-5 w-5 text-error" />;
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
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "badge-success";
      case "used":
        return "badge-info";
      case "transferred":
        return "badge-warning";
      case "cancelled":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 group">
      <figure className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <TicketIcon className="h-16 w-16 text-primary/50" />
        </div>
        <div className="absolute top-4 right-4">
          <span className="badge badge-secondary">{ticket.category}</span>
        </div>
        <div className="absolute top-4 left-4">
          {getStatusIcon(ticket.status)}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-base-100/90 backdrop-blur-sm rounded-lg p-2">
            <div className="text-center">
              <p className="text-sm font-medium">{ticket.ticketType}</p>
              <p className="text-xs text-base-content/70">Seat: {ticket.seatNumber}</p>
            </div>
          </div>
        </div>
      </figure>

      <div className="card-body">
        <div className="flex items-start justify-between mb-2">
          <h3 className="card-title text-lg group-hover:text-primary transition-colors">
            {ticket.eventTitle}
          </h3>
          <span className={`badge ${getStatusColor(ticket.status)}`}>
            {getStatusText(ticket.status)}
          </span>
        </div>

        <div className="space-y-2 text-sm text-base-content/70 mb-4">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            <span>{ticket.eventDate}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>{ticket.eventTime}</span>
          </div>
          <div className="flex items-center">
            <MapPinIcon className="h-4 w-4 mr-2" />
            <span>{ticket.eventLocation}</span>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Ticket Type:</span>
            <span className="text-sm">{ticket.ticketType}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Seat:</span>
            <span className="text-sm">{ticket.seatNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Price:</span>
            <span className="text-sm font-bold text-primary">{ticket.price}</span>
          </div>
        </div>

        {ticket.status === "transferred" && ticket.transferredTo && (
          <div className="bg-warning/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-warning">
              Transferred to: {ticket.transferredTo.slice(0, 6)}...{ticket.transferredTo.slice(-4)}
            </p>
          </div>
        )}

        <div className="text-xs text-base-content/50 mb-4">
          Purchased on {ticket.purchaseDate}
        </div>

        <div className="card-actions">
          <button 
            className="btn btn-primary btn-sm flex-1"
            onClick={() => onViewQR?.(ticket)}
            disabled={ticket.status === "used" || ticket.status === "cancelled"}
          >
            <QrCodeIcon className="h-4 w-4 mr-1" />
            View QR Code
          </button>
          {ticket.isTransferable && ticket.status === "active" && (
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onTransfer?.(ticket.id)}
            >
              <ShareIcon className="h-4 w-4 mr-1" />
              Transfer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
