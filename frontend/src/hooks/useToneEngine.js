import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Realistic Tone Lab DSP chain with pedalboard:
 *   Input (mic) → InputGain → Pickup EQ shaping → Noise Gate (envelope follower) →
 *   Pre-Gain → WaveShaper → 3-Band EQ → Presence → Cabinet IR →
 *   [ Dry + Delay wet + Reverb wet ] → Master → Output
 */
function makeDistortionCurve(amount, type = "rat") {
  const k = Math.max(0, amount) * 5;
  const len = 2048;
  const curve = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const x = (i * 2) / len - 1;
    if (type === "clean") curve[i] = x;
    else if (type === "soft") curve[i] = Math.tanh(x * (1 + k * 0.6));
    else if (type === "hard") {
      const drive = 1 + k * 1.2;
      const y = x * drive;
      curve[i] = Math.max(-1, Math.min(1, y * (1 - Math.abs(y) * 0.25)));
    } else {
      const drive = 1 + k * 0.9;
      const y = x * drive;
      const asym = y >= 0 ? Math.tanh(y) : Math.tanh(y * 1.35) * 0.9;
      curve[i] = asym;
    }
  }
  return curve;
}

function makeCabinetIR(ctx, durationSec = 0.05) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const ir = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.5);
      const noise = (Math.random() * 2 - 1) * 0.55;
      const sweep = Math.sin(2 * Math.PI * (80 + 30 * t) * (i / sampleRate));
      data[i] = (noise * 0.5 + sweep * 0.5) * decay;
    }
  }
  return ir;
}

function makeReverbIR(ctx, durationSec = 1.8, decay = 3.5) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const ir = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay of white noise for a smooth reverb tail
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return ir;
}

const DEFAULT_PARAMS = {
  gain: 6.5,
  bass: 5.0,
  mid: 5.0,
  treble: 6.0,
  presence: 5.5,
  master: 6.5,
  pickup: "bridge",
  distortion_curve: "rat",
  cab_low_gain: 0,
  cab_mid_gain: 0,
  cab_high_gain: 0,
  // Effects
  gate_enabled: true,
  gate_threshold: 0.035, // linear RMS 0..1
  gate_attack_ms: 4,
  gate_release_ms: 90,
  delay_enabled: false,
  delay_time: 0.38,
  delay_feedback: 0.32,
  delay_mix: 0.28,
  reverb_enabled: false,
  reverb_mix: 0.25,
};

