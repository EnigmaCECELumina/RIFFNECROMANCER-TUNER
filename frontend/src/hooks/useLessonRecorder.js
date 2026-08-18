import { useCallback, useEffect, useRef, useState } from "react";
import { getMicStream, stopStream } from "@/lib/audio";

export function useLessonRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(0);
  const urlRef = useRef("");

  const clearTick = () => {
    window.clearInterval(tickRef.current);
    tickRef.current = 0;
  };

  const releaseUrl = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
  };

  const start = useCallback(async () => {
    try {
      setError("");
      releaseUrl();
      setAudioUrl("");
      setDurationSeconds(0);
      chunksRef.current = [];

      const stream = await getMicStream(true);
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const nextUrl = URL.createObjectURL(blob);
        urlRef.current = nextUrl;
        setAudioUrl(nextUrl);
        stopStream(stream);
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorder.start();
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setDurationSeconds(Math.round((performance.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (e) {
      setError(e.message || "Microphone permission denied");
      setRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    clearTick();
    setDurationSeconds(Math.round((performance.now() - startedAtRef.current) / 1000));
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } catch {
      stopStream(streamRef.current);
    }
    setRecording(false);
  }, []);

  const reset = useCallback(() => {
    if (recording) stop();
    releaseUrl();
    setAudioUrl("");
    setDurationSeconds(0);
    setError("");
    chunksRef.current = [];
  }, [recording, stop]);

  useEffect(() => {
    return () => {
      clearTick();
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        /* noop */
      }
      stopStream(streamRef.current);
      releaseUrl();
    };
  }, []);

  return { recording, audioUrl, error, durationSeconds, start, stop, reset };
}
