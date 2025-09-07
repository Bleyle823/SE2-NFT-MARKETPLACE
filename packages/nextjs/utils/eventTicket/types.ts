export interface EventTicketMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: EventTicketAttribute[];
  event_details: {
    event_id: number;
    event_name: string;
    event_date: string;
    location: string;
    organizer: string;
    ticket_type: string;
    seat_number?: string;
    venue_section?: string;
  };
}

export interface EventTicketAttribute {
  trait_type: string;
  value: string | number;
  display_type?: "string" | "number" | "boost_number" | "boost_percentage" | "date";
}

export interface EventData {
  eventId: number;
  name: string;
  description: string;
  location: string;
  eventDate: number;
  ticketPrice: string;
  maxTickets: number;
  ticketsSold: number;
  organizer: string;
  isActive: boolean;
  imageUri: string;
}

export interface CreateEventFormData {
  name: string;
  description: string;
  location: string;
  eventDate: string;
  ticketPrice: string;
  maxTickets: string;
  imageUri: string;
}

export interface TicketMetadataFormData {
  ticketType: string;
  seatNumber?: string;
  venueSection?: string;
  customAttributes: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
}
