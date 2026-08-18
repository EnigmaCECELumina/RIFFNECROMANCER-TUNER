import React, { useMemo, useState } from "react";
import { Brain, HelpCircle, Mic, PlayCircle, RotateCcw, Sparkles, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLessonRecorder } from "@/hooks/useLessonRecorder";

const ROOT_FRETS = {
  D: 0,
  Eb: 1,
  E: 2,
  F: 3,
  G: 5,
  Ab: 6,
  A: 7,
  Bb: 8,
  B: 9,
  C: 10,
  Db: 11,
};

function normalizeToken(token) {
  return String(token || "").replace("pm", "").replace(/\d$/, "");
}

function placementForToken(token) {
  if (!token || token === "REST") return "Rest: keep both hands loose, mute the strings, then breathe before the next hit.";
  if (token === "Dsus2") return "Dsus2: keep the open D shape relaxed, let the open strings ring, and avoid squeezing the wrist.";
  if (token === "Dsus4") return "Dsus4: add the suspended finger cleanly, then release without dragging across the string.";
  if (token === "D") return "Low D: pick the open sixth string with a loose wrist; use the fretting hand only to mute noise.";

  const root = normalizeToken(token);
  const fret = ROOT_FRETS[root];
  const mute = token.includes("pm") ? " Add a light palm mute beside the bridge." : "";
  if (typeof fret === "number") {
    if (fret === 0) return `${token}: play the open low D power chord across strings 6, 5, and 4.${mute}`;
    return `${token}: barre strings 6, 5, and 4 at fret ${fret} with one finger; keep the thumb soft behind the neck.${mute}`;
  }
  return `${token}: keep the fretting hand close to the strings and move only as much as the shape needs.`;
}

