import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.31 0-9.822-3.413-11.373-8.13l-6.516 5.022C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const formatError = (err) => {
    // If it's a Firebase error with a code, format the code nicely
    if (err.code && err.code.startsWith("auth/")) {
      const code = err.code.split("/")[1].replace(/-/g, " ");
      return code.charAt(0).toUpperCase() + code.slice(1);
    }
    // Fallback: clean up the message
    return err.message.replace("Firebase: ", "").replace(/\(auth\/[\w-]+\)\.?/, "").trim() || "An unexpected error occurred";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate("/");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await googleLogin();
      navigate("/");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: "calc(100vh - 80px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-card"
        style={{ width: "100%", maxWidth: "420px", padding: "40px" }}
      >
        <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "8px" }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "32px" }}>
          {isLogin ? "Sign in to securely place bids" : "Join the decentralized auction platform"}
        </p>

        {/* Google Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="btn btn-outline"
          style={{ width: "100%", marginBottom: "24px", gap: "12px", padding: "14px" }}
        >
          {googleLoading ? (
            <div className="loader" style={{ width: "20px", height: "20px" }} />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.9rem", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  id="name-input"
                  type="text"
                  className="input-field"
                  style={{ width: "100%", paddingLeft: "44px" }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="email-input"
                type="email"
                className="input-field"
                style={{ width: "100%", paddingLeft: "44px" }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: "32px" }}>
            <label className="input-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="password-input"
                type="password"
                className="input-field"
                style={{ width: "100%", paddingLeft: "44px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            id="submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <div className="loader" style={{ width: "20px", height: "20px" }} />
            ) : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600" }}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
