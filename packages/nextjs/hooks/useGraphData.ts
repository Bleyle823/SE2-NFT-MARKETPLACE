"use client";

import { useAccount } from "wagmi";

/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock implementations - replace with actual GraphQL when available

// Hook for active listings
export function useActiveListings(_first = 20, _skip = 0, _orderBy = "createdAt", _orderDirection = "desc") {
  return {
    listings: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for active auctions
export function useActiveAuctions(_first = 20, _skip = 0, _orderBy = "createdAt", _orderDirection = "desc") {
  return {
    auctions: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for user listings
export function useUserListings() {
  const { address: _address } = useAccount();
  return {
    listings: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for user purchases
export function useUserPurchases() {
  const { address: _address } = useAccount();
  return {
    purchases: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for user auctions
export function useUserAuctions() {
  const { address: _address } = useAccount();
  return {
    auctions: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for user bids
export function useUserBids() {
  const { address: _address } = useAccount();
  return {
    bids: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for collections
export function useCollections(_first = 20, _skip = 0, _orderBy = "totalVolume", _orderDirection = "desc") {
  return {
    collections: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for marketplace stats
export function useMarketplaceStats() {
  return {
    stats: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for user stats
export function useUserStats() {
  const { address: _address } = useAccount();
  return {
    stats: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for listing details
export function useListingDetails(_listingId: string) {
  return {
    listing: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for auction details
export function useAuctionDetails(_auctionId: string) {
  return {
    auction: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for offers
export function useOffers(_nftContract: string, _tokenId: string) {
  return {
    offers: [],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Utility function to format ETH values
export function formatEther(wei: string | number): string {
  const value = typeof wei === "string" ? parseFloat(wei) : wei;
  return (value / 1e18).toFixed(4);
}

// Utility function to format timestamps
export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(typeof timestamp === "string" ? parseInt(timestamp) * 1000 : timestamp * 1000);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Utility function to get time remaining
export function getTimeRemaining(endTime: string | number): { hours: number; minutes: number; seconds: number } {
  const end = typeof endTime === "string" ? parseInt(endTime) * 1000 : endTime * 1000;
  const now = Date.now();
  const diff = Math.max(0, end - now);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}
