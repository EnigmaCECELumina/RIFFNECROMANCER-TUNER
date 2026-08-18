import { useState, useEffect, useRef } from 'react';
import { PitchDetector } from 'pitchy';
import { createAudioContext, getMicStream, stopStream, disconnectNodes, closeAudioContext } from '../lib/audio';

// --- TUNING CONSTANTS ---

// Smoothing factor for the exponential moving average. A smaller value means more smoothing.
const SMOOTHING_FACTOR = 0.15;
// Minimum confidence from the pitch detector to accept a value.
const MIN_CONFIDENCE = 0.9;
// How many consecutive "null" (low-confidence) readings it takes to reset the pitch to 0.
const NULL_READING_RESET_THRESHOLD = 5;

/**
 * A React hook to get a smoothed, stable pitch from the microphone.
 * @param {boolean} isTunerEnabled - Whether the tuner should be active and listening.
 * @returns {{ frequency: number }} - An object containing the smoothed frequency.
 */
export function useSmoothedPitch(isTunerEnabled) {
  const [smoothedFrequency, setSmoothedFrequency] = useState(0);

  // Using refs to hold audio objects and state that doesn't need to trigger re-renders.
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const animationFrameId = useRef(null);
  const smoothedFrequencyRef = useRef(0);
  const nullReadingsCount = useRef(0);

  useEffect(() => {
    const setupAudio = async () => {
      if (isTunerEnabled) {
        try {
          const context = await createAudioContext();
          audioContextRef.current = context;

          const stream = await getMicStream();
          streamRef.current = stream;

          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 2048; // Standard for pitch detection
          source.connect(analyser);
          analyserNodeRef.current = analyser;

          const detector = PitchDetector.forFloat32Array(analyser.fftSize);
          const input = new Float32Array(detector.inputLength);

          const updatePitch = () => {
            analyser.getFloatTimeDomainData(input);
            const [frequency, confidence] = detector.findPitch(input, context.sampleRate);

            if (confidence > MIN_CONFIDENCE && frequency > 0) {
              nullReadingsCount.current = 0;
              // Apply exponential moving average for smoothing
              if (smoothedFrequencyRef.current === 0) {
                smoothedFrequencyRef.current = frequency; // Initialize
              } else {
                smoothedFrequencyRef.current =
                  SMOOTHING_FACTOR * frequency +
                  (1 - SMOOTHING_FACTOR) * smoothedFrequencyRef.current;
              }
            } else {
              nullReadingsCount.current++;
              // If we lose the signal for a few frames, reset to 0
              if (nullReadingsCount.current > NULL_READING_RESET_THRESHOLD) {
                smoothedFrequencyRef.current = 0;
              }
            }
            
            setSmoothedFrequency(smoothedFrequencyRef.current);

            animationFrameId.current = requestAnimationFrame(updatePitch);
          };

          updatePitch();

        } catch (error) {
          console.error('Error setting up audio for tuner:', error);
          // You could set an error state here to show in the UI
        }
      } else {
        // Teardown logic
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        stopStream(streamRef.current);
        disconnectNodes(analyserNodeRef.current);
        closeAudioContext(audioContextRef.current);
        
        // Reset refs and state
        Object.assign(audioContextRef, { current: null });
        Object.assign(streamRef, { current: null });
        Object.assign(analyserNodeRef, { current: null });
        smoothedFrequencyRef.current = 0;
        setSmoothedFrequency(0);
      }
    };

    setupAudio();

    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      stopStream(streamRef.current);
      disconnectNodes(analyserNodeRef.current);
      closeAudioContext(audioContextRef.current);
    };
  }, [isTunerEnabled]);

  return { frequency: smoothedFrequency };
}