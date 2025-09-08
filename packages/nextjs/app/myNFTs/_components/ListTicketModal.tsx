"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface ListTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftContract: string;
  tokenId: number;
  onSuccess?: () => void;
}

export const ListTicketModal = ({ isOpen, onClose, nftContract, tokenId, onSuccess }: ListTicketModalProps) => {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // Writers for contracts
  const { writeContractAsync: writeEventTicket } = useScaffoldWriteContract({ contractName: "EventTicket" });
  const { writeContractAsync: writeMarketplace } = useScaffoldWriteContract({ contractName: "NFTMarketplace" });

  // Get deployed addresses as reliable fallback instead of env vars
  const { data: marketplaceInfo } = useDeployedContractInfo({ contractName: "NFTMarketplace" });
  const { data: eventTicketInfo } = useDeployedContractInfo({ contractName: "EventTicket" });

  const handleList = async () => {
    if (!price || parseFloat(price) <= 0) {
      notification.error("Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      const marketplaceAddress = (process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT as `0x${string}`) || (marketplaceInfo?.address as `0x${string}`);
      const nftAddress = (nftContract as `0x${string}`) || (eventTicketInfo?.address as `0x${string}`);

      if (!marketplaceAddress || !nftAddress) {
        notification.error("Missing contract addresses. Ensure contracts are deployed and addresses are configured.");
        setLoading(false);
        return;
      }

      // First approve marketplace to transfer the NFT
      const notificationId = notification.loading("Approving marketplace...");
      await writeEventTicket({
        functionName: "approve",
        args: [
          marketplaceAddress,
          BigInt(tokenId),
        ],
      });
      notification.remove(notificationId);

      // Then list the ticket on marketplace
      notification.loading("Listing ticket...");
      await writeMarketplace({
        functionName: "listTicket",
        args: [nftAddress, BigInt(tokenId), parseEther(price)],
      });
      
      notification.success("Ticket listed successfully!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error listing ticket:", error);
      notification.error("Error listing ticket");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">List Ticket for Sale</h3>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Price (ETH)</span>
          </label>
          <input
            type="number"
            step="0.001"
            placeholder="0.1"
            className="input input-bordered w-full"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn btn-primary ${loading ? "loading" : ""}`}
            onClick={handleList}
            disabled={loading || !price || parseFloat(price) <= 0}
          >
            List Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
