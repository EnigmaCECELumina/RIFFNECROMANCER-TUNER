import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { getPaymentStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);
  const triesRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getPaymentStatus(sessionId);
        if (cancelled) return;
        setInfo(data);
        if (data.status === "paid") {
          setStatus("paid");
          await refresh();
        } else if (data.status === "unpaid") {
          if (triesRef.current < 8) {
            triesRef.current += 1;
            setTimeout(poll, 2000);
          } else {
            setStatus("timeout");
          }
        } else {
          setStatus("error");
        }
      } catch {
        if (triesRef.current < 8) {
          triesRef.current += 1;
          setTimeout(poll, 2500);
        } else {
          setStatus("error");
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  return (
    <PageContainer testid="payment-success-page" maxWidth="max-w-xl">
      <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-8 text-center [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        {status === "checking" && (
          <>
            <Loader2 size={28} className="mx-auto animate-spin text-[hsl(var(--brand))]" />
            <h1 className="mt-3 font-gothic uppercase text-xl tracking-[0.12em]">Sealing your subscription</h1>
            <p className="mt-2 text-sm text-[hsl(var(--text-2))]">We are confirming with Stripe. This usually takes a few seconds.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 size={32} className="mx-auto text-[hsl(var(--brand))]" />
            <h1 className="mt-3 font-gothic uppercase text-xl tracking-[0.12em]">Welcome, Adept</h1>
            <p className="mt-2 text-sm text-[hsl(var(--text-2))]">Premium unlocked. All advanced rituals are now available.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => navigate("/drills")} className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]" data-testid="payment-success-drills-button">Go to Drills</Button>
              <Button onClick={() => navigate("/dashboard")} variant="secondary" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]" data-testid="payment-success-dashboard-button">Dashboard</Button>
            </div>
          </>
        )}
        {(status === "missing" || status === "error" || status === "timeout" || status === "expired") && (
          <>
            <h1 className="font-gothic uppercase text-xl tracking-[0.12em]">Could not confirm payment</h1>
            <p className="mt-2 text-sm text-[hsl(var(--text-2))]">{status === "expired" ? "This checkout session expired." : "Please try again or contact support."}</p>
            <div className="mt-6">
              <Button onClick={() => navigate("/pricing")} className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]" data-testid="payment-success-retry-button">Back to Pricing</Button>
            </div>
          </>
        )}
        {info && (
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">
            Status: {info.status}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
