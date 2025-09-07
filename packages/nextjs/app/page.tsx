"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon, CalendarDaysIcon, PhotoIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">EventTicket Platform</span>
            <span className="block text-xl font-bold">NFT-based Event Ticket System</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="flex items-center flex-col flex-grow mt-4">
            <div className="px-5 w-[90%]">
              <h1 className="text-center mb-6">
                <span className="block text-4xl font-bold">Event Ticket Platform</span>
              </h1>
              <div className="flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl mb-8">
                  <div className="hero bg-base-200 rounded-xl p-8">
                    <div className="hero-content text-center">
                      <div className="max-w-md">
                        <h1 className="text-3xl font-bold">🎫 Event Tickets as NFTs</h1>
                        <p className="py-6">
                          Create, buy, and manage event tickets as unique NFTs on the blockchain. 
                          Each ticket is a verifiable digital asset with rich metadata.
                        </p>
                        <div className="flex gap-4 justify-center">
                          <Link href="/events" className="btn btn-primary">
                            Browse Events
                          </Link>
                          <Link href="/ipfsUpload" className="btn btn-secondary">
                            Create Event
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="max-w-3xl">
                  <p className="text-center text-lg mt-8">
                    🎪 This platform allows event organizers to create NFT-based tickets for their events. 
                    Each ticket is a unique digital asset stored on the blockchain with rich metadata including 
                    event details, seat information, and custom attributes.
                  </p>
                  <p className="text-center text-lg">
                    🚀 Built with Scaffold-ETH 2, featuring smart contracts for event management, 
                    IPFS for metadata storage, and a modern React frontend for seamless user experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-8 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center max-w-xs rounded-3xl">
              <CalendarDaysIcon className="h-8 w-8 fill-secondary" />
              <h3 className="font-bold mb-2">Discover Events</h3>
              <p className="text-sm">
                Browse and purchase tickets for upcoming events in the{" "}
                <Link href="/events" passHref className="link">
                  Events
                </Link>{" "}
                section.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center max-w-xs rounded-3xl">
              <PhotoIcon className="h-8 w-8 fill-secondary" />
              <h3 className="font-bold mb-2">My Tickets</h3>
              <p className="text-sm">
                View and manage your NFT event tickets in{" "}
                <Link href="/myNFTs" passHref className="link">
                  My Tickets
                </Link>{" "}
                section.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center max-w-xs rounded-3xl">
              <UserGroupIcon className="h-8 w-8 fill-secondary" />
              <h3 className="font-bold mb-2">Organizer Dashboard</h3>
              <p className="text-sm">
                Create and manage your events in the{" "}
                <Link href="/organizer" passHref className="link">
                  Organizer
                </Link>{" "}
                dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
