"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useMarketplace } from "~~/contexts/MarketplaceContext";
import { 
  CalendarDaysIcon, 
  MapPinIcon,
  ClockIcon,
  TicketIcon,
  PhotoIcon,
  TagIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ComputerDesktopIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

const CreateEventPage = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { createEvent, state, configureEventSale, grantMinterRoleToSales } = useMarketplace();
  const { data: eventFactoryInfo } = useDeployedContractInfo("EventFactory");

  // Read platform creation fee
  const { data: platformConfig } = useScaffoldReadContract({
    contractName: "EventFactory",
    functionName: "getPlatformConfig",
  });

  // Read RVFY allowance for EventFactory
  const { data: currentAllowance } = useScaffoldReadContract({
    contractName: "RovifyToken",
    functionName: "allowance",
    args: address && eventFactoryInfo?.address ? [address as `0x${string}`, eventFactoryInfo.address as `0x${string}`] : undefined,
  });

  // Write approve on RVFY
  const { writeContractAsync: approveTokenAsync } = useScaffoldWriteContract({
    contractName: "RovifyToken",
  });
  // Mint tickets via EventTicketNFT
  const { writeContractAsync: mintTicketAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    location: "",
    startTime: "",
    endTime: "",
    ticketPrice: "",
    maxAttendees: "",
    isVirtual: false,
    tags: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Optional initial NFT minting
  const [mintAfterCreate, setMintAfterCreate] = useState(false);
  const [mintQuantity, setMintQuantity] = useState(0);
  const [mintTicketType, setMintTicketType] = useState("");
  const [mintTransferable, setMintTransferable] = useState(true);

  // Optional Sale Configuration
  const [enableSale, setEnableSale] = useState(false);
  const [salePriceEth, setSalePriceEth] = useState("");
  const [saleMaxSupply, setSaleMaxSupply] = useState("");
  const [saleMaxPerWallet, setSaleMaxPerWallet] = useState("2");
  const [saleStart, setSaleStart] = useState("");
  const [saleEnd, setSaleEnd] = useState("");
  const [saleWhitelistOnly, setSaleWhitelistOnly] = useState(false);
  const [alsoGrantMinterRole, setAlsoGrantMinterRole] = useState(true);
  // (removed duplicate mint state)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsSubmitting(true);
    try {
      // Compute and validate times (seconds)
      const startTimeSec = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimeSec = Math.floor(new Date(formData.endTime).getTime() / 1000);
      const nowSec = Math.floor(Date.now() / 1000);

      if (!startTimeSec || !endTimeSec || Number.isNaN(startTimeSec) || Number.isNaN(endTimeSec)) {
        alert("Please provide valid start and end times.");
        setIsSubmitting(false);
        return;
      }

      if (startTimeSec <= nowSec) {
        alert("Start time must be in the future.");
        setIsSubmitting(false);
        return;
      }

      if (endTimeSec <= startTimeSec) {
        alert("End time must be after start time.");
        setIsSubmitting(false);
        return;
      }

      const minDuration = (platformConfig as any)?.minEventDuration as bigint | undefined;
      const maxDuration = (platformConfig as any)?.maxEventDuration as bigint | undefined;
      const duration = endTimeSec - startTimeSec;
      if (minDuration && duration < Number(minDuration)) {
        alert(`Event duration too short. Minimum is ${Math.ceil(Number(minDuration) / 3600)} hours.`);
        setIsSubmitting(false);
        return;
      }
      if (maxDuration && duration > Number(maxDuration)) {
        alert(`Event duration too long. Maximum is ${Math.floor(Number(maxDuration) / 86400)} days.`);
        setIsSubmitting(false);
        return;
      }

      // Ensure sufficient RVFY allowance to EventFactory for creationFee
      const creationFee = (platformConfig as any)?.creationFee as bigint | undefined;
      const spender = eventFactoryInfo?.address as `0x${string}` | undefined;

      if (address && spender && creationFee && (currentAllowance as bigint | undefined) !== undefined) {
        const allowance = currentAllowance as bigint;
        if (allowance < creationFee) {
          await approveTokenAsync({
            functionName: "approve",
            args: [spender, creationFee],
          });
        }
      }

      const eventData = {
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl,
        location: formData.location,
        // Use validated seconds
        startTime: startTimeSec,
        endTime: endTimeSec,
        ticketPrice: formData.ticketPrice,
        maxAttendees: parseInt(formData.maxAttendees),
        isVirtual: formData.isVirtual,
        tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
        creator: address,
        status: "created" as const,
        ticketsSold: 0,
        availableTickets: parseInt(formData.maxAttendees),
      };

      await createEvent(eventData);

      // Optionally mint initial tickets as NFTs
      if (mintAfterCreate && mintQuantity > 0 && mintTicketType.trim().length > 0) {
        try {
          if (publicClient && eventFactoryInfo?.address && eventFactoryInfo?.abi) {
            const currentId2 = (await publicClient.readContract({
              address: eventFactoryInfo.address as `0x${string}`,
              abi: eventFactoryInfo.abi as any,
              functionName: "getCurrentEventId",
              args: [],
            })) as bigint;
            const newEventId2 = currentId2 - 1n;

            const qty = Math.max(0, Math.min(mintQuantity, 25));
            for (let i = 0; i < qty; i++) {
              await mintTicketAsync({
                functionName: "mintTicket",
                args: [address as `0x${string}`, newEventId2, mintTicketType, mintTransferable],
              });
            }
          }
        } catch (e) {
          console.error("Minting tickets failed:", e);
          alert("Event created. Ticket minting failed or requires MINTER_ROLE. You can mint later from Debug.");
        }
      }

      // Optionally configure sale
      if (enableSale) {
        try {
          if (publicClient && eventFactoryInfo?.address && eventFactoryInfo?.abi) {
            const currentId3 = (await publicClient.readContract({
              address: eventFactoryInfo.address as `0x${string}`,
              abi: eventFactoryInfo.abi as any,
              functionName: "getCurrentEventId",
              args: [],
            })) as bigint;
            const newEventId3 = Number(currentId3 - 1n);

            // Enforce start at least now+30s, end > start; default end +30 days
            const nowSecNum = Math.floor(Date.now() / 1000);
            const desiredStart = saleStart ? Math.floor(new Date(saleStart).getTime() / 1000) : nowSecNum + 30;
            const startSec = Math.max(desiredStart, nowSecNum + 30);
            let endSec = saleEnd ? Math.floor(new Date(saleEnd).getTime() / 1000) : startSec + 30 * 24 * 60 * 60;
            if (endSec <= startSec) endSec = startSec + 60 * 60; // +1h minimum
            const priceWei = salePriceEth ? parseEther(salePriceEth) : 0n;

            if (alsoGrantMinterRole) {
              await grantMinterRoleToSales();
            }

            await configureEventSale({
              eventId: newEventId3,
              priceWei: priceWei.toString(),
              maxSupply: parseInt(saleMaxSupply || "0"),
              maxPerWallet: parseInt(saleMaxPerWallet || "1"),
              saleStart: startSec,
              saleEnd: endSec,
              whitelistOnly: saleWhitelistOnly,
            });
          }
        } catch (e) {
          console.error("Sale configuration failed:", e);
          alert("Event created. Sale configuration failed; configure later from Debug or Setup.");
        }
      }
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        location: "",
        startTime: "",
        endTime: "",
        ticketPrice: "",
        maxAttendees: "",
        isVirtual: false,
        tags: "",
      });
      setMintAfterCreate(false);
      setMintQuantity(0);
      setMintTicketType("");
      setMintTransferable(true);
      setEnableSale(false);
      setSalePriceEth("");
      setSaleMaxSupply("");
      setSaleMaxPerWallet("2");
      setSaleStart("");
      setSaleEnd("");
      setSaleWhitelistOnly(false);
      setAlsoGrantMinterRole(true);

      alert("Event created successfully!");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-base-content/70">Please connect your wallet to create an event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Create New Event</h1>
            <p className="text-xl text-base-content/70">
              Set up your event and start selling tickets as NFTs
            </p>
          </div>

          {/* Form */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-lg font-medium flex items-center">
                      <CalendarDaysIcon className="h-5 w-5 mr-2" />
                      Event Name *
                    </span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter event name"
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-lg font-medium">Description *</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your event..."
                    className="textarea textarea-bordered w-full h-32"
                    required
                  />
                </div>

                {/* Image URL */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-lg font-medium flex items-center">
                      <PhotoIcon className="h-5 w-5 mr-2" />
                      Event Image URL
                    </span>
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className="input input-bordered w-full"
                  />
                </div>

                {/* Location and Virtual Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        Location *
                      </span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, Country"
                      className="input input-bordered w-full"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                        Event Type
                      </span>
                    </label>
                    <label className="label cursor-pointer">
                      <span className="label-text">Virtual Event</span>
                      <input
                        type="checkbox"
                        name="isVirtual"
                        checked={formData.isVirtual}
                        onChange={handleInputChange}
                        className="toggle toggle-primary"
                      />
                    </label>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <ClockIcon className="h-5 w-5 mr-2" />
                        Start Date & Time *
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <ClockIcon className="h-5 w-5 mr-2" />
                        End Date & Time *
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      required
                    />
                  </div>
                </div>

                {/* Ticket Price and Max Attendees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                        Ticket Price (RVFY) *
                      </span>
                    </label>
                    <input
                      type="number"
                      name="ticketPrice"
                      value={formData.ticketPrice}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="input input-bordered w-full"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium flex items-center">
                        <UsersIcon className="h-5 w-5 mr-2" />
                        Max Attendees *
                      </span>
                    </label>
                    <input
                      type="number"
                      name="maxAttendees"
                      value={formData.maxAttendees}
                      onChange={handleInputChange}
                      placeholder="100"
                      min="1"
                      className="input input-bordered w-full"
                      required
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-lg font-medium flex items-center">
                      <TagIcon className="h-5 w-5 mr-2" />
                      Tags
                    </span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="Conference, Blockchain, Networking (comma separated)"
                    className="input input-bordered w-full"
                  />
                  <label className="label">
                    <span className="label-text-alt">Separate tags with commas</span>
                  </label>
                </div>

                {/* Optional Initial Ticket Minting */}
                <div className="bg-base-200 rounded-xl p-4">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">Mint initial NFT tickets after event creation</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={mintAfterCreate}
                      onChange={e => setMintAfterCreate(e.target.checked)}
                    />
                  </label>

                  {mintAfterCreate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Quantity (max 25)</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={25}
                          value={mintQuantity}
                          onChange={e => setMintQuantity(parseInt(e.target.value || "0"))}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Ticket Type (e.g., VIP, GA)</span>
                        </label>
                        <input
                          type="text"
                          value={mintTicketType}
                          onChange={e => setMintTicketType(e.target.value)}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Transferable</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={mintTransferable ? "yes" : "no"}
                          onChange={e => setMintTransferable(e.target.value === "yes")}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Sale Setup */}
                <div className="bg-base-200 rounded-xl p-4">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">Enable ticket sale after event creation</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={enableSale}
                      onChange={e => setEnableSale(e.target.checked)}
                    />
                  </label>

                  {enableSale && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Price (ETH)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={salePriceEth}
                          onChange={e => setSalePriceEth(e.target.value)}
                          className="input input-bordered"
                          placeholder="0.0001"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Max Supply</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={saleMaxSupply}
                          onChange={e => setSaleMaxSupply(e.target.value)}
                          className="input input-bordered"
                          placeholder="50"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Max Per Wallet</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={saleMaxPerWallet}
                          onChange={e => setSaleMaxPerWallet(e.target.value)}
                          className="input input-bordered"
                          placeholder="2"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Sale Start (local)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={saleStart}
                          onChange={e => setSaleStart(e.target.value)}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Sale End (optional)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={saleEnd}
                          onChange={e => setSaleEnd(e.target.value)}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Whitelist Only</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={saleWhitelistOnly ? "yes" : "no"}
                          onChange={e => setSaleWhitelistOnly(e.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {enableSale && (
                    <div className="mt-3 flex items-center justify-between">
                      <label className="label cursor-pointer">
                        <span className="label-text">Grant MINTER_ROLE to TicketSales</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={alsoGrantMinterRole}
                          onChange={e => setAlsoGrantMinterRole(e.target.checked)}
                        />
                      </label>
                      <div className="text-xs opacity-70">
                        If this fails due to permissions, use Debug → EventTicketNFT → grantRole.
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Initial Ticket Minting */}
                <div className="bg-base-200 rounded-xl p-4">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">Mint initial NFT tickets after event creation</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={mintAfterCreate}
                      onChange={e => setMintAfterCreate(e.target.checked)}
                    />
                  </label>

                  {mintAfterCreate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Quantity (max 25)</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={25}
                          value={mintQuantity}
                          onChange={e => setMintQuantity(parseInt(e.target.value || "0"))}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Ticket Type (e.g., VIP, GA)</span>
                        </label>
                        <input
                          type="text"
                          value={mintTicketType}
                          onChange={e => setMintTicketType(e.target.value)}
                          className="input input-bordered"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Transferable</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={mintTransferable ? "yes" : "no"}
                          onChange={e => setMintTransferable(e.target.value === "yes")}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="form-control mt-8">
                  <button
                    type="submit"
                    disabled={isSubmitting || state.loading}
                    className="btn btn-primary btn-lg w-full"
                  >
                    {isSubmitting || state.loading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Creating Event...
                      </>
                    ) : (
                      <>
                        <CalendarDaysIcon className="h-5 w-5 mr-2" />
                        Create Event
                      </>
                    )}
                  </button>
                </div>

                {/* Error Display */}
                {state.error && (
                  <div className="alert alert-error">
                    <span>{state.error}</span>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 card bg-info/10 border border-info/20">
            <div className="card-body">
              <h3 className="card-title text-info">
                <GlobeAltIcon className="h-5 w-5" />
                Event Creation Info
              </h3>
              <div className="space-y-2 text-sm">
                <p>• Your event will be created on the blockchain and cannot be modified after creation</p>
                <p>• A small fee in RVFY tokens is required to create an event</p>
                <p>• Tickets will be minted as NFTs when purchased</p>
                <p>• You can manage your event through the event dashboard after creation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
