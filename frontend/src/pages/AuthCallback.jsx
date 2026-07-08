import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    (async () => {
      try {
        // This checks BOTH query strings (?) and hash fragments (#) safely
        const params = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
        const session_id = params.get('session_id');

        if (!session_id) {
          console.error("No session_id found in URL");
          navigate("/auth", { replace: true });
          return;
        }

        const { data } = await api.post("/auth/oauth/session", { session_id });
        
        // Keep whatever token-saving / redirect logic was already here, for example:
        if (data.token) {
          localStorage.setItem('riff_token', data.token);
          setUser(data.user);
          await refresh();
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        console.error("OAuth Error:", e);
        navigate("/auth", { replace: true });
      }
    })();
  }, [navigate, refresh, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="oauth-callback-loading">
      <div className="font-gothic uppercase tracking-[0.2em] text-[hsl(var(--text-3))] text-xs">Channeling Google session…</div>
    </div>
  );
}
