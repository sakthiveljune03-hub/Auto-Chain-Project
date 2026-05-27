import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Auction from "./pages/Auction";
import Admin from "./pages/Admin";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center" style={{height: '100vh'}}><div className="loader"></div></div>;
  if (!user) return <Navigate to="/auth" />;
  return children;
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex-center" style={{height: '100vh'}}><div className="loader"></div></div>;
  if (!user || profile?.role !== "admin") return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } />
          <Route 
            path="/auction/:id" 
            element={
              <ProtectedRoute>
                <Auction />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
