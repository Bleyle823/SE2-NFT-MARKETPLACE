"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { keccak256, toBytes, parseEther } from "viem";
import { useContractService } from "~~/services/contractService";

// Types
interface Event {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  location: string;
  startTime: number;
  endTime: number;
  ticketPrice: string;
  maxAttendees: number;
  isVirtual: boolean;
  tags: string[];
  creator: string;
  status: "created" | "active" | "paused" | "cancelled" | "completed";
  ticketsSold: number;
  availableTickets: number;
  isOnSale?: boolean;
}

interface Ticket {
  id: number;
  tokenId: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  venue: string;
  ticketType: string;
  seatNumber: string;
  price: string;
  purchaseDate: string;
  qrCode: string;
  status: "active" | "used" | "transferred" | "cancelled";
  isTransferable: boolean;
  eventImage: string;
  category: string;
  owner: string;
}

interface MarketplaceState {
  events: Event[];
  userTickets: Ticket[];
  userEvents: Event[];
  loading: boolean;
  error: string | null;
  userStats: {
    totalEvents: number;
    ticketsPurchased: number;
    ticketsSold: number;
    totalSpent: string;
    totalEarned: string;
  };
}

type MarketplaceAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_EVENTS"; payload: Event[] }
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "UPDATE_EVENT"; payload: Event }
  | { type: "SET_USER_TICKETS"; payload: Ticket[] }
  | { type: "ADD_TICKET"; payload: Ticket }
  | { type: "UPDATE_TICKET"; payload: Ticket }
  | { type: "SET_USER_EVENTS"; payload: Event[] }
  | { type: "SET_USER_STATS"; payload: any };

const initialState: MarketplaceState = {
  events: [],
  userTickets: [],
  userEvents: [],
  loading: false,
  error: null,
  userStats: {
    totalEvents: 0,
    ticketsPurchased: 0,
    ticketsSold: 0,
    totalSpent: "0",
    totalEarned: "0",
  },
};

function marketplaceReducer(state: MarketplaceState, action: MarketplaceAction): MarketplaceState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_EVENTS":
      return { ...state, events: action.payload };
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] };
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id ? action.payload : event
        ),
      };
    case "SET_USER_TICKETS":
      return { ...state, userTickets: action.payload };
    case "ADD_TICKET":
      return { ...state, userTickets: [...state.userTickets, action.payload] };
    case "UPDATE_TICKET":
      return {
        ...state,
        userTickets: state.userTickets.map(ticket =>
          ticket.id === action.payload.id ? action.payload : ticket
        ),
      };
    case "SET_USER_EVENTS":
      return { ...state, userEvents: action.payload };
    case "SET_USER_STATS":
      return { ...state, userStats: action.payload };
    default:
      return state;
  }
}

interface MarketplaceContextType {
  state: MarketplaceState;
  dispatch: React.Dispatch<MarketplaceAction>;
  contractService: ReturnType<typeof useContractService>;
  // Actions
  loadEvents: () => Promise<void>;
  loadUserTickets: () => Promise<void>;
  loadUserEvents: () => Promise<void>;
  loadUserStats: () => Promise<void>;
  createEvent: (eventData: Partial<Event>) => Promise<void>;
  purchaseTicket: (eventId: number, quantity: number) => Promise<void>;
  useTicket: (ticketId: number) => Promise<void>;
  enableTicketTransferability: (tokenId: number) => Promise<void>;
  listTicketForSale: (ticketId: number, price: string, expiresAt: number) => Promise<void>;
  buyTicketFromMarketplace: (listingId: number, price: string) => Promise<void>;
  configureEventSale: (params: {
    eventId: number;
    priceWei: string;
    maxSupply: number;
    maxPerWallet: number;
    saleStart: number;
    saleEnd: number;
    whitelistOnly: boolean;
  }) => Promise<void>;
  grantMinterRoleToSales: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return context;
};

interface MarketplaceProviderProps {
  children: React.ReactNode;
}

