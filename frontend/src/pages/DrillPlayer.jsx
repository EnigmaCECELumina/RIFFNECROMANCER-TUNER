import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AITeacherPanel from "@/components/AITeacherPanel";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMetronome } from "@/hooks/useMetronome";
import { useBackingTrack, NOTES } from "@/hooks/useBackingTrack";
import { api } from "@/lib/api";
import { Play, Square, ArrowLeft, CheckCircle2, Music4 } from "lucide-react";
import { toast } from "sonner";

export default function DrillPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [deafMode, setDeafMode] = useState(false);
  const [backingEnabled, setBackingEnabled] = useState(true);
  const [palmMuteHits, setPalmMuteHits] = useState({ early: 0, late: 0, ontime: 0 });
  const startedAtRef = useRef(0);
  const lastBeatTimeRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/lessons/${id}`);
        if (data.locked) {
          toast.error("This ritual is premium-locked");
          navigate("/drills");
          return;
        }
        setLesson(data);
      } catch (e) {
        console.error("Failed to load lesson", e);
        setError(e?.response?.status === 404 ? "Lesson not found" : "Could not load this ritual");
      }
    })();
  }, [id, navigate]);

  const bpm = lesson?.bpm || 100;
  const pattern = useMemo(() => lesson?.tab_pattern?.length ? lesson.tab_pattern : ["D5","D5","D5","D5","D5","D5","D5","D5"], [lesson]);

  const { running, beat, start, stop } = useMetronome({
    bpm,
    beats: pattern.length,
    onBeat: () => { lastBeatTimeRef.current = performance.now(); },
  });

  const backing = useBackingTrack();

  const begin = async () => {
    setPalmMuteHits({ early: 0, late: 0, ontime: 0 });
    startedAtRef.current = performance.now();
    start();
    if (backingEnabled) {
      try {
        await backing.start({ bpm, beats: Math.min(4, pattern.length) || 4, key_hz: NOTES.D2 });
      } catch (e) { /* mic not needed */ }
    }
  };

  const halt = () => {
    stop();
    backing.stop();
  };

  const toggleBacking = async (v) => {
    setBackingEnabled(v);
    if (!v && backing.running) {
      backing.stop();
    } else if (v && running && !backing.running) {
      try { await backing.start({ bpm, beats: Math.min(4, pattern.length) || 4, key_hz: NOTES.D2 }); } catch { /* noop */ }
    }
  };

  const onTapHit = () => {
    if (!running) return;
    const now = performance.now();
    const sincePrev = now - lastBeatTimeRef.current;
    const period = (60 / bpm) * 1000;
    const within = sincePrev <= period;
    if (!within) setPalmMuteHits((h) => ({ ...h, late: h.late + 1 }));
    else if (sincePrev <= 80) setPalmMuteHits((h) => ({ ...h, ontime: h.ontime + 1 }));
    else if (sincePrev < period / 2) setPalmMuteHits((h) => ({ ...h, early: h.early + 1 }));
    else setPalmMuteHits((h) => ({ ...h, late: h.late + 1 }));
  };

  const complete = async () => {
    if (!lesson) return;
    const dur = Math.max(15, Math.round((performance.now() - (startedAtRef.current || performance.now())) / 1000));
    try {
      const total = palmMuteHits.ontime + palmMuteHits.early + palmMuteHits.late;
      const accuracy = total ? Math.round((palmMuteHits.ontime / total) * 100) : null;
      await api.post("/sessions", { lesson_id: lesson.id, duration_seconds: dur, completed: true, accuracy });
      halt();
      toast.success(`Ritual recorded: ${lesson.title}`);
      navigate("/progress");
    } catch (e) {
      toast.error("Could not record session");
    }
  };

  if (error) return <PageContainer><div className="text-sm text-[hsl(var(--text-2))]">{error}</div></PageContainer>;
  if (!lesson) return <PageContainer><div className="text-sm text-[hsl(var(--text-3))]">Loading…</div></PageContainer>;

  return (
    <PageContainer testid="drill-player-page">
      <button onClick={() => navigate("/drills")} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em]" data-testid="drill-back">
        <ArrowLeft size={14}/> Back to drills
      </button>
      <div className="mt-2 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">{lesson.genre} · {lesson.level}</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]" data-testid="drill-title">{lesson.title}</h1>
          <p className="mt-2 text-sm text-[hsl(var(--text-2))] max-w-2xl">{lesson.description}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--text-2))]">
            <span>Deaf/HoH Mode</span>
            <Switch checked={deafMode} onCheckedChange={setDeafMode} data-testid="drill-deaf-toggle" />
          </label>
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--text-2))]">
            <span className="inline-flex items-center gap-1"><Music4 size={11}/> Backing Track</span>
            <Switch checked={backingEnabled} onCheckedChange={toggleBacking} data-testid="drill-backing-toggle" />
          </label>
        </div>
      </div>

      <AITeacherPanel
        lesson={lesson}
        kind="guitar"
        pattern={pattern}
        metrics={palmMuteHits}
      />

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">BPM</div>
            <div className="text-3xl tabular-nums" data-testid="drill-bpm">{bpm}</div>
            {backing.running && <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--brand))] mt-1 inline-flex items-center gap-1"><Music4 size={10}/> Backing: Drop-D drone + kick</div>}
          </div>
          <div className="flex items-center gap-3">
            {!running ? (
              <Button onClick={begin} data-testid="drill-start-button" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
                <Play size={14} className="mr-2" /> Start
              </Button>
            ) : (
              <Button onClick={halt} variant="secondary" data-testid="drill-stop-button" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
                <Square size={14} className="mr-2" /> Stop
              </Button>
            )}
            <Button onClick={complete} variant="secondary" data-testid="drill-complete-button" className="bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/35 text-[hsl(var(--foreground))] uppercase tracking-[0.18em]">
              <CheckCircle2 size={14} className="mr-2" /> Complete
            </Button>
          </div>
        </div>

        {/* Tab stream lane */}
        <div className="mt-6" data-testid="drill-tab-stream">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Tab Stream</div>
          <div className="mt-2 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${pattern.length}, minmax(0, 1fr))` }}>
            {pattern.map((p, i) => {
              const activeCell = running && (beat % pattern.length) === i;
              return (
                <div
                  key={i}
                  data-testid={`drill-tab-cell-${i}`}
                  className={`rounded-md text-center py-3 ring-1 transition-colors ${activeCell ? "tab-stream-active text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface-2))]/60 ring-[hsl(var(--border))] text-[hsl(var(--text-2))]"} ${deafMode && activeCell ? "scale-[1.04]" : ""}`}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-3))]">{i + 1}</div>
                  <div className="mt-0.5 font-gothic text-sm">{p}</div>
                </div>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">Beat {beat + 1} of {pattern.length}</p>
        </div>

        {/* Palm-mute timing visualizer */}
        <div className="mt-6" data-testid="drill-palm-mute">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Palm-mute Timing</div>
            <button onClick={onTapHit} disabled={!running} data-testid="drill-tap-hit" className="text-[11px] uppercase tracking-[0.18em] px-3 py-1 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 text-[hsl(var(--foreground))] disabled:opacity-40">
              Tap on beat
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <Stat label="Early" value={palmMuteHits.early} />
            <Stat label="On time" value={palmMuteHits.ontime} accent />
            <Stat label="Late" value={palmMuteHits.late} />
          </div>
          <p className="mt-2 text-[11px] text-[hsl(var(--text-3))]" aria-live="polite">
            {palmMuteHits.early} early, {palmMuteHits.ontime} on time, {palmMuteHits.late} late
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/70 ring-1 ring-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--text-2))]">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Focus</div>
        <div className="mt-1">{lesson.focus}</div>
      </div>
    </PageContainer>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-md p-3 ring-1 ${accent ? "bg-[hsl(var(--brand))]/15 ring-[hsl(var(--brand))]/35" : "bg-[hsl(var(--surface-2))]/60 ring-[hsl(var(--border))]"}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{label}</div>
      <div className="text-xl tabular-nums mt-1">{value}</div>
    </div>
  );
}
