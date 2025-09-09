// Pinata configuration
// Note: Replace these with your actual Pinata credentials
// You can set these as environment variables in production
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "your_pinata_jwt_here";
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

export interface EventMetadata {
  name: string;
  description: string;
  image: string;
  eventDate: string;
  ticketPrice: string;
  maxSupply: string;
  eventId: string;
  ticketNumber?: string;
}

/**
 * Upload an image file using the server route that proxies to Pinata
 */
export const uploadImageToPinata = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ipfs/pinata/upload-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    return result.path as string;
  } catch (error) {
    console.error("Error uploading image to Pinata:", error);
    throw new Error("Failed to upload image to IPFS");
  }
};

/**
 * Upload JSON metadata using the server route that proxies to Pinata
 */
export const uploadMetadataToPinata = async (metadata: EventMetadata): Promise<string> => {
  try {
    const response = await fetch('/api/ipfs/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    return result.path as string;
  } catch (error) {
    console.error("Error uploading metadata to Pinata:", error);
    throw new Error("Failed to upload metadata to IPFS");
  }
};

/**
 * Get IPFS URL for a given CID using Pinata gateway
 */
export const getIPFSUrl = (cid: string): string => {
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
};

/**
 * Create and upload complete NFT metadata for an event ticket
 */
export const createAndUploadTicketMetadata = async (
  eventData: {
    name: string;
    description: string;
    eventDate: string;
    ticketPrice: string;
    maxSupply: string;
    eventId: string;
  },
  imageCID: string,
  ticketNumber: string
): Promise<string> => {
  const metadata: EventMetadata = {
    name: `${eventData.name} - Ticket #${ticketNumber}`,
    description: `${eventData.description}\n\nEvent Date: ${eventData.eventDate}\nTicket Price: ${eventData.ticketPrice} ETH\nTicket Number: ${ticketNumber}`,
    image: getIPFSUrl(imageCID),
    eventDate: eventData.eventDate,
    ticketPrice: eventData.ticketPrice,
    maxSupply: eventData.maxSupply,
    eventId: eventData.eventId,
    ticketNumber,
  };

  return await uploadMetadataToPinata(metadata);
};

/**
 * Fetch metadata from IPFS
 */
export const fetchMetadataFromIPFS = async (cid: string): Promise<EventMetadata | null> => {
  try {
    const response = await fetch(getIPFSUrl(cid));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const metadata = await response.json();
    return metadata as EventMetadata;
  } catch (error) {
    console.error("Error fetching metadata from IPFS:", error);
    return null;
  }
};