export const MarketplaceProvider: React.FC<MarketplaceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: eventFactoryInfo } = useDeployedContractInfo("EventFactory");
  const { data: ticketSalesInfo } = useDeployedContractInfo("TicketSales");
  const { data: ticketMarketplaceInfo } = useDeployedContractInfo("TicketMarketplace");
  const { data: rovifyTokenInfo } = useDeployedContractInfo("RovifyToken");
  const { data: eventTicketNFTInfo } = useDeployedContractInfo("EventTicketNFT");
  const contractService = useContractService();

  // Load all events
  const loadEvents = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      if (!publicClient || !eventFactoryInfo?.address || !eventFactoryInfo?.abi) {
        dispatch({ type: "SET_EVENTS", payload: [] });
        return;
      }

      const address = eventFactoryInfo.address as `0x${string}`;
      const abi = (eventFactoryInfo as any).abi as any;

      const currentId = (await (publicClient as any).readContract({
        address,
        abi,
        functionName: "getCurrentEventId",
        args: [],
      })) as bigint;

      const fetched: Event[] = [];
      for (let i = 1n; i < currentId; i++) {
        const exists = (await publicClient.readContract({
          address,
          abi,
          functionName: "eventExists",
          args: [i],
        })) as boolean;
        if (!exists) continue;

        const ev = (await publicClient.readContract({
          address,
          abi,
          functionName: "getEvent",
          args: [i],
        })) as any;

        // Read sale info and metrics (if TicketSales is deployed)
        let isOnSale = false;
        let priceStr: string | undefined = undefined;
        let maxSupplyNum: number | undefined = undefined;
        let soldNum: number | undefined = undefined;
        try {
          if (ticketSalesInfo?.address && ticketSalesInfo?.abi) {
            const sale = (await publicClient.readContract({
              address: ticketSalesInfo.address as `0x${string}`,
              abi: ticketSalesInfo.abi as any,
              functionName: "getSaleConfig",
              args: [i],
            })) as any;
            const now = Math.floor(Date.now() / 1000);
            const starts = Number(sale.saleStart ?? sale[2]);
            const ends = Number(sale.saleEnd ?? sale[3]);
            const active = Boolean(sale.active ?? sale[7]);
            // Active only if flagged and within window
            isOnSale = active && now >= starts && now <= ends;
            const price = sale.price ?? sale[0];
            priceStr = (typeof price === "bigint" ? price.toString() : String(price));
            maxSupplyNum = Number(sale.maxSupply ?? sale[1]);

            try {
              const metrics = (await publicClient.readContract({
                address: ticketSalesInfo.address as `0x${string}`,
                abi: ticketSalesInfo.abi as any,
                functionName: "getSaleMetrics",
                args: [i],
              })) as any;
              soldNum = Number(metrics.totalSold ?? metrics[0]);
            } catch {}
          }
        } catch {}

        // ev corresponds to EventParams
        fetched.push({
          id: Number(i),
          name: ev.name as string,
          description: ev.description as string,
          imageUrl: ev.imageUrl as string,
          location: ev.location as string,
          startTime: Number(ev.startTime) * 1000, // to ms for UI
          endTime: Number(ev.endTime) * 1000,
          ticketPrice: (priceStr ?? (typeof ev.ticketPrice === "bigint" ? ev.ticketPrice.toString() : String(ev.ticketPrice))) as string,
          maxAttendees: (maxSupplyNum ?? Number(ev.maxAttendees)),
          isVirtual: Boolean(ev.isVirtual),
          tags: (ev.tags as string[]) || [],
          creator: "",
          status: "active",
          ticketsSold: soldNum ?? 0,
          availableTickets: (maxSupplyNum !== undefined && soldNum !== undefined)
            ? Math.max(0, maxSupplyNum - soldNum)
            : Number(ev.maxAttendees),
          isOnSale,
        });
      }

      dispatch({ type: "SET_EVENTS", payload: fetched });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load events" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [publicClient, eventFactoryInfo?.address, eventFactoryInfo?.abi, ticketSalesInfo?.address, ticketSalesInfo?.abi]);

  // Load user's tickets
  const loadUserTickets = useCallback(async () => {
    if (!address) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      if (!publicClient || !eventTicketNFTInfo?.address || !eventTicketNFTInfo?.abi) {
        dispatch({ type: "SET_USER_TICKETS", payload: [] });
        return;
      }

      const nftAddr = eventTicketNFTInfo.address as `0x${string}`;
      const nftAbi = eventTicketNFTInfo.abi as any;

      const tokenIds = (await publicClient.readContract({
        address: nftAddr,
        abi: nftAbi,
        functionName: "getOwnerTickets",
        args: [address as `0x${string}`],
      })) as bigint[];

      const tickets: Ticket[] = [];
      for (const tokenId of tokenIds) {
        try {
          const meta = (await publicClient.readContract({
            address: nftAddr,
            abi: nftAbi,
            functionName: "getTicketMetadata",
            args: [tokenId],
          })) as any;

          const eventIdNum = Number(meta.eventId ?? meta[0]);
          const purchaseTime = Number(meta.purchaseTime ?? meta[2]);
          const isUsed = Boolean(meta.isUsed ?? meta[6]);

          const eventRef = state.events.find(e => e.id === eventIdNum);
          tickets.push({
            id: Number(tokenId),
            tokenId: Number(tokenId),
            eventId: eventIdNum,
            eventTitle: eventRef?.name || `Event #${eventIdNum}`,
            eventDate: eventRef ? new Date(eventRef.startTime).toLocaleDateString() : "",
            eventTime: eventRef ? `${new Date(eventRef.startTime).toLocaleTimeString()} - ${new Date(eventRef.endTime).toLocaleTimeString()}` : "",
            eventLocation: eventRef?.location || "",
            venue: eventRef?.location || "",
            ticketType: String(meta.ticketType ?? meta[4] ?? "General"),
            seatNumber: String(meta.seatNumber ?? meta[3] ?? ""),
            price: eventRef?.ticketPrice || "0",
            purchaseDate: purchaseTime ? new Date(purchaseTime * 1000).toLocaleDateString() : "",
            qrCode: `ticket-${String(tokenId)}`,
            status: isUsed ? "used" : "active",
            isTransferable: Boolean(meta.isTransferable ?? meta[5] ?? true),
            eventImage: eventRef?.imageUrl || "/api/placeholder/300/200",
            category: eventRef?.tags?.[0] || "",
            owner: address,
          });
        } catch {}
      }

      dispatch({ type: "SET_USER_TICKETS", payload: tickets });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load tickets" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [address, publicClient, eventTicketNFTInfo?.address, eventTicketNFTInfo?.abi, state.events]);

  // Load user's created events
  const loadUserEvents = useCallback(async () => {
    if (!address) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      // Mock data for now
      const mockUserEvents: Event[] = [
        {
          id: 1,
          name: "DeFi Workshop Series",
          description: "Learn about decentralized finance",
          imageUrl: "/api/placeholder/400/300",
          location: "London, UK",
          startTime: Date.now() + 14 * 24 * 60 * 60 * 1000,
          endTime: Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000,
          ticketPrice: "120",
          maxAttendees: 100,
          isVirtual: false,
          tags: ["DeFi", "Workshop", "Education"],
          creator: address,
          status: "active",
          ticketsSold: 67,
          availableTickets: 33,
        },
      ];

      dispatch({ type: "SET_USER_EVENTS", payload: mockUserEvents });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load user events" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [address]);

  // Load user statistics
  const loadUserStats = useCallback(async () => {
    if (!address) return;

    try {
      // Mock data for now
      const mockStats = {
        totalEvents: 5,
        ticketsPurchased: 12,
        ticketsSold: 3,
        totalSpent: "1,500",
        totalEarned: "800",
      };

      dispatch({ type: "SET_USER_STATS", payload: mockStats });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load user stats" });
    }
  }, [address]);

  // Create a new event
  const createEvent = useCallback(async (eventData: Partial<Event>) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      // Convert event data to contract format
      const eventParams = {
        name: eventData.name || "",
        description: eventData.description || "",
        imageUrl: eventData.imageUrl || "",
        location: eventData.location || "",
        startTime: BigInt(eventData.startTime || 0),
        endTime: BigInt(eventData.endTime || 0),
        ticketPrice: BigInt(eventData.ticketPrice || "0"),
        maxAttendees: BigInt(eventData.maxAttendees || 0),
        isVirtual: eventData.isVirtual || false,
        tags: eventData.tags || [],
      };

      // Call contract function
      await contractService.eventFactory.createEvent({
        functionName: "createEvent",
        args: [eventParams],
      });

      // Attempt to configure sale automatically for this event
      try {
        if (publicClient && ticketSalesInfo?.address && ticketSalesInfo?.abi) {
          const efAddr = eventFactoryInfo?.address as `0x${string}` | undefined;
          if (efAddr) {
            const currentId = (await (publicClient as any).readContract({
              address: efAddr,
              abi: (eventFactoryInfo as any).abi,
              functionName: "getCurrentEventId",
              args: [],
            })) as bigint;
            const newEventId = currentId - 1n;

            const priceWei = eventData.ticketPrice
              ? parseEther(String(eventData.ticketPrice))
              : 0n;

            // Build config (eventId, SaleConfiguration)
            const nowSec = BigInt(Math.floor(Date.now() / 1000));
            const defaultEnd = nowSec + 30n * 24n * 60n * 60n; // +30 days
            await contractService.ticketSales.configureSale({
              functionName: "configureSale",
              args: [
                newEventId,
                {
                  price: priceWei,
                  maxSupply: BigInt(eventData.maxAttendees || 0),
                  saleStart: nowSec,
                  saleEnd: defaultEnd,
                  maxPerWallet: 5n,
                  rvfyDiscountBps: 0,
                  whitelistOnly: false,
                  active: true,
                },
              ],
            } as any);
          }
        }
      } catch {}

      // Reload events after configuration
      await loadEvents();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to create event" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.eventFactory, contractService.ticketSales, loadEvents, publicClient, ticketSalesInfo?.address, ticketSalesInfo?.abi, eventFactoryInfo?.address, eventFactoryInfo?.abi]);

  // Purchase a ticket
  const purchaseTicket = useCallback(async (eventId: number, quantity: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      const event = state.events.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");
      if (event.isOnSale === false) throw new Error("Sale not active");

      // ticketPrice loaded from TicketSales.getSaleInfo is already in wei
      const pricePerTicket = BigInt(event.ticketPrice);
      const totalPrice = pricePerTicket * BigInt(quantity);

      await contractService.ticketSales.purchaseTicket({
        functionName: "purchaseTickets",
        args: [BigInt(eventId), BigInt(quantity)],
        value: totalPrice,
      });
      
      // Reload events (supply) and user tickets
      await Promise.all([loadEvents(), loadUserTickets()]);
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to purchase ticket" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.events, contractService.ticketSales, loadUserTickets]);

  // Use a ticket
  const useTicket = useCallback(async (ticketId: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      await contractService.eventTicketNFT.useTicket({
        functionName: "useTicket",
        args: [BigInt(ticketId)],
      });
      
      // Update ticket status
      dispatch({
        type: "UPDATE_TICKET",
        payload: { ...state.userTickets.find(t => t.id === ticketId)!, status: "used" }
      });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to use ticket" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.eventTicketNFT, state.userTickets]);

  // Enable ticket transferability (so it can be listed/transferred)
  const enableTicketTransferability = useCallback(async (tokenId: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await contractService.eventTicketNFT.setTransferability({
        functionName: "setTicketTransferability",
        args: [BigInt(tokenId), true],
      } as any);
      await loadUserTickets();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to enable transferability" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.eventTicketNFT, loadUserTickets]);

  // List ticket for sale
  const listTicketForSale = useCallback(async (ticketId: number, price: string, expiresAt: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      // Ensure marketplace can transfer: approve operator if needed
      if (eventTicketNFTInfo?.address && ticketMarketplaceInfo?.address) {
        // Set approval for marketplace contract as operator
        await contractService.eventTicketNFT.setApprovalForAll({
          functionName: "setApprovalForAll",
          args: [ticketMarketplaceInfo.address as `0x${string}`, true],
        } as any);

        // Ensure RVFY allowance to cover transfer fee collected by EventTicketNFT during transfer
        if (rovifyTokenInfo?.address && rovifyTokenInfo?.abi && address && publicClient) {
          try {
            // Read transferFee from EventTicketNFT.config
            const cfg = (await publicClient.readContract({
              address: eventTicketNFTInfo.address as `0x${string}`,
              abi: eventTicketNFTInfo.abi as any,
              functionName: "config",
            })) as any;
            const transferFee = BigInt(cfg.transferFee ?? cfg[0] ?? 0n);

            if (transferFee > 0n) {
              // Check current allowance
              const current = (await publicClient.readContract({
                address: rovifyTokenInfo.address as `0x${string}`,
                abi: rovifyTokenInfo.abi as any,
                functionName: "allowance",
                args: [address as `0x${string}`, eventTicketNFTInfo.address as `0x${string}`],
              })) as bigint;

              if (current < transferFee) {
                await contractService.rovifyToken.approve({
                  functionName: "approve",
                  args: [eventTicketNFTInfo.address as `0x${string}`, transferFee],
                });
              }
            }
          } catch {}
        }
      }

      // Map expiresAt (absolute) to duration seconds
      const nowSec = Math.floor(Date.now() / 1000);
      const duration = Math.max(3600, expiresAt - nowSec); // at least 1h per contract min

      await contractService.ticketMarketplace.listTicket({
        functionName: "listTicket",
        args: [BigInt(ticketId), BigInt(price), BigInt(duration), true],
      });
      await loadUserTickets();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to list ticket" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.ticketMarketplace, contractService.eventTicketNFT, eventTicketNFTInfo?.address, ticketMarketplaceInfo?.address, loadUserTickets]);

  // Buy ticket from marketplace
  const buyTicketFromMarketplace = useCallback(async (tokenId: number, price: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      await contractService.ticketMarketplace.buyTicket({
        functionName: "buyTicket",
        args: [BigInt(tokenId)],
        value: BigInt(price),
      });
      
      // Reload user tickets
      await loadUserTickets();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to buy ticket" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.ticketMarketplace, loadUserTickets]);

  // Configure Ticket Sales
  const configureEventSale = useCallback(async (params: {
    eventId: number;
    priceWei: string;
    maxSupply: number;
    maxPerWallet: number;
    saleStart: number;
    saleEnd: number;
    whitelistOnly: boolean;
  }) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      // Enforce valid sale window: start >= now+30s, end > start
      const nowSecNum = Math.floor(Date.now() / 1000);
      const desiredStart = params.saleStart && params.saleStart > 0 ? params.saleStart : nowSecNum + 30;
      const adjustedStartNum = Math.max(desiredStart, nowSecNum + 30);
      let adjustedEndNum = params.saleEnd && params.saleEnd > 0 ? params.saleEnd : adjustedStartNum + 30 * 24 * 60 * 60;
      if (adjustedEndNum <= adjustedStartNum) {
        adjustedEndNum = adjustedStartNum + 60 * 60; // +1h minimum
      }
      const start = BigInt(adjustedStartNum);
      const end = BigInt(adjustedEndNum);
      await contractService.ticketSales.configureSale({
        functionName: "configureSale",
        args: [
          BigInt(params.eventId),
          {
            price: BigInt(params.priceWei),
            maxSupply: BigInt(params.maxSupply),
            saleStart: start,
            saleEnd: end,
            maxPerWallet: BigInt(params.maxPerWallet),
            rvfyDiscountBps: 0,
            whitelistOnly: params.whitelistOnly,
            active: true,
          },
        ],
      } as any);
      await loadEvents();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to configure sale" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [contractService.ticketSales, loadEvents]);

  // Grant MINTER_ROLE on EventTicketNFT to TicketSales (so it can mint on purchase)
  const grantMinterRoleToSales = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      if (!ticketSalesInfo?.address) throw new Error("TicketSales not deployed");
      await contractService.eventTicketNFT.grantRole({
        functionName: "grantRole",
        args: [keccak256(toBytes("MINTER_ROLE")) as any, ticketSalesInfo.address as `0x${string}`],
      } as any);
    } catch (e) {
      dispatch({ type: "SET_ERROR", payload: "Grant role failed - use Debug to grant MINTER_ROLE to TicketSales" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [ticketSalesInfo?.address, contractService.eventTicketNFT]);

  // Load data when address changes
  useEffect(() => {
    if (address) {
      loadEvents();
      loadUserTickets();
      loadUserEvents();
      loadUserStats();
    }
  }, [address, loadEvents, loadUserTickets, loadUserEvents, loadUserStats]);

  const value: MarketplaceContextType = {
    state,
    dispatch,
    contractService,
    loadEvents,
    loadUserTickets,
    loadUserEvents,
    loadUserStats,
    createEvent,
    purchaseTicket,
    useTicket,
    enableTicketTransferability,
    listTicketForSale,
    buyTicketFromMarketplace,
    configureEventSale,
    grantMinterRoleToSales,
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
};
