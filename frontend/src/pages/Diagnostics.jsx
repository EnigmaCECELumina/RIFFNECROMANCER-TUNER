import React, { useEffect, useRef, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";

export default function Diagnostics() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState({
    sampleRate: null,
    baseLatency: null,
    outputLatency: null,
    channels: null,
    deviceLabel: null,
    contextState: null,
  });
  const [levels, setLevels] = useState({ peak: 0, rms: 0 });
  const [latency, setLatency] = useState({ estimated_ms: null, samples: 0 });
  const audioRef = useRef({});
  const rafRef = useRef(0);
  const canvasRef = useRef(null);
  const bufferRef = useRef(null);

  const start = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings?.() || {};
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      audioRef.current = { stream, ctx, src, analyser };
      bufferRef.current = new Float32Array(analyser.fftSize);
      setRunning(true);
      setInfo({
        sampleRate: ctx.sampleRate,
        baseLatency: typeof ctx.baseLatency === "number" ? ctx.baseLatency : null,
        outputLatency: typeof ctx.outputLatency === "number" ? ctx.outputLatency : null,
        channels: settings.channelCount || 1,
        deviceLabel: track?.label || "default input",
        contextState: ctx.state,
      });

      const loop = () => {
        const a = audioRef.current.analyser;
        if (!a) return;
        const buf = bufferRef.current;
        a.getFloatTimeDomainData(buf);
        let peak = 0, sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i]);
          if (v > peak) peak = v;
          sumSq += buf[i] * buf[i];
        }
        setLevels({ peak, rms: Math.sqrt(sumSq / buf.length) });
        drawWaveform(buf);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setError(e.message || "Microphone permission denied");
      setRunning(false);
    }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try { audioRef.current.src?.disconnect(); } catch { /* noop */ }
    try { audioRef.current.analyser?.disconnect(); } catch { /* noop */ }
    try { audioRef.current.stream?.getTracks?.().forEach((t) => t.stop()); } catch { /* noop */ }
    try { audioRef.current.ctx?.close(); } catch { /* noop */ }
    audioRef.current = {};
    setRunning(false);
  };

  useEffect(() => () => stop(), []);

  const drawWaveform = (buf) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.6;
    ctx.shadowColor = "rgba(220,38,38,0.4)"; ctx.shadowBlur = 8;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(buf.length / w));
    for (let x = 0; x < w; x++) {
      const v = buf[x * step] || 0;
      const y = h/2 + v * (h * 0.42);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // Latency estimator: play a short click to speakers, measure loopback via mic
  const measureLatency = async () => {
    const ctx = audioRef.current.ctx;
    const analyser = audioRef.current.analyser;
    if (!ctx || !analyser) return;
    const startAt = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(0.35, startAt + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + 0.1);
    const targetTime = startAt;
    const observeWindowSec = 0.6;
    const detectStart = performance.now();
    const buf = new Float32Array(analyser.fftSize);
    let detected = null;
    while ((performance.now() - detectStart) / 1000 < observeWindowSec) {
      analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > peak) peak = v; }
      if (peak > 0.15 && !detected) {
        detected = ctx.currentTime;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 8));
    }
    if (detected) {
      const ms = Math.max(0, (detected - targetTime) * 1000);
      setLatency({ estimated_ms: Math.round(ms), samples: analyser.fftSize });
    } else {
      setLatency({ estimated_ms: null, samples: 0 });
    }
  };

  return (
    <PageContainer testid="diagnostics-page" maxWidth="max-w-4xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Audio System</p>
        <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Diagnostics</h1>
        <p className="mt-2 text-sm text-[hsl(var(--text-2))] max-w-2xl">
          Verify mic input, sample rate, buffer latency, and browser audio state before a long practice session.
        </p>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Microphone Test</div>
            <div className="mt-1 font-gothic uppercase text-lg">{running ? "Listening…" : "Idle"}</div>
          </div>
          <div className="flex gap-2">
            {!running ? (
              <Button onClick={start} data-testid="diagnostics-start-button" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
                <Mic size={14} className="mr-2" /> Enable Mic
              </Button>
            ) : (
              <Button onClick={stop} variant="secondary" data-testid="diagnostics-stop-button" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
                <MicOff size={14} className="mr-2" /> Stop
              </Button>
            )}
            <Button onClick={measureLatency} disabled={!running} variant="secondary" data-testid="diagnostics-latency-button" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em] disabled:opacity-40">
              <RefreshCw size={14} className="mr-2" /> Measure Latency
            </Button>
          </div>
        </div>
        {error && <div className="mt-3 text-[11px] text-[hsl(var(--brand))] inline-flex items-center gap-1"><AlertTriangle size={12} /> {error}</div>}

        <div className="mt-4 h-28 sm:h-36 w-full rounded-md bg-[hsl(var(--surface-2))]/70 ring-1 ring-[hsl(var(--border))] overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full" data-testid="diagnostics-waveform" />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox label="Peak" value={`${Math.round(levels.peak * 100)}%`} testid="metric-peak" />
          <MetricBox label="RMS" value={`${Math.round(levels.rms * 100)}%`} testid="metric-rms" />
          <MetricBox label="Sample Rate" value={info.sampleRate ? `${(info.sampleRate/1000).toFixed(1)} kHz` : "—"} testid="metric-samplerate" />
          <MetricBox label="Base Latency" value={info.baseLatency !== null ? `${(info.baseLatency*1000).toFixed(1)} ms` : "—"} testid="metric-baselatency" />
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox label="Output Latency" value={info.outputLatency !== null ? `${(info.outputLatency*1000).toFixed(1)} ms` : "—"} testid="metric-outputlatency" />
          <MetricBox label="Round-trip" value={latency.estimated_ms !== null ? `${latency.estimated_ms} ms` : "tap measure"} testid="metric-roundtrip" accent />
          <MetricBox label="Channels" value={info.channels ?? "—"} testid="metric-channels" />
          <MetricBox label="Context" value={info.contextState ?? "—"} testid="metric-contextstate" />
        </div>

        <div className="mt-3 rounded-md p-3 bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Input device</div>
          <div className="mt-1 text-sm break-all" data-testid="metric-device">{info.deviceLabel || "—"}</div>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5">
        <h2 className="font-gothic uppercase text-base tracking-[0.12em]">Recommended Check List</h2>
        <ul className="mt-3 space-y-2 text-sm text-[hsl(var(--text-2))]">
          <Check label="Sample rate is 44.1 kHz or 48 kHz for musical accuracy" />
          <Check label="Round-trip latency below 60 ms for comfortable playing" />
          <Check label="RMS meter moves when you play or speak" />
          <Check label="Peak stays below 90% to avoid clipping" />
          <Check label="Context state is 'running' (browser has unlocked audio)" />
        </ul>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/70 ring-1 ring-[hsl(var(--border))] p-4 text-[11px] text-[hsl(var(--text-3))]">
        <div className="uppercase tracking-[0.22em]">Browser</div>
        <div className="mt-1 break-all text-[hsl(var(--text-2))]">{UA}</div>
      </div>
    </PageContainer>
  );
}

function MetricBox({ label, value, testid, accent }) {
  return (
    <div className={`rounded-md p-3 ring-1 ${accent ? "bg-[hsl(var(--brand))]/10 ring-[hsl(var(--brand))]/30" : "bg-[hsl(var(--surface-2))]/60 ring-[hsl(var(--border))]"}`} data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{label}</div>
      <div className="mt-1 text-lg tabular-nums">{value}</div>
    </div>
  );
}

function Check({ label }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 size={14} className="mt-0.5 text-[hsl(var(--brand))]" />
      <span>{label}</span>
    </li>
  );
}
