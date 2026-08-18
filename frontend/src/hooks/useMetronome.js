import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioContext } from "@/lib/audio";

export function useMetronome({ bpm = 100, beats = 4, onBeat } = {}) {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef(null);
  const timerRef = useRef(0);
  const beatRef = useRef(0);
  const onBeatRef = useRef(onBeat);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);

  const click = useCallback((accent = false) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = accent ? 1500 : 900;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(accent ? 0.4 : 0.22, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.1);
  }, []);

  const start = useCallback(async () => {
    if (running) return;
    const ctx = ctxRef.current || await createAudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    beatRef.current = 0;
    setBeat(0);
    setRunning(true);
    const interval = (60 / bpm) * 1000;
    const tick = () => {
      const b = beatRef.current % beats;
      setBeat(b);
      click(b === 0);
      onBeatRef.current?.(b);
      beatRef.current += 1;
    };
    tick();
    timerRef.current = window.setInterval(tick, interval);
  }, [bpm, beats, click, running]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
    setRunning(false);
    setBeat(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    // Reset interval if bpm changes
    if (timerRef.current) clearInterval(timerRef.current);
    const interval = (60 / bpm) * 1000;
    timerRef.current = window.setInterval(() => {
      const b = beatRef.current % beats;
      setBeat(b);
      click(b === 0);
      onBeatRef.current?.(b);
      beatRef.current += 1;
    }, interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  useEffect(() => () => stop(), [stop]);

  return { running, beat, start, stop };
}
