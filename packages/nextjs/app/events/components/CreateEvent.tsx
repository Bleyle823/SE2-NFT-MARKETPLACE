"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const CreateEvent = () => {
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    eventDate: "",
    eventTime: "",
    ticketPrice: "",
    maxSupply: "",
  });

  const { writeContractAsync: writeEventTicketNFTAsync, isMining } = useScaffoldWriteContract("EventTicketNFT");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEvent = async () => {
    try {
      if (!eventData.name || !eventData.description || !eventData.eventDate || !eventData.eventTime || !eventData.ticketPrice || !eventData.maxSupply) {
        alert("Please fill in all fields");
        return;
      }

      // Combine date and time into timestamp
      const eventDateTime = new Date(`${eventData.eventDate}T${eventData.eventTime}`);
      const eventTimestamp = Math.floor(eventDateTime.getTime() / 1000);

      // Validate that the event is in the future
      if (eventTimestamp <= Math.floor(Date.now() / 1000)) {
        alert("Event date and time must be in the future");
        return;
      }

      await writeEventTicketNFTAsync({
        functionName: "createEvent",
        args: [
          eventData.name,
          eventData.description,
          BigInt(eventTimestamp),
          parseEther(eventData.ticketPrice),
          BigInt(eventData.maxSupply),
        ],
      });

      // Reset form
      setEventData({
        name: "",
        description: "",
        eventDate: "",
        eventTime: "",
        ticketPrice: "",
        maxSupply: "",
      });

      alert("Event created successfully!");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Error creating event. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center bg-base-300 rounded-2xl p-8 w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Create New Event</h2>
      
      <div className="form-control w-full space-y-4">
        <div>
          <label className="label">
            <span className="label-text font-semibold">Event Name</span>
          </label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleInputChange}
            placeholder="Enter event name"
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold">Description</span>
          </label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleInputChange}
            placeholder="Describe your event"
            className="textarea textarea-bordered w-full h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-semibold">Event Date</span>
            </label>
            <input
              type="date"
              name="eventDate"
              value={eventData.eventDate}
              onChange={handleInputChange}
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold">Event Time</span>
            </label>
            <input
              type="time"
              name="eventTime"
              value={eventData.eventTime}
              onChange={handleInputChange}
              className="input input-bordered w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-semibold">Ticket Price (ETH)</span>
            </label>
            <input
              type="number"
              step="0.001"
              name="ticketPrice"
              value={eventData.ticketPrice}
              onChange={handleInputChange}
              placeholder="0.1"
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold">Max Tickets</span>
            </label>
            <input
              type="number"
              name="maxSupply"
              value={eventData.maxSupply}
              onChange={handleInputChange}
              placeholder="100"
              className="input input-bordered w-full"
            />
          </div>
        </div>

        <button
          onClick={handleCreateEvent}
          disabled={isMining}
          className="btn btn-primary btn-lg w-full mt-6"
        >
          {isMining ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating Event...
            </>
          ) : (
            "Create Event"
          )}
        </button>
      </div>
    </div>
  );
};
