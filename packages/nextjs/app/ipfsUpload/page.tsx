"use client";

import { lazy, useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { enhancedIPFS } from "~~/utils/enhanced-ipfs";
import { 
  EventTicketMetadata, 
  CreateEventFormData, 
  TicketMetadataFormData,
  EventData 
} from "~~/utils/eventTicket/types";
import { 
  createEventTicketMetadata, 
  getDefaultTicketMetadata, 
  validateEventData 
} from "~~/utils/eventTicket/metadata";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const LazyReactJson = lazy(() => import("react-json-view"));

const IpfsUpload: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [loading, setLoading] = useState(false);
  const [uploadedIpfsPath, setUploadedIpfsPath] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"create-event" | "create-ticket">("create-event");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Event creation form
  const [eventForm, setEventForm] = useState<CreateEventFormData>({
    name: "",
    description: "",
    location: "",
    eventDate: "",
    ticketPrice: "0",
    maxTickets: "100",
    imageUri: "",
  });
  
  // Ticket metadata form
  const [ticketMetadata, setTicketMetadata] = useState<TicketMetadataFormData>(getDefaultTicketMetadata());
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [generatedMetadata, setGeneratedMetadata] = useState<EventTicketMetadata | null>(null);
  
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EventTicket" });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    const notificationId = notification.loading("Uploading image to IPFS...");
    
    try {
      // Use enhanced IPFS service for better reliability
      const result = await enhancedIPFS.uploadFile(file);
      
      notification.remove(notificationId);
      notification.success(`Image uploaded to IPFS successfully! ${enhancedIPFS.isPinataAvailable() ? '(via Pinata)' : '(via Infura)'}`);
      
      setEventForm(prev => ({ ...prev, imageUri: result.url }));
      setUploadingImage(false);
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error uploading image to IPFS");
      console.error(error);
      setUploadingImage(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      notification.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notification.error("Image file size must be less than 10MB");
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCreateEvent = async () => {
    const errors = validateEventData(eventForm);
    if (errors.length > 0) {
      errors.forEach(error => notification.error(error));
      return;
    }

    // Additional validation for ticket price
    const ticketPriceNum = parseFloat(eventForm.ticketPrice);
    if (isNaN(ticketPriceNum) || ticketPriceNum < 0) {
      notification.error("Please enter a valid ticket price");
      return;
    }

    // Additional validation for max tickets
    const maxTicketsNum = parseInt(eventForm.maxTickets);
    if (isNaN(maxTicketsNum) || maxTicketsNum <= 0) {
      notification.error("Please enter a valid number of maximum tickets");
      return;
    }

    setLoading(true);
    const notificationId = notification.loading("Creating event...");
    
    try {
      const eventDate = Math.floor(new Date(eventForm.eventDate).getTime() / 1000);
      
      await writeContractAsync({
        functionName: "createEvent",
        args: [
          eventForm.name,
          eventForm.description,
          eventForm.location,
          BigInt(eventDate),
          parseEther(eventForm.ticketPrice),
          BigInt(eventForm.maxTickets),
          eventForm.imageUri,
        ],
      });
      
      notification.remove(notificationId);
      notification.success("Event created successfully!");
      
      // Reset form
      setEventForm({
        name: "",
        description: "",
        location: "",
        eventDate: "",
        ticketPrice: "0",
        maxTickets: "100",
        imageUri: "",
      });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error creating event");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTicketMetadata = () => {
    if (!selectedEventId) {
      notification.error("Please select an event");
      return;
    }

    // For demo purposes, we'll create a mock event data
    // In a real app, you'd fetch this from the contract
    const mockEventData: EventData = {
      eventId: parseInt(selectedEventId),
      name: "Sample Event",
      description: "A sample event for ticket generation",
      location: "Sample Location",
      eventDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
      ticketPrice: "0.1",
      maxTickets: 100,
      ticketsSold: 0,
      organizer: connectedAddress || "",
      isActive: true,
      imageUri: "https://example.com/event-image.jpg",
    };

    const metadata = createEventTicketMetadata(mockEventData, ticketMetadata, 1);
    setGeneratedMetadata(metadata);
  };

  const handleUploadToIPFS = async () => {
    if (!generatedMetadata) {
      notification.error("Please generate ticket metadata first");
      return;
    }

    setLoading(true);
    const notificationId = notification.loading("Uploading to IPFS...");
    
    try {
      const uploadedItem = await enhancedIPFS.uploadJSON(generatedMetadata);
      notification.remove(notificationId);
      notification.success(`Uploaded to IPFS ${enhancedIPFS.isPinataAvailable() ? '(via Pinata)' : '(via Infura)'}`);

      setUploadedIpfsPath(uploadedItem.path);
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error uploading to IPFS");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomAttribute = () => {
    setTicketMetadata(prev => ({
      ...prev,
      customAttributes: [
        ...prev.customAttributes,
        { trait_type: "", value: "" }
      ]
    }));
  };

  const removeCustomAttribute = (index: number) => {
    setTicketMetadata(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, i) => i !== index)
    }));
  };

  const updateCustomAttribute = (index: number, field: "trait_type" | "value", value: string) => {
    setTicketMetadata(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  if (!isConnected || isConnecting) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Event Ticket Creator</span>
        </h1>
        <div className="mt-8">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Event Ticket Creator</span>
        </h1>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed mb-8">
          <button
            className={`tab ${activeTab === "create-event" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("create-event")}
          >
            Create Event
          </button>
          <button
            className={`tab ${activeTab === "create-ticket" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("create-ticket")}
          >
            Create Ticket Metadata
          </button>
        </div>

        {activeTab === "create-event" && (
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Create New Event</h2>
              
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Event Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter event name"
                  className="input input-bordered w-full max-w-xs"
                  value={eventForm.name}
                  onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="Enter event description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter event location"
                  className="input input-bordered w-full max-w-xs"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Event Date</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full max-w-xs"
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Ticket Price (ETH)</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.1"
                  className="input input-bordered w-full max-w-xs"
                  value={eventForm.ticketPrice}
                  onChange={(e) => setEventForm(prev => ({ ...prev, ticketPrice: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Max Tickets</span>
                </label>
                <input
                  type="number"
                  placeholder="100"
                  className="input input-bordered w-full max-w-xs"
                  value={eventForm.maxTickets}
                  onChange={(e) => setEventForm(prev => ({ ...prev, maxTickets: e.target.value }))}
                />
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Event Image</span>
                </label>
                
                {/* Image Upload Section */}
                <div className="space-y-4">
                  {/* Drag and Drop Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? "border-primary bg-primary/10" 
                        : "border-base-300 hover:border-primary/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-12 w-12 text-base-content/50"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="text-sm">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="font-medium text-primary hover:text-primary/80">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleFileChange}
                          disabled={uploadingImage}
                        />
                      </div>
                      <p className="text-xs text-base-content/50">
                        PNG, JPG, GIF, WebP up to 10MB
                      </p>
                    </div>
                  </div>
                  
                  {imagePreview && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Preview:</p>
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full max-w-xs h-32 object-cover rounded-lg border"
                      />
                      {imageFile && (
                        <div className="text-xs text-base-content/70">
                          <p><strong>File:</strong> {imageFile.name}</p>
                          <p><strong>Size:</strong> {(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p><strong>Type:</strong> {imageFile.type}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        className={`btn btn-sm btn-primary ${uploadingImage ? "loading" : ""}`}
                        disabled={uploadingImage || !imageFile}
                        onClick={() => imageFile && handleImageUpload(imageFile)}
                      >
                        {uploadingImage ? "Uploading..." : "Upload to IPFS"}
                      </button>
                    </div>
                  )}
                  
                  {eventForm.imageUri && (
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-bold">Image uploaded!</div>
                        <div className="text-xs break-all">IPFS: {eventForm.imageUri}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setEventForm(prev => ({ ...prev, imageUri: "" }));
                          setImageFile(null);
                          setImagePreview("");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions justify-end">
                <button
                  className={`btn btn-primary ${loading ? "loading" : ""}`}
                  disabled={loading}
                  onClick={handleCreateEvent}
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ticket Metadata Form */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Ticket Metadata</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Event ID</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Enter event ID"
                      className="input input-bordered w-full"
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Ticket Type</span>
                    </label>
                    <input
                      type="text"
                      placeholder="General Admission"
                      className="input input-bordered w-full"
                      value={ticketMetadata.ticketType}
                      onChange={(e) => setTicketMetadata(prev => ({ ...prev, ticketType: e.target.value }))}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Seat Number (Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="A12"
                      className="input input-bordered w-full"
                      value={ticketMetadata.seatNumber}
                      onChange={(e) => setTicketMetadata(prev => ({ ...prev, seatNumber: e.target.value }))}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Venue Section (Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VIP Section"
                      className="input input-bordered w-full"
                      value={ticketMetadata.venueSection}
                      onChange={(e) => setTicketMetadata(prev => ({ ...prev, venueSection: e.target.value }))}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Custom Attributes</span>
                    </label>
                    {ticketMetadata.customAttributes.map((attr, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Trait Type"
                          className="input input-bordered flex-1"
                          value={attr.trait_type}
                          onChange={(e) => updateCustomAttribute(index, "trait_type", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          className="input input-bordered flex-1"
                          value={attr.value}
                          onChange={(e) => updateCustomAttribute(index, "value", e.target.value)}
                        />
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => removeCustomAttribute(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-outline btn-sm" onClick={addCustomAttribute}>
                      Add Attribute
                    </button>
                  </div>

                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-secondary"
                      onClick={handleGenerateTicketMetadata}
                    >
                      Generate Metadata
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Metadata Preview */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Generated Metadata</h2>
                  
                  {generatedMetadata && mounted && (
          <LazyReactJson
                      style={{ padding: "1rem", borderRadius: "0.75rem", maxHeight: "400px", overflow: "auto" }}
                      src={generatedMetadata}
            theme="solarized"
            enableClipboard={false}
                      displayDataTypes={false}
                      displayObjectSize={false}
                    />
                  )}

                  {generatedMetadata && (
                    <div className="card-actions justify-end mt-4">
        <button
                        className={`btn btn-primary ${loading ? "loading" : ""}`}
          disabled={loading}
                        onClick={handleUploadToIPFS}
        >
          Upload to IPFS
        </button>
                    </div>
                  )}

        {uploadedIpfsPath && (
          <div className="mt-4">
                      <p className="text-sm font-semibold">IPFS Hash:</p>
                      <a 
                        href={`https://ipfs.io/ipfs/${uploadedIpfsPath}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="link link-primary break-all"
                      >
                        {uploadedIpfsPath}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default IpfsUpload;