function uniquePlacements(pattern = []) {
  const seen = new Set();
  return pattern
    .filter(Boolean)
    .filter((token) => {
      const key = String(token);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .map((token) => ({ token, cue: placementForToken(token) }));
}

function guitarFeedback(metrics = {}) {
  const total = (metrics.ontime || 0) + (metrics.early || 0) + (metrics.late || 0);
  if (!total) return "Start a take and tap along while you play. I will call out whether the groove is rushing, dragging, or sitting in the pocket.";
  const accuracy = Math.round(((metrics.ontime || 0) / total) * 100);
  if (accuracy >= 80) return `Your timing is holding together at ${accuracy}%. Keep the same hand motion and add a little more endurance.`;
  if ((metrics.early || 0) > (metrics.late || 0)) return "You are rushing the front of the beat. Slow the picking hand down and count one smaller chunk at a time.";
  if ((metrics.late || 0) > (metrics.early || 0)) return "You are landing behind the beat. Start the pick stroke a hair earlier and keep the palm mute lighter.";
  return "Timing is mixed right now. Loop two beats only, then widen back out when those feel calm.";
}

function vocalFeedback(pitch = {}, breath = {}) {
  if (breath.isBreath) {
    return breath.running
      ? `Stay with the ${breath.phase || "current"} phase. If your shoulders lift, reset and make the breath lower and quieter.`
      : "Start the breath box and keep the shoulders still. The goal is easy control, not a bigger breath.";
  }
  if (pitch.seqDone) return "The sequence is complete. Next pass, keep the same pitch accuracy but smooth out the movement between notes.";
  if (pitch.inWindow) return `You are locked on ${pitch.currentNoteLabel}. Hold it with less jaw pressure and keep the airflow steady.`;
  if (typeof pitch.cents === "number") {
    if (pitch.cents > 20) return `You are sharp on ${pitch.currentNoteLabel}. Think slightly lower and relax the tongue.`;
    if (pitch.cents < -20) return `You are flat on ${pitch.currentNoteLabel}. Add a little brighter resonance instead of pushing volume.`;
  }
  return "Enable the mic and match the target. I will watch pitch center, hold time, and drift.";
}

function answerQuestion({ question, lesson, kind, currentFeedback }) {
  const q = question.toLowerCase();
  if (!q.trim()) return "Ask me what to fix, where your fingers go, how to slow it down, or why a note feels hard.";
  if (q.includes("finger") || q.includes("fret") || q.includes("place")) {
    return kind === "guitar"
      ? `For this lesson: ${uniquePlacements(lesson?.tab_pattern)[0]?.cue || "keep the fingers close and use the smallest clean motion."}`
      : "For singing, your placement is resonance: keep the jaw easy, tongue forward, and aim the sound behind the upper teeth.";
  }
  if (q.includes("slow") || q.includes("adhd") || q.includes("focus")) {
    return "Use a tiny loop: one cue, one attempt, one correction. Work for 60 seconds, stop, then decide the next tiny target.";
  }
  if (q.includes("hurt") || q.includes("pain") || q.includes("strain")) {
    return "Stop the take. Pain or vocal strain means reset posture, lower intensity, and come back softer. For voice, skip grit until clean tone feels easy.";
  }
  if (q.includes("sharp") || q.includes("flat") || q.includes("pitch")) {
    return kind === "vocal"
      ? currentFeedback
      : "For guitar pitch issues, check tuning first, then press just behind the fret instead of squeezing in the middle.";
  }
  if (q.includes("record") || q.includes("playback") || q.includes("listen")) {
    return "Use Start listening, play your take, then Stop. Playback stays optional, and the feedback will still point to the main thing to fix.";
  }
  return currentFeedback;
}

export default function AITeacherPanel({ lesson, kind = "guitar", pattern = [], metrics, pitch, breath }) {
  const recorder = useLessonRecorder();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const placements = useMemo(() => uniquePlacements(pattern), [pattern]);
  const feedback = kind === "vocal" ? vocalFeedback(pitch, breath) : guitarFeedback(metrics);

  const submitQuestion = (event) => {
    event.preventDefault();
    setAnswer(answerQuestion({ question, lesson, kind, currentFeedback: feedback }));
  };

  return (
    <section className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]" data-testid={`${kind}-ai-teacher`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--brand))]">
            <Brain size={13} /> AI Teacher
          </div>
          <h2 className="mt-1 font-gothic uppercase text-lg tracking-[0.1em]">Listen, Replay, Coach</h2>
          <p className="mt-1 text-sm text-[hsl(var(--text-2))] max-w-2xl">
            One step at a time: watch the cue, play or sing, then use the take only if you want to hear it back.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!recorder.recording ? (
            <Button onClick={recorder.start} data-testid={`${kind}-teacher-record-start`} className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
              <Mic size={14} className="mr-2" /> Start Listening
            </Button>
          ) : (
            <Button onClick={recorder.stop} data-testid={`${kind}-teacher-record-stop`} variant="secondary" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
              <Square size={14} className="mr-2" /> Stop
            </Button>
          )}
          <Button onClick={recorder.reset} variant="ghost" data-testid={`${kind}-teacher-record-reset`} className="text-[hsl(var(--text-2))] uppercase tracking-[0.18em]">
            <RotateCcw size={14} className="mr-2" /> Reset
          </Button>
        </div>
      </div>

      {recorder.error && <p className="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{recorder.error}</p>}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-md bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))] p-4">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">
            <Sparkles size={12} /> Now
          </div>
          <p className="mt-2 text-sm text-[hsl(var(--foreground))]" aria-live="polite">{feedback}</p>
          <p className="mt-3 text-[11px] text-[hsl(var(--text-3))]">Tiny target: fix one thing, then take a break before the next pass.</p>
        </div>

        <div className="rounded-md bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))] p-4">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">
            <PlayCircle size={12} /> Optional Playback
          </div>
          <div className="mt-2 text-sm text-[hsl(var(--foreground))]">
            {recorder.recording ? `Listening... ${recorder.durationSeconds}s` : recorder.audioUrl ? "Take ready when you want to hear it." : "No take recorded yet."}
          </div>
          {recorder.audioUrl && (
            <audio className="mt-3 w-full" controls src={recorder.audioUrl} data-testid={`${kind}-teacher-playback`}>
              <track kind="captions" />
            </audio>
          )}
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-[hsl(var(--text-3))]"><Volume2 size={11} /> Playback is optional.</p>
        </div>

        <div className="rounded-md bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))] p-4">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">
            <HelpCircle size={12} /> Ask
          </div>
          <form onSubmit={submitQuestion} className="mt-2">
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask where to place fingers, what to fix, or how to slow this down."
              className="min-h-[76px]"
              data-testid={`${kind}-teacher-question`}
            />
            <Button type="submit" variant="secondary" data-testid={`${kind}-teacher-ask`} className="mt-2 bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
              Ask Teacher
            </Button>
          </form>
          {answer && <p className="mt-3 text-sm text-[hsl(var(--foreground))]" aria-live="polite" data-testid={`${kind}-teacher-answer`}>{answer}</p>}
        </div>
      </div>

      {kind === "guitar" && placements.length > 0 && (
        <div className="mt-4 rounded-md bg-[hsl(var(--surface-2))]/40 ring-1 ring-[hsl(var(--border))] p-4" data-testid="teacher-finger-placement">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Finger Placement</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {placements.map((item) => (
              <div key={item.token} className="rounded-md bg-[hsl(var(--secondary))]/45 ring-1 ring-[hsl(var(--border))] p-3">
                <div className="font-gothic text-sm uppercase tracking-[0.1em]">{item.token}</div>
                <div className="mt-1 text-xs text-[hsl(var(--text-2))]">{item.cue}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
