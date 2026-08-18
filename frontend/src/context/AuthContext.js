import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthToken, getStoredToken } from "@/lib/api";

const AuthCtx = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      // No bearer token. Don't fire /auth/me unnecessarily on public pages.
      // If we're on an auth-required path, /auth/me will be retried via refresh().
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      const PUBLIC_PATHS = ["/", "/auth"];
      if (PUBLIC_PATHS.includes(path)) {
        setLoading(false);
        return;
      }
      // Could be a cookie-based OAuth session; attempt /auth/me once.
      checkAuth();
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const loginWithEmail = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const registerWithEmail = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setAuthToken(null);
    setUser(null);
  };

  const refresh = checkAuth;

  return (
    <AuthCtx.Provider value={{ user, loading, loginWithEmail, registerWithEmail, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
