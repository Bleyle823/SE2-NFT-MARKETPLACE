import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { parseEther, formatEther } from "viem";

// Custom hooks for contract interactions
export const useEventFactory = () => {
  const { writeContractAsync: createEventAsync } = useScaffoldWriteContract({
    contractName: "EventFactory",
  });

  const { writeContractAsync: updateEventAsync } = useScaffoldWriteContract({
    contractName: "EventFactory",
  });

  const { writeContractAsync: cancelEventAsync } = useScaffoldWriteContract({
    contractName: "EventFactory",
  });

  return {
    createEvent: createEventAsync,
    updateEvent: updateEventAsync,
    cancelEvent: cancelEventAsync,
  };
};

export const useEventManager = () => {
  const { writeContractAsync: startEventAsync } = useScaffoldWriteContract({
    contractName: "EventManager",
  });

  const { writeContractAsync: pauseEventAsync } = useScaffoldWriteContract({
    contractName: "EventManager",
  });

  const { writeContractAsync: resumeEventAsync } = useScaffoldWriteContract({
    contractName: "EventManager",
  });

  const { writeContractAsync: completeEventAsync } = useScaffoldWriteContract({
    contractName: "EventManager",
  });

  const { writeContractAsync: checkInAttendeeAsync } = useScaffoldWriteContract({
    contractName: "EventManager",
  });

  return {
    startEvent: startEventAsync,
    pauseEvent: pauseEventAsync,
    resumeEvent: resumeEventAsync,
    completeEvent: completeEventAsync,
    checkInAttendee: checkInAttendeeAsync,
  };
};

export const useTicketSales = () => {
  const { writeContractAsync: purchaseTicketAsync } = useScaffoldWriteContract({
    contractName: "TicketSales",
  });

  const { writeContractAsync: configureSaleAsync } = useScaffoldWriteContract({
    contractName: "TicketSales",
  });

  return {
    purchaseTicket: purchaseTicketAsync,
    configureSale: configureSaleAsync,
  };
};

export const useEventTicketNFT = () => {
  const { writeContractAsync: mintTicketAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });

  const { writeContractAsync: useTicketAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });

  const { writeContractAsync: setTransferabilityAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });

  const { writeContractAsync: setApprovalForAllAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });

  const { writeContractAsync: grantRoleAsync } = useScaffoldWriteContract({
    contractName: "EventTicketNFT",
  });

  return {
    mintTicket: mintTicketAsync,
    useTicket: useTicketAsync,
    setTransferability: setTransferabilityAsync,
    setApprovalForAll: setApprovalForAllAsync,
    grantRole: grantRoleAsync,
  };
};

export const useTicketMarketplace = () => {
  const { writeContractAsync: listTicketAsync } = useScaffoldWriteContract({
    contractName: "TicketMarketplace",
  });

  const { writeContractAsync: buyTicketAsync } = useScaffoldWriteContract({
    contractName: "TicketMarketplace",
  });

  const { writeContractAsync: cancelListingAsync } = useScaffoldWriteContract({
    contractName: "TicketMarketplace",
  });

  return {
    listTicket: listTicketAsync,
    buyTicket: buyTicketAsync,
    cancelListing: cancelListingAsync,
  };
};

export const useCreatorMarketplace = () => {
  const { writeContractAsync: createListingAsync } = useScaffoldWriteContract({
    contractName: "CreatorMarketplace",
  });

  const { writeContractAsync: placeOrderAsync } = useScaffoldWriteContract({
    contractName: "CreatorMarketplace",
  });

  const { writeContractAsync: deliverOrderAsync } = useScaffoldWriteContract({
    contractName: "CreatorMarketplace",
  });

  const { writeContractAsync: approveOrderAsync } = useScaffoldWriteContract({
    contractName: "CreatorMarketplace",
  });

  const { writeContractAsync: submitReviewAsync } = useScaffoldWriteContract({
    contractName: "CreatorMarketplace",
  });

  return {
    createListing: createListingAsync,
    placeOrder: placeOrderAsync,
    deliverOrder: deliverOrderAsync,
    approveOrder: approveOrderAsync,
    submitReview: submitReviewAsync,
  };
};

export const useRovifyToken = () => {
  const { writeContractAsync: approveAsync } = useScaffoldWriteContract({
    contractName: "RovifyToken",
  });

  const { writeContractAsync: transferAsync } = useScaffoldWriteContract({
    contractName: "RovifyToken",
  });

  return {
    approve: approveAsync,
    transfer: transferAsync,
  };
};

// Hook to use the contract service
export const useContractService = () => {
  const eventFactory = useEventFactory();
  const eventManager = useEventManager();
  const ticketSales = useTicketSales();
  const eventTicketNFT = useEventTicketNFT();
  const ticketMarketplace = useTicketMarketplace();
  const creatorMarketplace = useCreatorMarketplace();
  const rovifyToken = useRovifyToken();

  return {
    eventFactory,
    eventManager,
    ticketSales,
    eventTicketNFT,
    ticketMarketplace,
    creatorMarketplace,
    rovifyToken,
  };
};