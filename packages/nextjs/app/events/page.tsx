"use client";

import { useState } from "react";
import { CreateEvent } from "./components/CreateEvent";
import { EventList } from "./components/EventList";
import { Marketplace } from "./components/Marketplace";
import { MyTickets } from "./components/MyTickets";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const Events: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"events" | "marketplace" | "myTickets" | "create">("events");

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 text-center max-w-6xl">
          <h1 className="text-4xl font-bold">🎫 Event Ticketing NFT System</h1>
          <div className="mt-4">
            <p className="text-lg">
              Create events, buy tickets as NFTs, and trade them on the marketplace. All powered by blockchain technology for secure, transparent, and fraud-proof ticketing.
            </p>
          </div>

          <div className="divider my-6" />

          {connectedAddress ? (
            <>
              {/* Tab Navigation */}
              <div className="tabs tabs-boxed mb-8 bg-base-200">
                <button
                  className={`tab ${activeTab === "events" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("events")}
                >
                  📅 Browse Events
                </button>
                <button
                  className={`tab ${activeTab === "marketplace" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("marketplace")}
                >
                  🛒 Marketplace
                </button>
                <button
                  className={`tab ${activeTab === "myTickets" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("myTickets")}
                >
                  🎟️ My Tickets
                </button>
                <button
                  className={`tab ${activeTab === "create" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("create")}
                >
                  ➕ Create Event
                </button>
              </div>

              {/* Tab Content */}
              <div className="w-full">
                {activeTab === "events" && <EventList />}
                {activeTab === "marketplace" && <Marketplace />}
                {activeTab === "myTickets" && <MyTickets />}
                {activeTab === "create" && <CreateEvent />}
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center bg-base-300 w-full mt-8 px-8 pt-6 pb-12 rounded-2xl">
              <p className="text-xl font-bold mb-4">Please connect your wallet to access the event ticketing system.</p>
              <RainbowKitCustomConnectButton />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Events;
