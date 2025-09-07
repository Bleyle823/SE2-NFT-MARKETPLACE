import { EventTicketMetadata, EventData, TicketMetadataFormData } from "./types";

export const createEventTicketMetadata = (
  eventData: EventData,
  ticketMetadata: TicketMetadataFormData,
  tokenId: number
): EventTicketMetadata => {
  const baseAttributes = [
    {
      trait_type: "Event ID",
      value: eventData.eventId,
      display_type: "number" as const,
    },
    {
      trait_type: "Event Date",
      value: new Date(eventData.eventDate * 1000).toISOString(),
      display_type: "date" as const,
    },
    {
      trait_type: "Location",
      value: eventData.location,
    },
    {
      trait_type: "Ticket Type",
      value: ticketMetadata.ticketType,
    },
    {
      trait_type: "Organizer",
      value: eventData.organizer,
    },
  ];

  // Add seat number if provided
  if (ticketMetadata.seatNumber) {
    baseAttributes.push({
      trait_type: "Seat Number",
      value: ticketMetadata.seatNumber,
    });
  }

  // Add venue section if provided
  if (ticketMetadata.venueSection) {
    baseAttributes.push({
      trait_type: "Venue Section",
      value: ticketMetadata.venueSection,
    });
  }

  // Add custom attributes
  const allAttributes = [...baseAttributes, ...ticketMetadata.customAttributes];

  return {
    name: `${eventData.name} - Ticket #${tokenId}`,
    description: `Official ticket for ${eventData.name}. ${eventData.description}`,
    image: eventData.imageUri,
    external_url: `https://eventtickets.app/event/${eventData.eventId}`,
    attributes: allAttributes,
    event_details: {
      event_id: eventData.eventId,
      event_name: eventData.name,
      event_date: new Date(eventData.eventDate * 1000).toISOString(),
      location: eventData.location,
      organizer: eventData.organizer,
      ticket_type: ticketMetadata.ticketType,
      seat_number: ticketMetadata.seatNumber,
      venue_section: ticketMetadata.venueSection,
    },
  };
};

export const getDefaultTicketMetadata = (): TicketMetadataFormData => ({
  ticketType: "General Admission",
  seatNumber: "",
  venueSection: "",
  customAttributes: [
    {
      trait_type: "Rarity",
      value: "Common",
    },
  ],
});

export const validateEventData = (eventData: any): string[] => {
  const errors: string[] = [];

  if (!eventData.name || eventData.name.trim().length === 0) {
    errors.push("Event name is required");
  }

  if (!eventData.description || eventData.description.trim().length === 0) {
    errors.push("Event description is required");
  }

  if (!eventData.location || eventData.location.trim().length === 0) {
    errors.push("Event location is required");
  }

  if (!eventData.eventDate) {
    errors.push("Event date is required");
  } else {
    const eventDate = new Date(eventData.eventDate);
    if (eventDate <= new Date()) {
      errors.push("Event date must be in the future");
    }
  }

  if (!eventData.ticketPrice || parseFloat(eventData.ticketPrice) < 0) {
    errors.push("Ticket price must be a valid positive number");
  }

  if (!eventData.maxTickets || parseInt(eventData.maxTickets) <= 0) {
    errors.push("Maximum tickets must be a positive number");
  }

  if (!eventData.imageUri || eventData.imageUri.trim().length === 0) {
    errors.push("Event image is required - please upload an image");
  }

  return errors;
};
