import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioContext } from "@/lib/audio";

// Note frequencies (Drop D relevant + neighbors)
export const NOTES = {
  D2: 73.42, A2: 110.0, D3: 146.83, G3: 196.0, B3: 246.94, E4: 329.63,
  D4: 293.66, F4: 349.23, A4: 440.0, C5: 523.25, E5: 659.25,
};

/**
 * Synthesized backing track: bass drone (low D) + drum click on beats 1 & 3.
 * All in-browser via Web Audio API. Zero storage.
 *
 * Usage:
 *   const bt = useBackingTrack();
 *   bt.start({ bpm: 140, key_hz: 73.42 })
 *   bt.stop()
 */
export function useBackingTrack() {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef(null);
  const droneRef = useRef({ osc: null, sub: null, gain: null, lfo: null });
  const timerRef = useRef(0);
  const beatRef = useRef(0);
  const optsRef = useRef({ bpm: 100, beats: 4, key_hz: NOTES.D2, drone_level: 0.16, kick_level: 0.55 });

  const start = useCallback(async (opts = {}) => {
    optsRef.current = { ...optsRef.current, ...opts };
    const ctx = ctxRef.current || await createAudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    // Bass drone: sawtooth on root + sub sine one octave down + gentle vibrato
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = optsRef.current.key_hz;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = optsRef.current.key_hz / 2;
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 4.2;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 320; lp.Q.value = 0.9;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    // Attack ramp
    droneGain.gain.setTargetAtTime(optsRef.current.drone_level, ctx.currentTime, 0.15);

    osc.connect(lp);
    sub.connect(lp);
    lp.connect(droneGain);
    droneGain.connect(ctx.destination);

    osc.start();
    sub.start();
    lfo.start();
    droneRef.current = { osc, sub, gain: droneGain, lfo };

    // Drum click scheduler
    beatRef.current = 0;
    setBeat(0);
    setRunning(true);
    const interval = (60 / optsRef.current.bpm) * 1000;
    const kick = () => {
      const c = ctxRef.current;
      if (!c) return;
      const now = c.currentTime;
      const kOsc = c.createOscillator();
      kOsc.type = "sine";
      kOsc.frequency.setValueAtTime(120, now);
      kOsc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      const kGain = c.createGain();
      kGain.gain.setValueAtTime(0.0001, now);
      kGain.gain.exponentialRampToValueAtTime(optsRef.current.kick_level, now + 0.003);
      kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      kOsc.connect(kGain);
      kGain.connect(c.destination);
      kOsc.start(now);
      kOsc.stop(now + 0.25);
    };
    const hat = () => {
      const c = ctxRef.current;
      if (!c) return;
      const now = c.currentTime;
      const bufferSize = Math.floor(c.sampleRate * 0.06);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      const hp = c.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 6000;
      const hg = c.createGain();
      hg.gain.setValueAtTime(0.0001, now);
      hg.gain.exponentialRampToValueAtTime(0.12, now + 0.002);
      hg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      noise.connect(hp);
      hp.connect(hg);
      hg.connect(c.destination);
      noise.start(now);
      noise.stop(now + 0.07);
    };
    const tick = () => {
      const b = beatRef.current % optsRef.current.beats;
      setBeat(b);
      if (b === 0 || b === 2) kick();
      else hat();
      beatRef.current += 1;
    };
    tick();
    timerRef.current = window.setInterval(tick, interval);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = 0; }
    const d = droneRef.current;
    const c = ctxRef.current;
    if (d && c) {
      try {
        d.gain?.gain.setTargetAtTime(0, c.currentTime, 0.08);
        setTimeout(() => {
          try { d.osc?.stop(); } catch { /* noop */ }
          try { d.sub?.stop(); } catch { /* noop */ }
          try { d.lfo?.stop(); } catch { /* noop */ }
        }, 250);
      } catch { /* noop */ }
    }
    droneRef.current = { osc: null, sub: null, gain: null, lfo: null };
    setRunning(false);
    setBeat(0);
  }, []);

  const setBpm = useCallback((bpm) => {
    optsRef.current.bpm = bpm;
    if (running) {
      stop();
      // small delay to let audio ramp down before restarting
      setTimeout(() => start({ bpm }), 260);
    }
  }, [running, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { running, beat, start, stop, setBpm };
}
