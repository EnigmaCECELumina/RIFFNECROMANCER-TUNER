// Shared pitch math and pitchy analyser plumbing used by the mic-based pitch
// hooks (usePitchDetector, usePitchTarget). Centralizes the note conversion,
// cents helpers and analyser/detector setup + read loop that were duplicated
// across those hooks.
import { PitchDetector } from "pitchy";

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Defaults shared by the analysis loops: only trust a detected pitch when it is
// clear enough and within a musically plausible range.
export const DEFAULT_FFT_SIZE = 2048;
export const DEFAULT_MIN_VOLUME_DB = -55;
export const DEFAULT_MIN_CLARITY = 0.85;
export const DEFAULT_MIN_FREQ = 60;
export const DEFAULT_MAX_FREQ = 1500;

// Convert a frequency (Hz) to its nearest note, octave and cents offset.
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

// Signed cents between two frequencies. Returns a large sentinel when either
// frequency is missing so callers treat it as "way out of tune".
export function centsBetween(f1, f2) {
  if (!f1 || !f2) return 999;
  return 1200 * Math.log2(f1 / f2);
}

// Build an analyser + pitchy detector for a source node, plus the reusable
// sample buffers. Returns everything needed to drive `readPitch`.
export function createPitchAnalyser(ctx, sourceNode, {
  fftSize = DEFAULT_FFT_SIZE,
  minVolumeDecibels = DEFAULT_MIN_VOLUME_DB,
} = {}) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  sourceNode.connect(analyser);
  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  detector.minVolumeDecibels = minVolumeDecibels;
  const buffer = new Float32Array(detector.inputLength);
  const time = new Float32Array(analyser.fftSize);
  return { analyser, detector, buffer, time };
}

// Read the current pitch from an analyser bundle (as returned by
// `createPitchAnalyser`). `valid` is false when the signal is too weak or out
// of range to trust; callers decide how to react.
export function readPitch({ analyser, detector, buffer, time }, sampleRate, {
  minClarity = DEFAULT_MIN_CLARITY,
  minFreq = DEFAULT_MIN_FREQ,
  maxFreq = DEFAULT_MAX_FREQ,
} = {}) {
  analyser.getFloatTimeDomainData(time);
  buffer.set(time.subarray(0, detector.inputLength));
  const [frequency, clarity] = detector.findPitch(buffer, sampleRate);
  const valid = clarity > minClarity && frequency >= minFreq && frequency <= maxFreq;
  return { frequency, clarity, valid };
}
