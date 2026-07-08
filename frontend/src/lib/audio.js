// Shared Web Audio helpers used across the practice hooks (pitch detection,
// tone engine, metronome, backing track). Centralizes the cross-browser
// AudioContext creation, microphone access and teardown that were previously
// copy-pasted into each hook.

// Mic constraints tuned for analysis: disable browser DSP so the raw signal
// reaches the pitch detector / tone chain unaltered.
export const RAW_MIC_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

// Request a microphone stream. Pass `audio` constraints (defaults to the raw,
// unprocessed constraints used for analysis; pass `true` for plain recording).
export function getMicStream(audio = RAW_MIC_CONSTRAINTS) {
  return navigator.mediaDevices.getUserMedia({ audio });
}

// Create a cross-browser AudioContext, resuming it if the browser starts it
// suspended (required after a user gesture on some browsers).
export async function createAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

// Stop every track on a MediaStream, swallowing errors from already-stopped
// or missing streams.
export function stopStream(stream) {
  try {
    stream?.getTracks?.().forEach((t) => t.stop());
  } catch {
    /* noop */
  }
}

// Disconnect a set of Web Audio nodes, ignoring nodes that are null or already
// disconnected.
export function disconnectNodes(...nodes) {
  for (const node of nodes) {
    try {
      node?.disconnect?.();
    } catch {
      /* noop */
    }
  }
}

// Close an AudioContext, swallowing errors from an already-closed context.
export function closeAudioContext(ctx) {
  try {
    ctx?.close();
  } catch {
    /* noop */
  }
}
