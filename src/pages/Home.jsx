import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuctions, getCarById } from "../services/firebase";
import { useTimer } from "../hooks";
import { Clock, MapPin, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

function AuctionCard({ auction }) {
  const [car, setCar] = useState(null);
  const timeLeft = useTimer(auction.endTime);

  useEffect(() => {
    let isMounted = true;
    async function fetchCar() {
      try {
        const data = await getCarById(auction.carId);
        if (isMounted) setCar(data);
      } catch (err) {
        console.error("Failed to fetch car for auction:", auction.id, err);
      }
    }
    fetchCar();
    return () => { isMounted = false; };
  }, [auction.carId, auction.id]);

  if (!car) return <div className="glass-card"><div className="loader"></div></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card" 
      style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
    >
      <div style={{ height: '200px', width: '100%', background: '#2a2a35' }}>
        {car.imageUrl ? (
          <img src={car.imageUrl} alt={car.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No Image</div>
        )}
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className={`badge ${auction.status === 'live' ? 'badge-live' : 'badge-ended'}`}>
            {auction.status === 'live' ? 'Live Auction' : 'Ended'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Clock size={14} />
            {timeLeft.ended ? "Ended" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.mins}m`}
          </div>
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{car.year} {car.make} {car.model}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          <MapPin size={12} />
          {car.location || "Location N/A"}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>VIN: {car.vin}</p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Bid</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              ₹{auction.currentBid > 0 ? auction.currentBid.toLocaleString() : auction.startPrice?.toLocaleString() || 0}
            </p>
          </div>
          <Link to={`/auction/${auction.id}`} className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getAuctions();
        if (isMounted) {
          setAuctions(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError("Failed to load auctions. Please check your connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="container" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ fontSize: '3.5rem', marginBottom: '16px' }}
        >
          Discover Premium <br /><span className="gradient-text">Web3 Car Auctions</span>
        </motion.h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Bid on high-end vehicles using secure smart contracts. 
          Automated ownership transfer. 100% transparent history.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrendingUp color="var(--primary)" />
          Trending Auctions
        </h2>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '300px' }}><div className="loader"></div></div>
      ) : error ? (
        <div className="glass-card flex-center" style={{ height: '240px', color: '#ef4444', flexDirection: 'column', gap: '20px' }}>
          <p>{error}</p>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : auctions.length === 0 ? (
        <div className="glass-card flex-center" style={{ height: '240px', color: 'var(--text-muted)', flexDirection: 'column', gap: '20px' }}>
          <p>No active auctions detected.</p>
          <button 
            className="btn btn-primary"
            onClick={async () => {
              try {
                const { seedSampleData } = await import("../services/firebase");
                await seedSampleData();
                window.location.reload();
              } catch (err) {
                alert("Seeding failed: " + err.message);
              }
            }}
          >
            Seed Sample Data
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {auctions.map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
