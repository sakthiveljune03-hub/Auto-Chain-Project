import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { Car, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="nav-brand">
          <Car color="#8b5cf6" size={28} />
          Auto<span className="gradient-text">Chain</span>
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              {profile?.role === "admin" && (
                <Link to="/admin" className="nav-link" style={{ marginRight: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '600' }}>
                   Dashboard
                </Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <User size={18} />
                <span>{profile?.name || user.email}</span>
              </div>
              <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
