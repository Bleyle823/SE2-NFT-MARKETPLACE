"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";

interface CollectionData {
  address: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  maxSupply: bigint;
  currentSupply: bigint;
  mintPrice: bigint;
  mintingActive: boolean;
}

export function useCollectionData(collectionAddress: string): {
  data: CollectionData | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read collection info from the NFTCollection contract
  const {
    data: collectionInfo,
    isLoading,
    error: contractError,
  } = useReadContract({
    address: collectionAddress as `0x${string}`,
    abi: [
      {
        inputs: [],
        name: "getCollectionInfo",
        outputs: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "symbol", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "string", name: "image", type: "string" },
          { internalType: "uint256", name: "_maxSupply", type: "uint256" },
          { internalType: "uint256", name: "_currentSupply", type: "uint256" },
          { internalType: "uint256", name: "_mintPrice", type: "uint256" },
          { internalType: "bool", name: "_mintingActive", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getCollectionInfo",
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      setError(null);
    } else if (contractError) {
      setLoading(false);
      setError(contractError.message);
      // Set fallback data
      setData({
        address: collectionAddress,
        name: `Collection ${collectionAddress.slice(0, 6)}`,
        symbol: "COL",
        description: "Collection details unavailable",
        image: "",
        maxSupply: BigInt(0),
        currentSupply: BigInt(0),
        mintPrice: BigInt(0),
        mintingActive: false,
      });
    } else if (collectionInfo) {
      setLoading(false);
      setError(null);
      const [name, symbol, description, image, maxSupply, currentSupply, mintPrice, mintingActive] = collectionInfo as [
        string,
        string,
        string,
        string,
        bigint,
        bigint,
        bigint,
        boolean,
      ];

      setData({
        address: collectionAddress,
        name,
        symbol,
        description,
        image,
        maxSupply,
        currentSupply,
        mintPrice,
        mintingActive,
      });
    }
  }, [collectionInfo, isLoading, contractError, collectionAddress]);

  return { data, loading, error };
}

export function useCollectionsData(collectionAddresses: readonly string[]): {
  data: CollectionData[];
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collectionAddresses.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadCollections = async () => {
      try {
        const collectionPromises = [...collectionAddresses].map(async address => {
          try {
            // This would be a proper contract call in a real implementation
            // For now, we'll return mock data with the actual address
            return {
              address,
              name: `Collection ${address.slice(0, 6)}`,
              symbol: "COL",
              description: "A sample NFT collection",
              image: "",
              maxSupply: BigInt(1000),
              currentSupply: BigInt(0),
              mintPrice: BigInt(1000000000000000000), // 1 ETH in wei
              mintingActive: true,
            };
          } catch (err) {
            console.error(`Error loading collection ${address}:`, err);
            return {
              address,
              name: `Collection ${address.slice(0, 6)}`,
              symbol: "COL",
              description: "Collection details unavailable",
              image: "",
              maxSupply: BigInt(0),
              currentSupply: BigInt(0),
              mintPrice: BigInt(0),
              mintingActive: false,
            };
          }
        });

        const collections = await Promise.all(collectionPromises);
        setData(collections);
      } catch (err) {
        setError("Failed to load collections");
        console.error("Error loading collections:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, [collectionAddresses]);

  return { data, loading, error };
}
