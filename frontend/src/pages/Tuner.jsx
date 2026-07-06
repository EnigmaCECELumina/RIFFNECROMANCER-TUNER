import React, { useEffect, useRef, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePitchDetector, DROP_D_STRINGS, frequencyToNote, nearestDropDString } from "@/hooks/usePitchDetector";
import { Mic, MicOff } from "lucide-react";

export default function Tuner() {
  const { active, error, pitch, start, stop, getWaveform } = usePitchDetector();
  const [deafMode, setDeafMode] = useState(false);
  const canvasRef = useRef(null);
  const wfBuf = useRef(new Float32Array(2048));

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // baseline
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

      if (active && getWaveform(wfBuf.current)) {
        const buf = wfBuf.current;
        const step = Math.max(1, Math.floor(buf.length / w));
        const mid = h / 2;
        const amp = h * 0.42;
        ctx.strokeStyle = deafMode ? "#fca5a5" : "#dc2626";
        ctx.lineWidth = deafMode ? 2.6 : 1.6;
        ctx.shadowColor = "rgba(220,38,38,0.55)";
        ctx.shadowBlur = deafMode ? 18 : 10;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const v = buf[x * step] || 0;
          const y = mid + v * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, deafMode, getWaveform]);

  const note = frequencyToNote(pitch.frequency || 0);
  const nearest = nearestDropDString(pitch.frequency || 0);
  const inTune = nearest && Math.abs(nearest.cents) < 8;

  return (
    <PageContainer testid="tuner-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Drop D Tuning · D-A-D-G-B-E</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Tuner</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--text-2))]">
            <span>Deaf/HoH Mode</span>
            <Switch checked={deafMode} onCheckedChange={setDeafMode} data-testid="tuner-deaf-toggle" />
          </label>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Detected</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-gothic text-5xl sm:text-6xl tabular-nums" data-testid="tuner-note-readout">{note ? `${note.note}${note.octave}` : "--"}</span>
              <span className="text-[hsl(var(--text-2))] text-sm tabular-nums" data-testid="tuner-frequency-readout">{pitch.frequency ? pitch.frequency.toFixed(1) : "0.0"} Hz</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Cents</div>
            <div className={`text-3xl sm:text-4xl tabular-nums ${nearest && Math.abs(nearest.cents) < 8 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--brand))]"}`} data-testid="tuner-cents-readout">
              {nearest ? (nearest.cents > 0 ? "+" : "") + nearest.cents : "—"}
            </div>
          </div>
        </div>
        <div className="mt-4 h-32 sm:h-40 w-full rounded-md bg-[hsl(var(--surface-2))]/70 ring-1 ring-[hsl(var(--border))] overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full" data-testid="tuner-waveform-canvas" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!active ? (
            <Button onClick={start} data-testid="tuner-start-button" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
              <Mic size={14} className="mr-2" /> Enable Mic
            </Button>
          ) : (
            <Button onClick={stop} variant="secondary" data-testid="tuner-stop-button" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
              <MicOff size={14} className="mr-2" /> Stop
            </Button>
          )}
          <span className="text-[11px] text-[hsl(var(--text-3))]" aria-live="polite">
            {error ? error : active ? (inTune ? "In tune — hold steady" : "Adjust string tension") : "Tap Enable Mic to begin"}
          </span>
        </div>
      </div>

      <h2 className="font-gothic uppercase tracking-[0.12em] mt-8 text-lg">Strings</h2>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="tuner-string-selector">
        {DROP_D_STRINGS.map((s) => {
          const isNearest = nearest && nearest.label === s.label;
          const tuned = isNearest && Math.abs(nearest.cents) < 8;
          return (
            <div
              key={s.label}
              className={`rounded-md p-3 ring-1 text-center transition-colors ${tuned ? "bg-[hsl(var(--brand))]/15 ring-[hsl(var(--brand))]/40" : isNearest ? "bg-[hsl(var(--brand))]/8 ring-[hsl(var(--brand))]/25" : "bg-[hsl(var(--secondary))]/60 ring-[hsl(var(--border))]"}`}
              data-testid={`tuner-string-${s.index}`}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{s.label}</div>
              <div className="mt-1 font-gothic text-lg">{s.name}{s.octave}</div>
              <div className="text-[10px] text-[hsl(var(--text-3))] tabular-nums">{s.freq.toFixed(2)} Hz</div>
            </div>
          );
        })}
      </div>
      <div className="sr-only" aria-live="polite" data-testid="tuner-aria-live">
        {pitch.frequency ? `${note?.note}${note?.octave} ${nearest?.cents > 0 ? "sharp" : "flat"} ${Math.abs(nearest?.cents || 0)} cents` : "Awaiting input"}
      </div>
    </PageContainer>
  );
}
