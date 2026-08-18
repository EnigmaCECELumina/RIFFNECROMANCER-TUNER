import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  const [params] = useSearchParams();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    (async () => {
      try {
        // Check for Emergent Agent session_id (legacy)
        const hash = window.location.hash || "";
        const sessionMatch = hash.match(/session_id=([^&]+)/);
        
        if (sessionMatch) {
          // Legacy Emergent Agent OAuth flow
          const session_id = decodeURIComponent(sessionMatch[1]);
          const { data } = await api.post("/auth/oauth/session", { session_id });
          if (data?.access_token) {
            setAuthToken(data.access_token);
          }
          if (data?.user) {
            setUser(data.user);
          } else {
            await refresh();
          }
          toast.success("Signed in with Google");
          window.history.replaceState({}, document.title, "/dashboard");
          navigate("/dashboard", { replace: true });
          return;
        }
        
        // Direct Google OAuth flow
        const code = params.get("code");
        const state = params.get("state");
        
        if (!code) {
          toast.error("OAuth callback missing authorization code");
          navigate("/auth", { replace: true });
          return;
        }
        
        const { data } = await api.post("/auth/google/callback", { code, state });
        if (data?.access_token) {
          setAuthToken(data.access_token);
        }
        if (data?.user) {
          setUser(data.user);
        } else {
          await refresh();
        }
        toast.success("Signed in with Google");
        // Clean URL
        window.history.replaceState({}, document.title, "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        console.error(e);
        toast.error("OAuth sign-in failed");
        navigate("/auth", { replace: true });
      }
    })();
  }, [navigate, refresh, setUser, params]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="oauth-callback-loading">
      <div className="font-gothic uppercase tracking-[0.2em] text-[hsl(var(--text-3))] text-xs">Channeling Google session…</div>
    </div>
  );
}
