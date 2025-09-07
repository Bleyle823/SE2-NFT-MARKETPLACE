"use client";

import { MyHoldings } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { EventTicketMetadata, EventData } from "~~/utils/eventTicket/types";
import { createEventTicketMetadata, getDefaultTicketMetadata } from "~~/utils/eventTicket/metadata";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EventTicket" });

  const { data: tokenIdCounter } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "tokenIdCounter",
    watch: true,
  });

  const handleMintSampleTicket = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    const notificationId = notification.loading("Creating sample ticket...");
    
    try {
      // Create a sample event for demonstration
      const sampleEventData: EventData = {
        eventId: 1,
        name: "Sample Concert",
        description: "An amazing concert experience with live music and great atmosphere",
        location: "Madison Square Garden, New York",
        eventDate: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
        ticketPrice: "0.1",
        maxTickets: 100,
        ticketsSold: 0,
        organizer: connectedAddress,
        isActive: true,
        imageUri: "https://picsum.photos/400/300?random=concert",
      };

      // Create sample ticket metadata
      const ticketMetadata = getDefaultTicketMetadata();
      ticketMetadata.ticketType = "VIP";
      ticketMetadata.seatNumber = "A12";
      ticketMetadata.venueSection = "Front Row";

      const metadata = createEventTicketMetadata(sampleEventData, ticketMetadata, 1);
      
      // Upload metadata to IPFS
      const uploadedItem = await addToIPFS(metadata);
      notification.remove(notificationId);
      notification.success("Sample ticket metadata uploaded to IPFS");

      // Mint the ticket (this would normally require an existing event)
      // For demo purposes, we'll just show the IPFS hash
      console.log("Sample ticket metadata uploaded:", uploadedItem.path);
      notification.success("Sample ticket created! Check the console for IPFS hash.");
      
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error creating sample ticket");
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">My Event Tickets</span>
          </h1>
          <p className="text-center text-base-content/70 mb-8">
            View and manage your NFT event tickets
          </p>
        </div>
      </div>
      
      <div className="flex justify-center gap-4 mb-8">
        {!isConnected || isConnecting ? (
          <RainbowKitCustomConnectButton />
        ) : (
          <>
            <button 
              className="btn btn-primary" 
              onClick={handleMintSampleTicket}
            >
              Create Sample Ticket
            </button>
            <a href="/events" className="btn btn-secondary">
              Browse Events
            </a>
          </>
        )}
      </div>
      
      <MyHoldings />
    </>
  );
};

export default MyNFTs;