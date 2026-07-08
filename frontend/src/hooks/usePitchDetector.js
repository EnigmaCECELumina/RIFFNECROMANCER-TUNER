import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioContext, getMicStream, stopStream, disconnectNodes, closeAudioContext } from "@/lib/audio";
import { createPitchAnalyser, readPitch, frequencyToNote } from "@/lib/pitch";

export { frequencyToNote };

// Drop D tuning frequencies (low to high): D2, A2, D3, G3, B3, E4
export const DROP_D_STRINGS = [
  { name: "D", label: "Low D (6)", octave: 2, freq: 73.42, index: 6 },
  { name: "A", label: "A (5)", octave: 2, freq: 110.0, index: 5 },
  { name: "D", label: "D (4)", octave: 3, freq: 146.83, index: 4 },
  { name: "G", label: "G (3)", octave: 3, freq: 196.0, index: 3 },
  { name: "B", label: "B (2)", octave: 3, freq: 246.94, index: 2 },
  { name: "E", label: "High E (1)", octave: 4, freq: 329.63, index: 1 },
];

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
      const stream = await getMicStream();
      streamRef.current = stream;
      const ctx = await createAudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const { analyser, detector, buffer, time } = createPitchAnalyser(ctx, src);
      analyserRef.current = analyser;
      detectorRef.current = detector;
      bufferRef.current = buffer;
      timeDataRef.current = time;
      setActive(true);
      const loop = () => {
        const an = analyserRef.current;
        const det = detectorRef.current;
        const buf = bufferRef.current;
        const td = timeDataRef.current;
        if (!an || !det || !buf || !td) return;
        const { frequency, clarity, valid } = readPitch(
          { analyser: an, detector: det, buffer: buf, time: td },
          ctx.sampleRate,
        );
        if (valid) {
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
    disconnectNodes(sourceRef.current, analyserRef.current);
    stopStream(streamRef.current);
    closeAudioContext(audioCtxRef.current);
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
