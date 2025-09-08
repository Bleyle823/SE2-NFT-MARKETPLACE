"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getNFTMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { IPFSImage } from "~~/components/IPFSImage";
import { EventTicketMetadata, EventData } from "~~/utils/eventTicket/types";

interface NFTListingCardProps {
  listingId: bigint;
  nftContract: string;
  tokenId: bigint;
  seller: string;
  price: bigint;
  isActive: boolean;
  onBuySuccess?: () => void;
}

interface NFTMetadata extends EventTicketMetadata {
  // This extends EventTicketMetadata to include all ticket-specific fields
}

export const NFTListingCard = ({
  listingId,
  nftContract,
  tokenId,
  seller,
  price,
  isActive,
  onBuySuccess,
}: NFTListingCardProps) => {
  const { address: connectedAddress } = useAccount();
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Get token URI from the NFT contract
  const { data: tokenUri } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "tokenURI",
    args: [tokenId],
  });

  // Get the EventTicket contract for fetching event data
  const { data: eventTicketContract } = useScaffoldContract({
    contractName: "EventTicket",
  });

  // Buy ticket function
  const { writeContractAsync: writeMarketplace } = useScaffoldWriteContract({
    contractName: "NFTMarketplace",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!tokenUri || !eventTicketContract) return;

      try {
        const ipfsHash = tokenUri.replace(/^https?:\/\/[^\/]+\/ipfs\//, "").replace("ipfs://", "");
        console.log("Fetching metadata for hash:", ipfsHash);
        
        // Fetch ticket metadata from IPFS
        const ticketMetadata: EventTicketMetadata = await getMetadataFromIPFS(ipfsHash);
        if (!ticketMetadata) {
          setMetadataError("Failed to load ticket metadata");
          return;
        }
        
        setMetadata(ticketMetadata);

        // Fetch event data from contract if event_id is available
        if (ticketMetadata.event_details?.event_id) {
          try {
            const eventFromContract = await eventTicketContract.read.getEvent([BigInt(ticketMetadata.event_details.event_id)]);
            const eventData: EventData = {
              eventId: Number(eventFromContract.eventId),
              name: eventFromContract.name,
              description: eventFromContract.description,
              location: eventFromContract.location,
              eventDate: Number(eventFromContract.eventDate),
              ticketPrice: eventFromContract.ticketPrice.toString(),
              maxTickets: Number(eventFromContract.maxTickets),
              ticketsSold: Number(eventFromContract.ticketsSold),
              organizer: eventFromContract.organizer,
              isActive: eventFromContract.isActive,
              imageUri: eventFromContract.imageUri,
            };
            setEventData(eventData);
          } catch (error) {
            console.warn("Could not fetch event data for ticket:", tokenId);
          }
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
        setMetadataError("Error loading ticket data");
      }
    };

    fetchMetadata();
  }, [tokenUri, eventTicketContract, tokenId]);

  const handleBuyTicket = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      await writeMarketplace({
        functionName: "buyTicket",
        args: [listingId],
        value: price,
      });
      notification.success("Successfully purchased ticket!");
      onBuySuccess?.();
    } catch (error) {
      console.error("Error buying ticket:", error);
      notification.error("Error buying ticket");
    } finally {
      setLoading(false);
    }
  };

  if (!metadata) {
    return (
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          {metadataError ? (
            <div className="text-error">
              <h2 className="card-title">Error</h2>
              <p>{metadataError}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg"></span>
              <h2 className="card-title">Loading NFT...</h2>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isOwner = connectedAddress?.toLowerCase() === seller.toLowerCase();
  
  // Format event date if available
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract and format IPFS hash
  const getFormattedHash = (uri: string) => {
    const hash = uri.replace("https://ipfs.io/ipfs/", "").replace("ipfs://", "");
    return hash.length > 20 ? `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}` : hash;
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <figure>
        <IPFSImage
          src={eventData?.imageUri || metadata?.image || ''}
          alt={eventData?.name || metadata?.name || "Event ticket"}
          className="w-full h-48"
          fallbackSrc="/placeholder-event.svg"
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{eventData?.name || metadata?.name || "Event Ticket"}</h2>
        <p className="text-sm text-base-content/70 line-clamp-2">
          {eventData?.description || metadata?.description}
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">📅 Date:</span>
            <span>{eventData?.eventDate ? formatDate(eventData.eventDate) : "Date not available"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">📍 Location:</span>
            <span>{eventData?.location || "Location not available"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">🎫 Price:</span>
            <span>{eventData?.ticketPrice ? formatEther(BigInt(eventData.ticketPrice)) : "0"} ETH</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">🔗 NFT Hash:</span>
            <span className="text-xs font-mono" title={tokenUri ? tokenUri.replace("https://ipfs.io/ipfs/", "") : ""}>{tokenUri ? getFormattedHash(tokenUri) : "Loading..."}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">💰 Sale Price:</span>
            <span className="text-primary font-bold">{formatEther(price)} ETH</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">👤 Seller:</span>
            <Address address={seller} />
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          {isActive && !isOwner ? (
            <button
              className={`btn btn-primary ${loading ? "loading" : ""}`}
              onClick={handleBuyTicket}
              disabled={loading}
            >
              {loading ? "Processing..." : "Buy Ticket"}
            </button>
          ) : isOwner ? (
            <div className="badge badge-accent">Your Listing</div>
          ) : (
            <div className="badge badge-secondary">Sold</div>
          )}
        </div>
      </div>
    </div>
  );
};
