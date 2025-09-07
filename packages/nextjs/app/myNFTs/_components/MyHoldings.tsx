"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { EventTicketMetadata, EventData } from "~~/utils/eventTicket/types";

export interface EventTicket extends Partial<EventTicketMetadata> {
  id: number;
  uri: string;
  owner: string;
  eventData?: EventData;
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllTickets, setMyAllTickets] = useState<EventTicket[]>([]);
  const [allTicketsLoading, setAllTicketsLoading] = useState(false);

  const { data: eventTicketContract } = useScaffoldContract({
    contractName: "EventTicket",
  });

  const { data: myTotalBalance } = useScaffoldReadContract({
    contractName: "EventTicket",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  useEffect(() => {
    const updateMyTickets = async (): Promise<void> => {
      if (myTotalBalance === undefined || eventTicketContract === undefined || connectedAddress === undefined)
        return;

      setAllTicketsLoading(true);
      const ticketUpdate: EventTicket[] = [];
      const totalBalance = parseInt(myTotalBalance.toString());
      
      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          const tokenId = await eventTicketContract.read.tokenOfOwnerByIndex([
            connectedAddress,
            BigInt(tokenIndex),
          ]);

          const tokenURI = await eventTicketContract.read.tokenURI([tokenId]);
          const ipfsHash = tokenURI.replace("https://ipfs.io/ipfs/", "");

          // Fetch ticket metadata from IPFS
          const ticketMetadata: EventTicketMetadata = await getMetadataFromIPFS(ipfsHash);

          // Fetch event data from contract
          let eventData: EventData | undefined;
          try {
            const eventId = ticketMetadata.event_details?.event_id;
            if (eventId) {
              const eventFromContract = await eventTicketContract.read.getEvent([BigInt(eventId)]);
              eventData = {
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
            }
          } catch (error) {
            console.warn("Could not fetch event data for ticket:", tokenId);
          }

          ticketUpdate.push({
            id: parseInt(tokenId.toString()),
            uri: tokenURI,
            owner: connectedAddress,
            ...ticketMetadata,
            eventData,
          });
        } catch (e) {
          notification.error("Error fetching ticket data");
          setAllTicketsLoading(false);
          console.log(e);
        }
      }
      
      ticketUpdate.sort((a, b) => a.id - b.id);
      setMyAllTickets(ticketUpdate);
      setAllTicketsLoading(false);
    };

    updateMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress, myTotalBalance]);

  if (allTicketsLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  return (
    <>
      {myAllTickets.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-center">
            <div className="text-2xl text-primary-content mb-4">No Event Tickets Found</div>
            <p className="text-base-content/70 mb-4">
              You don't have any event tickets yet. Start by browsing events or creating your own!
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/events" className="btn btn-primary">
                Browse Events
              </a>
              <a href="/ipfsUpload" className="btn btn-secondary">
                Create Event
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-7xl px-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Your Event Tickets</h2>
            <p className="text-base-content/70">
              You have {myAllTickets.length} event ticket{myAllTickets.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAllTickets.map(ticket => (
              <NFTCard nft={ticket} key={ticket.id} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};