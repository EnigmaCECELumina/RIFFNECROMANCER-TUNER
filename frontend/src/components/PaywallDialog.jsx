import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { startCheckout } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const PaywallDialog = ({ open, onOpenChange, lessonTitle }) => {
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const handleCheckout = async (packageId) => {
    try {
      setLoading(packageId);
      const url = await startCheckout(packageId);
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not start checkout");
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[hsl(var(--popover))]/95 backdrop-blur-xl border border-[hsl(var(--border))] sm:max-w-md"
        data-testid="paywall-dialog"
      >
        <DialogHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 text-[hsl(var(--brand))]">
            <Lock size={20} />
          </div>
          <DialogTitle className="text-center font-gothic uppercase tracking-[0.12em]">Premium Ritual</DialogTitle>
          <DialogDescription className="text-center text-[hsl(var(--text-2))]">
            {lessonTitle ? <>Unlock <span className="text-[hsl(var(--foreground))] font-medium">{lessonTitle}</span> and the full ritual library.</> : "Unlock advanced drills, vocal suite, and Tone Lab presets."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={!!loading}
            data-testid="paywall-monthly-button"
            className="group rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--brand))]/40 px-4 py-5 text-left transition-colors"
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Monthly</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">$7</span>
              <span className="text-xs text-[hsl(var(--text-3))]">/ month</span>
            </div>
            <div className="mt-3 text-[11px] text-[hsl(var(--text-2))]">Cancel any time</div>
          </button>

          <button
            onClick={() => handleCheckout("annual")}
            disabled={!!loading}
            data-testid="paywall-annual-button"
            className="relative rounded-[var(--radius)] bg-[hsl(var(--brand))]/10 ring-1 ring-[hsl(var(--brand))]/35 hover:ring-[hsl(var(--brand))]/60 px-4 py-5 text-left transition-colors crimson-breathe"
          >
            <div className="absolute -top-2 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> Save 30%
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Annual</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">$59</span>
              <span className="text-xs text-[hsl(var(--text-3))]">/ year</span>
            </div>
            <div className="mt-3 text-[11px] text-[hsl(var(--text-2))]">$4.91/mo equiv.</div>
          </button>
        </div>

        <DialogFooter className="mt-4 flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))]"
            onClick={() => { onOpenChange?.(false); navigate("/pricing"); }}
            data-testid="paywall-view-pricing"
          >
            Compare plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallDialog;
