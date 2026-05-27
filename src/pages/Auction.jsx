import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuction, useTimer, useAuth } from "../hooks";
import { getCarById, markAsSold } from "../services/firebase";
import { Clock, ExternalLink, MapPin, ShieldCheck, Tag, Trophy, CreditCard, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Auction() {
  const { id } = useParams();
  const { user } = useAuth();
  const { auction, bids, loading, bidding, error, submitBid } = useAuction(id);
  const [car, setCar] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (auction?.carId) {
      async function fetchCar() {
        try {
          const data = await getCarById(auction.carId);
          if (isMounted) setCar(data);
        } catch (err) {
          console.error("Failed to fetch car details:", err);
        }
      }
      fetchCar();
    }
    return () => { isMounted = false; };
  }, [auction]);

  const timeLeft = useTimer(auction?.endTime);

  const handleBid = async (e) => {
    e.preventDefault();
    if (!bidAmount) return;
    const res = await submitBid(bidAmount);
    if (res.success) {
      setBidAmount(""); // Reset on success
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      // Simulate blockchain payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockTxHash = `0xpay_${Math.random().toString(16).slice(2)}`;
      await markAsSold(id, mockTxHash);
      window.location.reload(); // Refresh to show Sold state
    } catch (err) {
      alert("Payment failed: " + err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading || !car || !auction) {
    return <div className="flex-center" style={{ height: 'calc(100vh - 80px)' }}><div className="loader"></div></div>;
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '40px' }}>
        
        {/* Left Column - Image & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card" 
            style={{ padding: 0, overflow: 'hidden', height: '400px' }}
          >
            {car.imageUrl ? (
              <img src={car.imageUrl} alt={car.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No Image Available</div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{car.year} {car.make} {car.model}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '24px' }}>VIN: {car.vin}</p>
            
            <div className="glass-card">
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck color="var(--primary)" /> Vehicle Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Make</p>
                  <p style={{ fontWeight: '500' }}>{car.make}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Model</p>
                  <p style={{ fontWeight: '500' }}>{car.model}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Year</p>
                  <p style={{ fontWeight: '500' }}>{car.year}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Color</p>
                  <p style={{ fontWeight: '500' }}>{car.color}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Location</p>
                  <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    {car.location || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Bidding & Blockchain */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {timeLeft.ended ? "Final Winning Bid" : "Current Highest Bid"}
                </p>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: '1' }}>
                   ₹{auction.currentBid > 0 ? auction.currentBid.toLocaleString() : auction.startPrice?.toLocaleString() || 0}
                </div>
                {auction.currentBidWei && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>~ {parseFloat((Number(auction.currentBidWei) / 1e18).toString()).toFixed(4)} ETH</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: '600', color: auction.status === 'sold' ? '#10b981' : (timeLeft.ended ? '#ef4444' : 'inherit') }}>
                  {auction.status === 'sold' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  {auction.status === 'sold' ? "Sold" : (timeLeft.ended ? "Auction Ended" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.mins}m`)}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {auction.status === 'sold' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-center" style={{ flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <PartyPopper size={32} color="#10b981" />
                  <p style={{ fontWeight: '600', color: '#10b981' }}>Vehicle Sold to {auction.highestBidderName}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Transaction Confirmed</p>
                </motion.div>
              ) : timeLeft.ended ? (
                auction.highestBidderId ? (
                  user?.uid === auction.highestBidderId ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Trophy color="#f59e0b" size={28} />
                        <h3 style={{ fontSize: '1.3rem', margin: 0 }}>You Won!</h3>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Congratulations! You are the highest bidder. Complete the payment to secure your vehicle.</p>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', gap: '12px' }} 
                        onClick={handlePayment}
                        disabled={paying}
                      >
                        {paying ? <div className="loader" style={{ width: '20px', height: '20px' }}></div> : <><CreditCard size={18} /> Pay & Finalize</>}
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '8px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <Trophy color="var(--text-muted)" size={24} />
                      <p style={{ fontWeight: '500' }}>Auction Won by {auction.highestBidderName}</p>
                    </div>
                  )
                ) : (
                  <div className="flex-center" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    Auction ended without bids
                  </div>
                )
              ) : (
                <form onSubmit={handleBid} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Tag size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="number" 
                      step="0.001"
                      className="input-field" 
                      style={{ width: '100%', paddingLeft: '44px' }} 
                      placeholder="ETH Amount"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      disabled={timeLeft.ended || bidding}
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={timeLeft.ended || bidding || !bidAmount}
                  >
                    {bidding ? <div className="loader" style={{ width: '20px', height: '20px' }}></div> : "Place Bid"}
                  </button>
                </form>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card" 
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Live Bid History</h3>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', paddingRight: '8px' }}>
              <AnimatePresence>
                {bids.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No bids yet. Be the first!</p>
                ) : (
                  bids.map((bid, index) => (
                    <motion.div 
                      key={bid.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ 
                        padding: '16px', 
                        borderBottom: '1px solid var(--border)',
                        background: index === 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        borderRadius: index === 0 ? '8px' : '0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '500' }}>{bid.bidderName || 'Anonymous'}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: '600' }}>₹{bid.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{new Date(bid.createdAt?.toDate ? bid.createdAt.toDate() : bid.createdAt).toLocaleString()}</span>
                        {bid.txHash && (
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${bid.txHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            Verify <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
