import React, { useEffect, useRef, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Power, Volume2, ShieldMinus, Waves, Zap } from "lucide-react";
import { useToneEngine } from "@/hooks/useToneEngine";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import PaywallDialog from "@/components/PaywallDialog";
import { toast } from "sonner";

const GENRES = ["All", "Metal", "Grunge", "Alt-Rock", "90s Rock"];
const SIGNAL_CHAIN = [
  "Input", "Pickup EQ", "Gate", "Pre-Gain", "WaveShaper", "3-Band EQ", "Presence", "Cabinet", "Delay", "Reverb", "Master",
];
const PLAY_LIKE_PRESETS = [
  {
    id: "sober",
    name: "Sober",
    tagline: "Tool / Adam Jones clarity",
    description: "High clarity with a tight midrange crunch and a focused low-end bloom.",
    params: {
      gain: 6.6,
      bass: 5.2,
      mid: 7.4,
      treble: 6.8,
      presence: 6.2,
      master: 6.6,
      distortion_curve: "soft",
      cab_low_gain: 1.2,
      cab_mid_gain: 3.2,
      cab_high_gain: 1.4,
    },
  },
  {
    id: "heart-shaped-box",
    name: "Heart-Shaped Box",
    tagline: "Nirvana / Kurt Cobain grit",
    description: "Raw fuzz, gritty saturation, and a slightly scooped yet unruly upper-mid bite.",
    params: {
      gain: 8.4,
      bass: 4.4,
      mid: 5.3,
      treble: 5.1,
      presence: 4.8,
      master: 6.9,
      distortion_curve: "hard",
      cab_low_gain: 0.6,
      cab_mid_gain: 2.4,
      cab_high_gain: 0.8,
    },
  },
  {
    id: "them-bones",
    name: "Them Bones",
    tagline: "Alice in Chains / Jerry Cantrell darkness",
    description: "Dark, heavily saturated tone with a heavier low-mid body and a smooth, murky top end.",
    params: {
      gain: 7.4,
      bass: 6.1,
      mid: 4.8,
      treble: 4.2,
      presence: 5.4,
      master: 6.8,
      distortion_curve: "hard",
      cab_low_gain: 2.3,
      cab_mid_gain: 1.6,
      cab_high_gain: 0.4,
    },
  },
];

