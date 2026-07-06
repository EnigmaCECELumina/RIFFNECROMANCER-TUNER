import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

export const NOTE_HZ = {
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
};

export const NOTE_ORDER = ["D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5","E5"];

function centsBetween(f1, f2) {
  if (!f1 || !f2) return 999;
  return 1200 * Math.log2(f1 / f2);
}

/**
 * Vocal pitch-target engine.
 *   Mode "held": user sustains a single target note for `hold_seconds`.
 *     Progress accumulates while |cents| <= match_tolerance_cents. Reset if user drifts out.
 *   Mode "sequence": user matches an ordered list of notes, each held for target_hold_sec.
 */
export function usePitchTarget({ target = "A3", mode = "held", sequence = ["D4","E4","F4","D4"], hold_seconds = 3, match_tolerance_cents = 35 } = {}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [detected, setDetected] = useState({ frequency: 0, clarity: 0 });
  const [heldSeconds, setHeldSeconds] = useState(0);
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqDone, setSeqDone] = useState(false);
  const [inWindow, setInWindow] = useState(false);

  const cfg = useMemo(() => ({ target, mode, sequence, hold_seconds, match_tolerance_cents }), [target, mode, sequence, hold_seconds, match_tolerance_cents]);

  const audioRef = useRef({});
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  const currentTargetHz = useCallback(() => {
    if (cfg.mode === "sequence") {
      const noteName = cfg.sequence[seqIndex] || cfg.sequence[cfg.sequence.length - 1];
      return NOTE_HZ[noteName] || 220;
    }
    return NOTE_HZ[cfg.target] || 220;
  }, [cfg, seqIndex]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setHeldSeconds(0);
      setSeqIndex(0);
      setSeqDone(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detector.minVolumeDecibels = -55;
      const buffer = new Float32Array(detector.inputLength);
      const time = new Float32Array(analyser.fftSize);
      audioRef.current = { stream, ctx, src, analyser, detector, buffer, time };
      setActive(true);
      lastTsRef.current = performance.now();
      const loop = () => {
        const ref = audioRef.current;
        if (!ref?.analyser) return;
        ref.analyser.getFloatTimeDomainData(ref.time);
        ref.buffer.set(ref.time.subarray(0, ref.detector.inputLength));
        const [freq, clarity] = ref.detector.findPitch(ref.buffer, ref.ctx.sampleRate);
        const validFreq = clarity > 0.85 && freq >= 60 && freq <= 1500 ? freq : 0;
        setDetected({ frequency: validFreq, clarity });

        const now = performance.now();
        const dt = Math.min(0.1, (now - lastTsRef.current) / 1000);
        lastTsRef.current = now;

        const targetHz = currentTargetHz();
        const cents = Math.abs(centsBetween(validFreq, targetHz));
        const within = validFreq > 0 && cents <= cfg.match_tolerance_cents;
        setInWindow(within);

        setHeldSeconds((prev) => {
          if (within) {
            const next = prev + dt;
            if (next >= cfg.hold_seconds) {
              if (cfg.mode === "sequence") {
                setSeqIndex((i) => {
                  const nextI = i + 1;
                  if (nextI >= cfg.sequence.length) {
                    setSeqDone(true);
                    return i;
                  }
                  return nextI;
                });
                return 0;
              }
              return cfg.hold_seconds;
            }
            return next;
          }
          return Math.max(0, prev - dt * 0.6);
        });

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setError(e.message || "Microphone permission denied");
      setActive(false);
    }
  }, [cfg, currentTargetHz]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const ref = audioRef.current;
    try { ref?.src?.disconnect(); } catch { /* noop */ }
    try { ref?.analyser?.disconnect(); } catch { /* noop */ }
    try { ref?.stream?.getTracks?.().forEach((t) => t.stop()); } catch { /* noop */ }
    try { ref?.ctx?.close(); } catch { /* noop */ }
    audioRef.current = {};
    setActive(false);
    setDetected({ frequency: 0, clarity: 0 });
  }, []);

  const reset = useCallback(() => {
    setHeldSeconds(0);
    setSeqIndex(0);
    setSeqDone(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const targetHz = currentTargetHz();
  const currentNoteLabel = cfg.mode === "sequence" ? (cfg.sequence[seqIndex] || cfg.sequence[cfg.sequence.length - 1]) : cfg.target;
  const cents = detected.frequency ? Math.round(centsBetween(detected.frequency, targetHz)) : null;

  return {
    active, error, detected, heldSeconds, seqIndex, seqDone, inWindow,
    targetHz, currentNoteLabel, cents,
    start, stop, reset,
  };
}
