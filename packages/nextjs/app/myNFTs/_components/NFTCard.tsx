"use client";

import { useState } from "react";
import Image from "next/image";
import { EventTicket } from "./MyHoldings";
import { ListTicketModal } from "./ListTicketModal";
import { formatEther } from "viem";
import { IPFSImage } from "~~/components/IPFSImage";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

interface NFTCardProps {
  nft: EventTicket;
  onListSuccess?: () => void;
}

export const NFTCard = ({ nft, onListSuccess }: NFTCardProps) => {
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  // Get deployed contract address as fallback
  const { data: eventTicketInfo } = useDeployedContractInfo({ contractName: "EventTicket" });

  const eventDate = nft.eventData?.eventDate
    ? new Date(nft.eventData.eventDate * 1000)
    : null;

  // Format date helper function
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
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
    <>
      <div className="card bg-base-100 shadow-xl">
        {/* Event Image */}
        <figure>
          <IPFSImage
            src={nft.eventData?.imageUri || nft.image || ''}
            alt={nft.eventData?.name || nft.name || "Event ticket"}
            className="w-full h-48"
            fallbackSrc="/placeholder-event.svg"
          />
        </figure>

        <div className="card-body">
          <h2 className="card-title">{nft.eventData?.name || nft.name || "Event Ticket"}</h2>
          <p className="text-sm text-base-content/70 line-clamp-2">
            {nft.eventData?.description || nft.description}
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">📅 Date:</span>
              <span>{eventDate ? formatDate(eventDate) : "Date not available"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">📍 Location:</span>
              <span>{nft.eventData?.location || "Location not available"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">🎫 Price:</span>
              <span>{nft.eventData?.ticketPrice ? formatEther(BigInt(nft.eventData.ticketPrice)) : "0"} ETH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">🔗 NFT Hash:</span>
              <span className="text-xs font-mono" title={nft.uri.replace("https://ipfs.io/ipfs/", "")}>{getFormattedHash(nft.uri)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary"
              onClick={() => setIsListModalOpen(true)}
            >
              List for Sale
            </button>
          </div>
        </div>
      </div>

      {/* List Ticket Modal */}
      <ListTicketModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        nftContract={process.env.NEXT_PUBLIC_EVENT_TICKET_CONTRACT || eventTicketInfo?.address || ""}
        tokenId={nft.id}
        onSuccess={() => {
          setIsListModalOpen(false);
          onListSuccess?.();
        }}
      />
    </>
  );
};