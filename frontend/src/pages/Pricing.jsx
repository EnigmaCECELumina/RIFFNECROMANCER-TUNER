import React, { useState } from "react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const FEATURES = [
  "All free drills (Intro, Heavy Chugging, Suspended Atmosphere)",
  "Advanced rhythm drills (Galloping Shadows, Tremolo Picking Fury, Chromatic Descent, Dissonant Intervals)",
  "Vocal suite (Lip Trills, Pitch Match, Grit Resonance, Breath Box, Melodic Control)",
  "Tone Lab presets (Seattle Grunge, Obsidian Chug, Crimson Pedal, Bridge Bite)",
  "Progress Altar full history",
  "Cancel any time",
];

// Make sure these match the exact Price IDs from your Stripe Dashboard
const PRICING_PACKAGES = {
  monthly: "price_1TrEBTPazp0TRDgXZsELZMwa", // $7 monthly subscription
  yearly: "price_1TrEBTPazp0TRDgXjH0k3eYy"    // $59 yearly subscription
};

export default function Pricing() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(null);
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' or 'yearly'

  const handleCheckout = async () => {
    try {
      setBusy(billingInterval);
      const selectedPriceId = PRICING_PACKAGES[billingInterval];
      
      // Call your API route
      const response = await fetch(`${process.env.REACT_APP_API_URL}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPriceId }) 
      });
      
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else toast.error("Could not start checkout");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
    } finally { setBusy(null); }
  };

  return (
    <PageContainer testid="pricing-page" maxWidth="max-w-4xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Membership</p>
        <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Choose your tier</h1>
        <p className="mt-2 text-sm text-[hsl(var(--text-2))] max-w-2xl">Unlock advanced rituals, the vocal suite, and Tone Lab presets. Cancel any time.</p>
      </div>

      {user?.is_premium && (
        <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--brand))]/10 ring-1 ring-[hsl(var(--brand))]/30 p-4 text-sm flex items-center gap-2" data-testid="premium-active-banner">
          <Crown size={14} className="text-[hsl(var(--brand))]" />
          You are currently <span className="text-[hsl(var(--foreground))] font-medium">Premium</span>
          {user.premium_period && <span className="text-[hsl(var(--text-3))]"> · {user.premium_period}</span>}
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingInterval('monthly')}
          className={`text-sm uppercase tracking-[0.18em] transition-colors ${billingInterval === 'monthly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--text-3))]'}`}
        >
          Monthly
        </button>
        <div className="w-12 h-px bg-[hsl(var(--border))]"></div>
        <button
          onClick={() => setBillingInterval('yearly')}
          className={`text-sm uppercase tracking-[0.18em] transition-colors ${billingInterval === 'yearly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--text-3))]'}`}
        >
          Yearly
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-6 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]" data-testid="pricing-monthly-card">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Monthly</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-gothic text-5xl tabular-nums">$7</span>
            <span className="text-sm text-[hsl(var(--text-3))]">/ month</span>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-[hsl(var(--text-2))]">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-[hsl(var(--brand))]" /> {f}</li>
            ))}
          </ul>
          <Button onClick={handleCheckout} disabled={!!busy} data-testid="pricing-subscribe-monthly" className="mt-6 w-full bg-[hsl(var(--secondary))]/80 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
            {busy === billingInterval ? "Opening checkout…" : "Subscribe Monthly"}
          </Button>
        </div>

        <div className="rounded-[var(--radius)] bg-[hsl(var(--brand))]/8 ring-1 ring-[hsl(var(--brand))]/40 p-6 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)] crimson-breathe relative" data-testid="pricing-annual-card">
          <div className="absolute -top-2 right-4 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] px-2 py-0.5 rounded-full">
            <Sparkles size={10} /> Save 30%
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--brand))]">Annual</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-gothic text-5xl tabular-nums">$59</span>
            <span className="text-sm text-[hsl(var(--text-3))]">/ year</span>
          </div>
          <div className="text-[11px] text-[hsl(var(--text-3))]">$4.91/mo equivalent</div>
          <ul className="mt-5 space-y-2 text-sm text-[hsl(var(--text-2))]">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-[hsl(var(--brand))]" /> {f}</li>
            ))}
          </ul>
          <Button onClick={handleCheckout} disabled={!!busy} data-testid="pricing-subscribe-annual" className="mt-6 w-full bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
            {busy === billingInterval ? "Opening checkout…" : "Subscribe Annually"}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[hsl(var(--text-3))]">Test mode: use card 4242 4242 4242 4242 with any future expiry and CVC.</p>
    </PageContainer>
  );
}