export function useToneEngine() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParamsState] = useState(DEFAULT_PARAMS);
  const refs = useRef({});
  const streamRef = useRef(null);
  const rafRef = useRef(0);

  const buildChain = useCallback((ctx, p) => {
    const inGain = ctx.createGain();
    inGain.gain.value = 1.0;

    const pickupLow = ctx.createBiquadFilter();
    pickupLow.type = "peaking"; pickupLow.frequency.value = 220; pickupLow.Q.value = 1.1;
    pickupLow.gain.value = p.pickup === "neck" ? 4 : -2;

    const pickupHigh = ctx.createBiquadFilter();
    pickupHigh.type = "peaking"; pickupHigh.frequency.value = 3200; pickupHigh.Q.value = 0.9;
    pickupHigh.gain.value = p.pickup === "bridge" ? 3 : -3;

    // Noise gate (envelope-follower ducking)
    const gateSense = ctx.createAnalyser();
    gateSense.fftSize = 512;
    const gateGain = ctx.createGain();
    gateGain.gain.value = 1.0;

    const preGain = ctx.createGain();
    preGain.gain.value = 0.4 + p.gain * 0.4;

    const dist = ctx.createWaveShaper();
    dist.oversample = "4x";
    dist.curve = makeDistortionCurve(p.gain, p.distortion_curve);

    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf"; bass.frequency.value = 120; bass.gain.value = (p.bass - 5) * 3;

    const mid = ctx.createBiquadFilter();
    mid.type = "peaking"; mid.frequency.value = 800; mid.Q.value = 0.9; mid.gain.value = (p.mid - 5) * 3;

    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf"; treble.frequency.value = 3200; treble.gain.value = (p.treble - 5) * 3;

    const presence = ctx.createBiquadFilter();
    presence.type = "peaking"; presence.frequency.value = 5000; presence.Q.value = 0.8;
    presence.gain.value = (p.presence - 5) * 3;

    const cab = ctx.createConvolver();
    cab.normalize = true;
    cab.buffer = makeCabinetIR(ctx, 0.045);

    const cabLow = ctx.createBiquadFilter();
    cabLow.type = "lowshelf"; cabLow.frequency.value = 140; cabLow.gain.value = p.cab_low_gain ?? 0;

    const cabMid = ctx.createBiquadFilter();
    cabMid.type = "peaking"; cabMid.frequency.value = 720; cabMid.Q.value = 0.95; cabMid.gain.value = p.cab_mid_gain ?? 0;

    const cabHigh = ctx.createBiquadFilter();
    cabHigh.type = "highshelf"; cabHigh.frequency.value = 3200; cabHigh.gain.value = p.cab_high_gain ?? 0;

    // Post-cab split: dry + delay wet + reverb wet, summed at master
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1.0;

    // Delay effect
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = p.delay_time;
    const feedback = ctx.createGain();
    feedback.gain.value = p.delay_feedback;
    const feedbackTone = ctx.createBiquadFilter();
    feedbackTone.type = "lowpass"; feedbackTone.frequency.value = 4000;
    const delayWet = ctx.createGain();
    delayWet.gain.value = p.delay_enabled ? p.delay_mix : 0;

    // Reverb effect
    const reverb = ctx.createConvolver();
    reverb.normalize = true;
    reverb.buffer = makeReverbIR(ctx, 1.8, 3.5);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = p.reverb_enabled ? p.reverb_mix : 0;

    const master = ctx.createGain();
    master.gain.value = 0.05 + p.master * 0.06;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    // Connect pre-cab chain
    inGain.connect(pickupLow);
    pickupLow.connect(pickupHigh);
    // Gate sensing tap (pre-distortion) + inline ducking gain
    pickupHigh.connect(gateSense);
    pickupHigh.connect(gateGain);
    gateGain.connect(preGain);
    preGain.connect(dist);
    dist.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(presence);
    presence.connect(cabLow);
    cabLow.connect(cabMid);
    cabMid.connect(cabHigh);
    cabHigh.connect(cab);

    // Post-cab parallel paths
    cab.connect(dryGain);
    dryGain.connect(master);

    cab.connect(delay);
    delay.connect(feedbackTone);
    feedbackTone.connect(feedback);
    feedback.connect(delay); // feedback loop
    delay.connect(delayWet);
    delayWet.connect(master);

    cab.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(master);

    master.connect(analyser);
    master.connect(ctx.destination);

    return {
      inGain, pickupLow, pickupHigh, gateSense, gateGain, preGain, dist,
      bass, mid, treble, presence, cabLow, cabMid, cabHigh, cab, dryGain,
      delay, feedback, feedbackTone, delayWet,
      reverb, reverbWet, master, analyser,
    };
  }, []);

  const runGateLoop = useCallback(() => {
    const chain = refs.current.chain;
    const ctx = refs.current.ctx;
    if (!chain || !ctx) return;
    const buf = new Float32Array(chain.gateSense.fftSize);
    let smoothed = 0;
    const loop = () => {
      const p = refs.current.params || DEFAULT_PARAMS;
      chain.gateSense.getFloatTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      const rms = Math.sqrt(sumSq / buf.length);
      smoothed = smoothed * 0.6 + rms * 0.4;
      const targetGain = p.gate_enabled ? (smoothed > p.gate_threshold ? 1 : 0) : 1;
      const attackSec = Math.max(0.001, p.gate_attack_ms / 1000);
      const releaseSec = Math.max(0.005, p.gate_release_ms / 1000);
      const timeConstant = targetGain > 0 ? attackSec : releaseSec;
      try { chain.gateGain.gain.setTargetAtTime(targetGain, ctx.currentTime, timeConstant); } catch { /* noop */ }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const chain = buildChain(ctx, params);
      src.connect(chain.inGain);
      refs.current = { ctx, src, chain, params };
      setActive(true);
      runGateLoop();
    } catch (e) {
      console.error("Tone engine error", e);
      setError(e.message || "Microphone permission denied");
      setActive(false);
    }
  }, [params, buildChain, runGateLoop]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try { refs.current.src?.disconnect(); } catch { /* noop */ }
    try {
      const c = refs.current.chain;
      if (c) Object.values(c).forEach((n) => { try { n.disconnect(); } catch { /* noop */ } });
    } catch { /* noop */ }
    try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch { /* noop */ }
    try { refs.current.ctx?.close(); } catch { /* noop */ }
    streamRef.current = null;
    refs.current = {};
    setActive(false);
  }, []);

  const setParams = useCallback((updater) => {
    setParamsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      const c = refs.current.chain;
      if (c && refs.current.ctx) {
        refs.current.params = next;
        try {
          c.preGain.gain.value = 0.4 + next.gain * 0.4;
          c.dist.curve = makeDistortionCurve(next.gain, next.distortion_curve);
          c.bass.gain.value = (next.bass - 5) * 3;
          c.mid.gain.value = (next.mid - 5) * 3;
          c.treble.gain.value = (next.treble - 5) * 3;
          c.presence.gain.value = (next.presence - 5) * 3;
          c.master.gain.value = 0.05 + next.master * 0.06;
          c.pickupLow.gain.value = next.pickup === "neck" ? 4 : -2;
          c.pickupHigh.gain.value = next.pickup === "bridge" ? 3 : -3;
          c.delay.delayTime.value = next.delay_time;
          c.feedback.gain.value = next.delay_feedback;
          c.delayWet.gain.value = next.delay_enabled ? next.delay_mix : 0;
          c.reverbWet.gain.value = next.reverb_enabled ? next.reverb_mix : 0;
        } catch (e) { /* noop */ }
      }
      return next;
    });
  }, []);

  const getOutputLevel = useCallback(() => {
    const a = refs.current.chain?.analyser;
    if (!a) return 0;
    const data = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    return peak;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { active, error, params, setParams, start, stop, getOutputLevel };
}
