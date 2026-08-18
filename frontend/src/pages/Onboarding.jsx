import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PageContainer from "@/components/PageContainer";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const GOALS = [
  { id: "chug", label: "Heavy Chugging" },
  { id: "gallop", label: "Galloping Rhythm" },
  { id: "alt-rock", label: "Alt-Rock Mood" },
  { id: "vocal", label: "Singing Control" },
  { id: "speed", label: "Picking Speed" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState("Beginner");
  const [goals, setGoals] = useState([]);
  const [accessibility, setAccessibility] = useState({ deaf_hoh: false, high_contrast: false, audio_cues: true });
  const [busy, setBusy] = useState(false);

  const toggleGoal = (g) => setGoals((arr) => arr.includes(g) ? arr.filter((x)=>x!==g) : [...arr, g]);

  const finish = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/profile/onboard", { skill_level: level, goals, accessibility });
      setUser(data);
      toast.success("Sanctum ready");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("Could not save preferences");
    } finally { setBusy(false); }
  };

  return (
    <PageContainer testid="onboarding-page" maxWidth="max-w-xl">
      <h1 className="font-gothic uppercase tracking-[0.12em] text-2xl">Begin Initiation</h1>
      <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em] mt-1">Step {step + 1} of 3</p>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        {step === 0 && (
          <div data-testid="onboarding-step-level">
            <h2 className="font-gothic uppercase text-base">What is your level?</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {LEVELS.map((lv) => (
                <button key={lv} onClick={() => setLevel(lv)} data-testid={`onboarding-level-${lv.toLowerCase()}`}
                  className={`rounded-md px-3 py-3 text-xs uppercase tracking-[0.18em] ring-1 transition-colors ${level === lv ? "bg-[hsl(var(--brand))]/15 text-[hsl(var(--foreground))] ring-[hsl(var(--brand))]/40" : "bg-[hsl(var(--secondary))]/60 text-[hsl(var(--text-2))] ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]"}`}>
                  {lv}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && (
          <div data-testid="onboarding-step-goals">
            <h2 className="font-gothic uppercase text-base">Pick your rituals</h2>
            <p className="text-xs text-[hsl(var(--text-3))] mt-1">Select any that resonate</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g.id} onClick={() => toggleGoal(g.id)} data-testid={`onboarding-goal-${g.id}`}
                  className={`rounded-md px-3 py-3 text-xs uppercase tracking-[0.18em] ring-1 text-left transition-colors ${goals.includes(g.id) ? "bg-[hsl(var(--brand))]/15 text-[hsl(var(--foreground))] ring-[hsl(var(--brand))]/40" : "bg-[hsl(var(--secondary))]/60 text-[hsl(var(--text-2))] ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div data-testid="onboarding-step-accessibility">
            <h2 className="font-gothic uppercase text-base">Accessibility</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Deaf / Hard-of-Hearing visual mode</Label>
                  <p className="text-xs text-[hsl(var(--text-3))]">Amplify visual feedback (waveforms, beat flashes)</p>
                </div>
                <Switch checked={accessibility.deaf_hoh} onCheckedChange={(v)=>setAccessibility((a)=>({...a, deaf_hoh: v}))} data-testid="onboarding-deaf-hoh-toggle" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">High-contrast text</Label>
                  <p className="text-xs text-[hsl(var(--text-3))]">Boost foreground contrast for readability</p>
                </div>
                <Switch checked={accessibility.high_contrast} onCheckedChange={(v)=>setAccessibility((a)=>({...a, high_contrast: v}))} data-testid="onboarding-high-contrast-toggle" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Audio cues</Label>
                  <p className="text-xs text-[hsl(var(--text-3))]">Optional audio feedback for tuner and drills</p>
                </div>
                <Switch checked={accessibility.audio_cues} onCheckedChange={(v)=>setAccessibility((a)=>({...a, audio_cues: v}))} data-testid="onboarding-audio-cues-toggle" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s)=>Math.max(0, s-1))} disabled={step === 0} data-testid="onboarding-back" className="text-[hsl(var(--text-2))]">
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((s) => Math.min(2, s+1))} data-testid="onboarding-next" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))]">
            Next
          </Button>
        ) : (
          <Button onClick={finish} disabled={busy} data-testid="onboarding-finish" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))]">
            {busy ? "Saving…" : "Enter Sanctum"}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
