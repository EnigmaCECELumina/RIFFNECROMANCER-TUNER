import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="auth-loading">
        <div className="font-gothic uppercase tracking-[0.2em] text-[hsl(var(--text-3))] text-xs">Summoning…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return children;
};

export default ProtectedRoute;
