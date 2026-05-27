import React, { useEffect, useState } from "react";
import { 
  getAdminStats, 
  getAuctions, 
  seedSampleData, 
  createCar, 
  createAuction, 
  uploadCarImage,
  updateCar,
  endAuction,
  deleteAuction,
  restartAuction,
  finalizeTransfer
} from "../services/firebase";
import { useAuth } from "../hooks";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Gavel, 
  Car, 
  RefreshCw, 
  AlertCircle, 
  Plus, 
  X, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock,
  ExternalLink
} from "lucide-react";

export default function Admin() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [restartModal, setRestartModal] = useState(null); // { id, carLabel }
  const [restartHours, setRestartHours] = useState(48);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formLoading, setFormLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null); // { txHash, auctionId }
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    vin: "",
    location: "Chennai, TN",
    description: "",
    startPrice: "",
    endTime: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([getAdminStats(), getAuctions()]);
      setStats(s);
      setAuctions(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSampleData();
      await fetchData();
    } catch (err) {
      alert("Seeding failed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // 1. Create the car listing
      const carData = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        color: formData.color,
        vin: formData.vin,
        location: formData.location,
        description: formData.description,
        status: "live"
      };
      const { id: carId } = await createCar(carData);

      // 2. Upload image if exists
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadCarImage(imageFile, carId);
        await updateCar(carId, { imageUrl });
      }

      // 3. Create the auction
      await createAuction({
        carId,
        startPrice: parseFloat(formData.startPrice),
        endTime: formData.endTime,
        tokenId: `SIM_${Math.floor(Math.random() * 1000000)}`, // Simulating Token ID
      });

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert("Failed to create auction: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEndAuction = async (id) => {
    if (!confirm("Are you sure you want to end this auction manually?")) return;
    setActionLoading(true);
    try {
      await endAuction(id);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAuction = async (id) => {
    if (!confirm("Confirm permanent deletion of this auction and all related bids?")) return;
    setActionLoading(true);
    try {
      await deleteAuction(id);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartAuction = async () => {
    if (!restartModal) return;
    setActionLoading(true);
    try {
      await restartAuction(restartModal.id, parseInt(restartHours));
      setRestartModal(null);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeTransfer = async (id) => {
    setIsFinalizing(true);
    setActionLoading(true);
    try {
      const result = await finalizeTransfer(id);
      setTransferSuccess({ txHash: result.txHash, auctionId: id });
      await fetchData();
    } catch (err) {
      alert("Transfer Failed: " + err.message);
    } finally {
      setActionLoading(false);
      setIsFinalizing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      make: "", model: "", year: 2024, color: "", vin: "", 
      location: "Chennai, TN", description: "", startPrice: "", endTime: ""
    });
    setImageFile(null);
    setImagePreview(null);
    setStep(1);
  };

  if (profile?.role !== "admin") {
    return (
      <div className="container flex-center" style={{ height: "80vh", flexDirection: "column", gap: "20px" }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem" }}>Admin Dashboard</h1>
          <p style={{ color: "var(--text-muted)" }}>Manage system auctions and view analytics</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-outline" 
            onClick={handleSeed} 
            disabled={seeding}
            style={{ gap: "10px" }}
          >
            <RefreshCw size={18} className={seeding ? "spin" : ""} />
            {seeding ? "Seeding..." : "Refresh Seed Data"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
            style={{ gap: "8px" }}
          >
            <Plus size={18} />
            Create Auction
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users color="var(--primary)" />} />
        <StatCard title="Live Auctions" value={stats?.totalAuctions || 0} icon={<Car color="#10b981" />} />
        <StatCard title="Total Bids" value={stats?.totalBids || 0} icon={<Gavel color="#f59e0b" />} />
      </div>

      {/* Auction Management Table */}
      <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.2rem" }}>Recent Auctions</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Showing {auctions.length} total</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Car / ID</th>
                <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Current Price</th>
                <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Status</th>
                <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>End Date</th>
                <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center" }}><div className="loader"></div></td></tr>
              ) : auctions.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>No auctions found.</td></tr>
              ) : (
                auctions.map(a => (
                  <tr key={a.id} className="table-row" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: "600" }}>{a.carId?.slice(0, 12)}...</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Token: {a.tokenId || 'N/A'}</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: "600", color: "var(--primary)" }}>₹{(a.currentBid || a.startPrice).toLocaleString()}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{a.totalBids || 0} bids</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`badge ${a.status === 'live' ? 'badge-live' : 'badge-ended'}`}>{a.status}</span>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.85rem" }}>
                      {new Date(a.endTime?.toDate ? a.endTime.toDate() : a.endTime).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        {a.status === 'live' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "#f59e0b", color: "#f59e0b" }}
                            onClick={() => handleEndAuction(a.id)}
                            disabled={actionLoading}
                          >
                            End
                          </button>
                        )}
                        {a.status === 'ended' && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            {a.highestBidderId && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "6px 12px", fontSize: "0.75rem", background: "var(--primary)" }}
                                onClick={() => handleFinalizeTransfer(a.id)}
                                disabled={actionLoading}
                              >
                                Finalize
                              </button>
                            )}
                            <button
                              className="btn btn-outline"
                              style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "#10b981", color: "#10b981" }}
                              onClick={() => { setRestartHours(48); setRestartModal({ id: a.id, carLabel: a.carId?.slice(0, 10) }); }}
                              disabled={actionLoading}
                              title="Restart this auction"
                            >
                              Restart
                            </button>
                          </div>
                        )}
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "#ef4444", color: "#ef4444" }}
                          onClick={() => handleDeleteAuction(a.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE AUCTION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="glass-card" 
              style={{ width: "100%", maxWidth: "600px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ position: "absolute", right: "20px", top: "20px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={24} />
              </button>

              <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Create New Auction</h2>
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ flex: 1, height: "4px", background: step >= 1 ? "var(--primary)" : "var(--border)", borderRadius: "2px" }} />
                  <div style={{ flex: 1, height: "4px", background: step >= 2 ? "var(--primary)" : "var(--border)", borderRadius: "2px" }} />
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {step === 1 ? "Step 1: Vehicle Information" : "Step 2: Auction Settings"}
                </p>
              </div>

              <form onSubmit={handleCreateAuction}>
                {step === 1 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="input-group">
                        <label className="input-label">Make</label>
                        <input className="input-field" placeholder="e.g. BMW" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Model</label>
                        <input className="input-field" placeholder="e.g. M4" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="input-group">
                        <label className="input-label">Year</label>
                        <input type="number" className="input-field" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Color</label>
                        <input className="input-field" placeholder="e.g. Black" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} required />
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">VIN Number</label>
                      <input className="input-field" placeholder="17-digit VIN" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} required />
                    </div>
                    
                    <div className="input-group">
                      <label className="input-label">Vehicle Image</label>
                      <div 
                        onClick={() => document.getElementById('imageInput').click()}
                        style={{ height: '140px', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                      >
                        {imagePreview ? (
                          <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                        ) : (
                          <>
                            <Upload size={24} color="var(--primary)" />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Click to upload car photo</p>
                          </>
                        )}
                        <input type="file" id="imageInput" hidden onChange={handleImageChange} accept="image/*" />
                      </div>
                    </div>

                    <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStep(2)}>Next Step</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="input-group">
                      <label className="input-label">Starting Price (₹)</label>
                      <input type="number" className="input-field" placeholder="85,00,000" value={formData.startPrice} onChange={e => setFormData({...formData, startPrice: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Auction End Date & Time</label>
                      <input type="datetime-local" className="input-field" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Location</label>
                      <input className="input-field" placeholder="e.g. Chennai, TN" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Description</label>
                      <textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                      <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={formLoading}>
                        {formLoading ? <div className="loader" style={{ width: '20px', height: '20px' }}></div> : "Launch Auction"}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESTART AUCTION MODAL */}
      {restartModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "420px" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🔄 Restart Auction</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
              Car ID: <strong>{restartModal.carLabel}…</strong><br />
              This will reset bids to 0 and set the auction live again.
            </p>
            <div className="input-group" style={{ marginBottom: "24px" }}>
              <label className="input-label">New Duration</label>
              <select
                className="input-field"
                value={restartHours}
                onChange={e => setRestartHours(e.target.value)}
              >
                <option value={24}>24 hours (1 day)</option>
                <option value={48}>48 hours (2 days)</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={120}>120 hours (5 days)</option>
                <option value={168}>168 hours (7 days)</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setRestartModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, background: "linear-gradient(135deg,#10b981,#059669)" }}
                onClick={handleRestartAuction}
                disabled={actionLoading}
              >
                {actionLoading ? <div className="loader" style={{ width: '18px', height: '18px' }} /> : "🚀 Go Live!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING OVERLAY */}
      <AnimatePresence>
        {isFinalizing && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center" }}
            >
              <div className="loader" style={{ width: "60px", height: "60px", borderTopColor: "var(--primary)", margin: "0 auto 24px" }}></div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Finalizing Transfer...</h2>
              <p style={{ color: "var(--text-muted)" }}>Interacting with blockchain and moving NFT ownership.</p>
              <p style={{ color: "var(--primary)", fontSize: "0.8rem", marginTop: "12px", letterSpacing: "1px" }}>PLEASE DO NOT REFRESH</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSFER SUCCESS VISUAL */}
      <AnimatePresence>
        {transferSuccess && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card" 
              style={{ width: "100%", maxWidth: "450px", textAlign: "center", padding: "40px" }}
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1.2 }}
                transition={{ type: "spring", damping: 10, delay: 0.2 }}
                style={{ width: "80px", height: "80px", background: "rgba(16,185,129,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}
              >
                <CheckCircle2 size={48} color="#10b981" />
              </motion.div>

              <h2 style={{ fontSize: "2rem", marginBottom: "12px" }}>Transfer Complete!</h2>
              <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>
                Ownership has been officially transferred to the winner. The Car NFT moved on the blockchain.
              </p>

              <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "32px", textAlign: "left" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Transaction Hash</div>
                <div style={{ fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "var(--primary)" }}>
                  {transferSuccess.txHash}
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: "100%" }}
                onClick={() => setTransferSuccess(null)}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card" 
      style={{ display: "flex", alignItems: "center", gap: "20px" }}
    >
      <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
        {icon}
      </div>
      <div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{title}</p>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</p>
      </div>
    </motion.div>
  );
}
