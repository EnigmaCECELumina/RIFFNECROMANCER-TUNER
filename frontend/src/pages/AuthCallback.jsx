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
        const hash = window.location.hash || "";
        const m = hash.match(/session_id=([^&]+)/);
        if (!m) {
          navigate("/auth", { replace: true });
          return;
        }
        const session_id = decodeURIComponent(m[1]);
        const { data } = await api.post("/auth/oauth/session", { session_id });
        if (data?.user) {
          setUser(data.user);
        } else {
          await refresh();
        }
        toast.success("Signed in with Google");
        // Clean hash and route
        window.history.replaceState({}, document.title, "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        console.error(e);
        toast.error("OAuth sign-in failed");
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
