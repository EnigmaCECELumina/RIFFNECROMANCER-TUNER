import { useCallback, useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

// Drop D tuning frequencies (low to high): D2, A2, D3, G3, B3, E4
export const DROP_D_STRINGS = [
  { name: "D", label: "Low D (6)", octave: 2, freq: 73.42, index: 6 },
  { name: "A", label: "A (5)", octave: 2, freq: 110.0, index: 5 },
  { name: "D", label: "D (4)", octave: 3, freq: 146.83, index: 4 },
  { name: "G", label: "G (3)", octave: 3, freq: 196.0, index: 3 },
  { name: "B", label: "B (2)", octave: 3, freq: 246.94, index: 2 },
  { name: "E", label: "High E (1)", octave: 4, freq: 329.63, index: 1 },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function frequencyToNote(freq) {
  if (!freq || freq <= 0) return null;
  const n = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(n);
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const refFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.floor(1200 * Math.log2(freq / refFreq));
  return { note: NOTE_NAMES[noteIndex], octave, cents, midi };
}

export function nearestDropDString(freq) {
  if (!freq) return null;
  let best = DROP_D_STRINGS[0];
  let bestDiff = Math.abs(Math.log2(freq / best.freq));
  for (const s of DROP_D_STRINGS) {
    const d = Math.abs(Math.log2(freq / s.freq));
    if (d < bestDiff) { bestDiff = d; best = s; }
  }
  const cents = 1200 * Math.log2(freq / best.freq);
  return { ...best, cents: Math.round(cents) };
}

export function usePitchDetector() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [pitch, setPitch] = useState({ frequency: 0, clarity: 0 });
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const detectorRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const timeDataRef = useRef(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detector.minVolumeDecibels = -55;
      detectorRef.current = detector;
      bufferRef.current = new Float32Array(detector.inputLength);
      timeDataRef.current = new Float32Array(analyser.fftSize);
      setActive(true);
      const loop = () => {
        const an = analyserRef.current;
        const det = detectorRef.current;
        const buf = bufferRef.current;
        const td = timeDataRef.current;
        if (!an || !det || !buf || !td) return;
        an.getFloatTimeDomainData(td);
        // copy needed length
        buf.set(td.subarray(0, det.inputLength));
        const [frequency, clarity] = det.findPitch(buf, ctx.sampleRate);
        if (clarity > 0.85 && frequency >= 60 && frequency <= 1500) {
          setPitch({ frequency, clarity });
        } else {
          setPitch((p) => ({ frequency: p.frequency * 0.7, clarity: clarity || 0 }));
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error("Mic error", e);
      setError(e.message || "Microphone permission denied");
      setActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try { sourceRef.current?.disconnect(); } catch {}
    try { analyserRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    streamRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    detectorRef.current = null;
    bufferRef.current = null;
    audioCtxRef.current = null;
    setActive(false);
    setPitch({ frequency: 0, clarity: 0 });
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Provide raw waveform sample for visualization
  const getWaveform = useCallback((out) => {
    const an = analyserRef.current;
    if (!an) return false;
    an.getFloatTimeDomainData(out);
    return true;
  }, []);

  return { active, error, pitch, start, stop, getWaveform };
}
