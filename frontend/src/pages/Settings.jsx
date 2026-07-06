import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LogOut, Crown } from "lucide-react";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [a11y, setA11y] = useState(user?.accessibility || { deaf_hoh: false, high_contrast: false, audio_cues: true });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/profile/accessibility", a11y);
      setUser(data);
      toast.success("Preferences updated");
    } catch {
      toast.error("Could not save");
    } finally { setBusy(false); }
  };

  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <PageContainer testid="settings-page" maxWidth="max-w-2xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Account & Preferences</p>
        <h1 className="font-gothic uppercase text-2xl tracking-[0.1em]">Settings</h1>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5" data-testid="settings-account-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Email</div>
            <div className="mt-1">{user?.email}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Tier</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm">
              {user?.is_premium ? <><Crown size={12} className="text-[hsl(var(--brand))]" /> Premium</> : "Free"}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {!user?.is_premium && (
            <Button onClick={() => navigate("/pricing")} className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]" data-testid="settings-upgrade-button">
              <Crown size={14} className="mr-2" /> Upgrade
            </Button>
          )}
          <Button onClick={doLogout} variant="secondary" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]" data-testid="settings-logout-button">
            <LogOut size={14} className="mr-2" /> Log Out
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5" data-testid="settings-accessibility-card">
        <h2 className="font-gothic uppercase text-base tracking-[0.12em]">Accessibility</h2>
        <div className="mt-4 space-y-3">
          <Row label="Deaf / Hard-of-Hearing visual mode" desc="Amplify visual feedback (waveforms, beat flashes)" checked={a11y.deaf_hoh} onChange={(v)=>setA11y((s)=>({...s, deaf_hoh: v}))} testid="settings-deaf-hoh-toggle" />
          <Row label="High-contrast text" desc="Boost foreground contrast for readability" checked={a11y.high_contrast} onChange={(v)=>setA11y((s)=>({...s, high_contrast: v}))} testid="settings-contrast-toggle" />
          <Row label="Audio cues" desc="Optional audio feedback for tuner and drills" checked={a11y.audio_cues} onChange={(v)=>setA11y((s)=>({...s, audio_cues: v}))} testid="settings-audio-cues-toggle" />
        </div>
        <Button onClick={save} disabled={busy} data-testid="settings-save-button" className="mt-5 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
          {busy ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </PageContainer>
  );
}

function Row({ label, desc, checked, onChange, testid }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        <div className="text-[11px] text-[hsl(var(--text-3))]">{desc}</div>
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} data-testid={testid} />
    </div>
  );
}
