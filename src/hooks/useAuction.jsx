import { useState, useEffect, useCallback } from "react";
import {
  getAuctionById,
  subscribeToBids,
  subscribeToAuction,
  placeBid,
} from "../services/firebase";
import { placeBid as placeBidOnChain } from "../services/blockchain";
import { useAuth } from "./useAuth";

export function useAuction(auctionId) {
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuction = useCallback(async () => {
    try {
      const data = await getAuctionById(auctionId);
      setAuction(data);
      setBids(data.bids || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchAuction();

    const unsubBids = subscribeToBids(auctionId, (newBid) => {
      setBids((prev) => {
        if (prev.find((b) => b.id === newBid.id)) return prev;
        return [newBid, ...prev];
      });
    });

    const unsubAuction = subscribeToAuction(auctionId, (updated) => {
      setAuction((prev) => (prev ? { ...prev, ...updated } : updated));
    });

    return () => {
      unsubBids();
      unsubAuction();
    };
  }, [auctionId, fetchAuction]);

  async function submitBid(bidAmountEth) {
    if (!user) throw new Error("Must be logged in to bid");
    setBidding(true);
    setError(null);
    try {
      const { txHash } = await placeBidOnChain(
        auction.tokenId || auction.token_id,
        bidAmountEth
      );
      const amountUSD = parseFloat(bidAmountEth) * 3500;
      await placeBid({
        auctionId,
        amount: amountUSD,
        amountWei: BigInt(Math.floor(parseFloat(bidAmountEth) * 1e18)).toString(),
        txHash,
        blockNumber: 0,
      });
      return { success: true, txHash };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setBidding(false);
    }
  }

  return { auction, bids, loading, bidding, error, submitBid, refetch: fetchAuction };
}