export default function ToneLab() {
  const { user } = useAuth();
  const { active, error, params, setParams, start, stop, getOutputLevel } = useToneEngine();
  const [presets, setPresets] = useState([]);
  const [activePlayLikePreset, setActivePlayLikePreset] = useState("sober");
  const [genre, setGenre] = useState("All");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallLesson, setPaywallLesson] = useState("Tone Lab Presets");
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/tone/presets?genre=${encodeURIComponent(genre)}`);
        setPresets(data);
      } catch (e) {
        console.error("Failed to load tone presets", e);
        toast.error("Could not load tone presets");
      }
    })();
  }, [genre]);

  useEffect(() => {
    if (!active) { setLevel(0); return; }
    const loop = () => {
      setLevel(getOutputLevel());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, getOutputLevel]);

  const onPickPreset = (preset) => {
    if (preset.locked) {
      setPaywallLesson(`Tone Lab Preset: ${preset.name}`);
      setPaywallOpen(true);
      return;
    }
    setParams((prev) => ({ ...prev, ...preset.params }));
    toast.success(`Preset loaded: ${preset.name}`);
  };

  const onPickPlayLikePreset = (preset) => {
    setActivePlayLikePreset(preset.id);
    setParams((prev) => ({ ...prev, ...preset.params }));
    toast.success(`Play Like X preset active: ${preset.name}`);
  };

  const handlePressLiveTone = async () => {
    if (active) { stop(); return; }
    await start();
  };

  return (
    <PageContainer testid="tone-lab-page" maxWidth="max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Virtual Signal Chain</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Tone Lab</h1>
          <p className="mt-2 text-xs text-[hsl(var(--text-3))]">Premium Pedalboard: Gate · Delay · Reverb</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePressLiveTone}
            data-testid="tone-lab-test-live-tone-button"
            className={`uppercase tracking-[0.18em] ${active ? "bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--brand))]/45 crimson-breathe" : "bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))]"}`}
          >
            <Power size={14} className="mr-2" /> {active ? "Stop Live Tone" : "Test Live Tone"}
          </Button>
        </div>
      </div>
      {error && <div className="mt-3 text-[11px] text-[hsl(var(--brand))]">{error}</div>}

      {/* Signal Chain visualizer */}
      <div className="mt-6 overflow-x-auto scroll-soft" data-testid="tone-lab-signal-chain">
        <div className="flex items-center gap-2 min-w-max pb-2">
          {SIGNAL_CHAIN.map((m, i) => {
            const gateOn = params.gate_enabled;
            const delayOn = params.delay_enabled;
            const reverbOn = params.reverb_enabled;
            const dim = (m === "Gate" && !gateOn) || (m === "Delay" && !delayOn) || (m === "Reverb" && !reverbOn);
            return (
              <React.Fragment key={m}>
                <div
                  className={`rounded-md px-3 py-2 text-[11px] uppercase tracking-[0.18em] ring-1 ${
                    active && !dim
                      ? "bg-[hsl(var(--brand))]/12 ring-[hsl(var(--brand))]/35 text-[hsl(var(--foreground))]"
                      : dim
                      ? "bg-[hsl(var(--secondary))]/40 ring-[hsl(var(--border))] text-[hsl(var(--text-3))] line-through"
                      : "bg-[hsl(var(--secondary))]/70 ring-[hsl(var(--border))] text-[hsl(var(--text-2))]"
                  }`}
                  data-testid={`signal-node-${i}`}
                >{m}</div>
                {i < SIGNAL_CHAIN.length - 1 && <span className="text-[hsl(var(--text-3))]">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Output meter */}
      <div className="mt-3 rounded-md bg-[hsl(var(--surface-2))]/70 ring-1 ring-[hsl(var(--border))] p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))] flex items-center gap-2"><Volume2 size={12} /> Output level</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))] tabular-nums">{Math.round(level * 100)}%</div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[hsl(var(--secondary))]/70 overflow-hidden">
          <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${Math.min(100, Math.max(0, level * 100))}%`, transition: "width 90ms linear" }} />
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Play Like X</div>
            <div className="mt-1 font-gothic uppercase tracking-[0.12em] text-lg">Instant Drop D DSP Profiles</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-3))]">Tap a preset to rewire the active chain</div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLAY_LIKE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPickPlayLikePreset(preset)}
              className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/45 p-3 text-left transition-colors hover:border-[hsl(var(--brand))]/40 hover:bg-[hsl(var(--brand))]/12"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-gothic uppercase tracking-[0.14em]">{preset.name}</div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-3))]">{preset.tagline}</span>
              </div>
              <p className="mt-2 text-[11px] text-[hsl(var(--text-3))]">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Amp params */}
      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Amplifier</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SliderRow label="Gain" value={params.gain} onChange={(v)=>setParams({gain:v})} testid="tone-lab-gain-slider" max={10} step={0.1} />
          <SliderRow label="Bass" value={params.bass} onChange={(v)=>setParams({bass:v})} testid="tone-lab-bass-slider" max={10} step={0.1} />
          <SliderRow label="Mid" value={params.mid} onChange={(v)=>setParams({mid:v})} testid="tone-lab-mid-slider" max={10} step={0.1} />
          <SliderRow label="Treble" value={params.treble} onChange={(v)=>setParams({treble:v})} testid="tone-lab-treble-slider" max={10} step={0.1} />
          <SliderRow label="Presence" value={params.presence} onChange={(v)=>setParams({presence:v})} testid="tone-lab-presence-slider" max={10} step={0.1} />
          <SliderRow label="Master" value={params.master} onChange={(v)=>setParams({master:v})} testid="tone-lab-master-slider" max={10} step={0.1} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Pickup</span>
          <div className="inline-flex rounded-md ring-1 ring-[hsl(var(--border))] overflow-hidden">
            {["neck","bridge"].map((pk) => (
              <button key={pk} onClick={() => setParams({pickup: pk})} data-testid={`tone-lab-pickup-${pk}`} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${params.pickup === pk ? "bg-[hsl(var(--brand))]/20 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--secondary))]/70 text-[hsl(var(--text-2))]"}`}>{pk}</button>
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Curve</span>
          <div className="inline-flex rounded-md ring-1 ring-[hsl(var(--border))] overflow-hidden">
            {["clean","soft","rat","hard"].map((c) => (
              <button key={c} onClick={() => setParams({distortion_curve: c})} data-testid={`tone-lab-curve-${c}`} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${params.distortion_curve === c ? "bg-[hsl(var(--brand))]/20 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--secondary))]/70 text-[hsl(var(--text-2))]"}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Pedalboard */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="tone-lab-pedalboard">
        {/* Gate */}
        <PedalCard
          icon={<ShieldMinus size={14} />} title="Noise Gate"
          enabled={params.gate_enabled} onToggle={(v)=>setParams({gate_enabled:v})}
          testid="pedal-gate"
          hint="Silences hiss below threshold. Essential for tight high-gain chugs."
        >
          <SliderRow label="Threshold" value={params.gate_threshold * 100} onChange={(v)=>setParams({gate_threshold: v/100})} min={0} max={20} step={0.2} suffix="%" testid="pedal-gate-threshold" />
          <SliderRow label="Release" value={params.gate_release_ms} onChange={(v)=>setParams({gate_release_ms:v})} min={20} max={400} step={5} suffix="ms" testid="pedal-gate-release" />
        </PedalCard>

        {/* Delay */}
        <PedalCard
          icon={<Zap size={14} />} title="Delay"
          enabled={params.delay_enabled} onToggle={(v)=>setParams({delay_enabled:v})}
          testid="pedal-delay"
          hint="Analog-style delay with tone-shaped feedback for atmospheric leads."
        >
          <SliderRow label="Time" value={params.delay_time} onChange={(v)=>setParams({delay_time:v})} min={0.05} max={1.2} step={0.01} suffix="s" testid="pedal-delay-time" />
          <SliderRow label="Feedback" value={params.delay_feedback * 100} onChange={(v)=>setParams({delay_feedback: v/100})} min={0} max={80} step={1} suffix="%" testid="pedal-delay-feedback" />
          <SliderRow label="Mix" value={params.delay_mix * 100} onChange={(v)=>setParams({delay_mix: v/100})} min={0} max={80} step={1} suffix="%" testid="pedal-delay-mix" />
        </PedalCard>

        {/* Reverb */}
        <PedalCard
          icon={<Waves size={14} />} title="Reverb"
          enabled={params.reverb_enabled} onToggle={(v)=>setParams({reverb_enabled:v})}
          testid="pedal-reverb"
          hint="Cathedral-style hall. Adds depth without muddying the low D."
        >
          <SliderRow label="Mix" value={params.reverb_mix * 100} onChange={(v)=>setParams({reverb_mix: v/100})} min={0} max={80} step={1} suffix="%" testid="pedal-reverb-mix" />
        </PedalCard>
      </div>

      {/* Presets */}
      <div className="mt-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <h2 className="font-gothic uppercase text-lg tracking-[0.12em]">Presets</h2>
          <Tabs value={genre} onValueChange={setGenre} data-testid="tone-lab-genre-tabs">
            <TabsList className="bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))]">
              {GENRES.map((g) => (
                <TabsTrigger key={g} value={g} data-testid={`genre-tab-${g.replace(/\s|-/g,'').toLowerCase()}`} className="data-[state=active]:bg-[hsl(var(--card))]/90 data-[state=active]:text-[hsl(var(--foreground))] uppercase tracking-[0.18em] text-[11px]">{g}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presets.map((p) => (
            <button key={p.id} onClick={() => onPickPreset(p)} data-testid={`tone-preset-${p.id}`} className={`text-left rounded-[var(--radius)] p-4 ring-1 transition-colors ${p.locked ? "bg-[hsl(var(--card))]/80 ring-[hsl(var(--brand))]/25 hover:ring-[hsl(var(--brand))]/45" : "bg-[hsl(var(--card))]/80 ring-[hsl(var(--border))] hover:ring-[hsl(var(--brand))]/35"}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{p.genre}</div>
                  <div className="mt-1 font-gothic uppercase truncate">{p.name}</div>
                </div>
                {p.locked && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30"><Lock size={10} /> Premium</span>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-[hsl(var(--text-3))] uppercase tracking-[0.18em]">
                <span>G {p.params.gain}</span>
                <span>M {p.params.mid}</span>
                <span>T {p.params.treble}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} lessonTitle={paywallLesson} />
    </PageContainer>
  );
}

function PedalCard({ icon, title, enabled, onToggle, hint, children, testid }) {
  return (
    <div
      className={`rounded-[var(--radius)] p-4 ring-1 transition-colors ${enabled ? "bg-[hsl(var(--brand))]/8 ring-[hsl(var(--brand))]/30" : "bg-[hsl(var(--card))]/85 ring-[hsl(var(--border))]"} [box-shadow:var(--shadow-inner-marble)]`}
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 ${enabled ? "bg-[hsl(var(--brand))]/20 ring-[hsl(var(--brand))]/40 text-[hsl(var(--brand))]" : "bg-[hsl(var(--secondary))]/70 ring-[hsl(var(--border))] text-[hsl(var(--text-2))]"}`}>{icon}</span>
          <div>
            <div className="font-gothic uppercase text-sm tracking-[0.12em]">{title}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{enabled ? "On" : "Off"}</div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} data-testid={`${testid}-toggle`} />
      </div>
      <p className="mt-2 text-[11px] text-[hsl(var(--text-3))]">{hint}</p>
      <div className={`mt-3 space-y-3 ${enabled ? "" : "opacity-60 pointer-events-none select-none"}`}>
        {children}
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, testid, suffix = "", min = 0, max = 10, step = 0.1 }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{label}</span>
        <span className="text-sm tabular-nums">{typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v])=>onChange(v)} data-testid={testid} aria-label={`${label} ${value}`} />
    </div>
  );
}
