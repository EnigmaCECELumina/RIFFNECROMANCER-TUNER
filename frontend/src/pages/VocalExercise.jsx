import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AITeacherPanel from "@/components/AITeacherPanel";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { usePitchTarget, NOTE_HZ } from "@/hooks/usePitchTarget";
import { Mic, Square, ArrowLeft, CheckCircle2, Timer, Target, ListMusic } from "lucide-react";
import { toast } from "sonner";

const BREATH_PHASES = [
  { name: "Inhale", sec: 4 },
  { name: "Hold", sec: 4 },
  { name: "Exhale", sec: 4 },
  { name: "Hold", sec: 4 },
];

const HELD_TARGETS = ["D3", "E3", "G3", "A3", "B3", "D4", "E4", "G4", "A4"];
const SEQUENCES = {
  "Drop D Root": ["D4", "F4", "A4", "D4"],
  "Cobain Wail": ["A3", "C4", "E4", "A4", "E4"],
  "Metal Melodic": ["D4", "E4", "F4", "G4", "F4", "E4", "D4"],
};

export default function VocalExercise() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const startedAtRef = useRef(0);

  const [mode, setMode] = useState("held"); // held | sequence
  const [heldTarget, setHeldTarget] = useState("A3");
  const [seqName, setSeqName] = useState("Drop D Root");
  const sequence = SEQUENCES[seqName];

  const pt = usePitchTarget({
    target: heldTarget,
    mode,
    sequence,
    hold_seconds: mode === "held" ? 3 : 1.2,
    match_tolerance_cents: mode === "held" ? 35 : 45,
  });

  // Breath box state
  const [breathRunning, setBreathRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSec, setPhaseSec] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/lessons/${id}`);
        if (data.locked) {
          toast.error("This vocal ritual is premium-locked");
          navigate("/vocal");
          return;
        }
        setLesson(data);
        startedAtRef.current = performance.now();
      } catch {
        toast.error("Lesson not found");
        navigate("/vocal");
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!breathRunning) return;
    const t = window.setInterval(() => {
      setPhaseSec((s) => {
        const phase = BREATH_PHASES[phaseIdx];
        if (s + 1 >= phase.sec) {
          setPhaseIdx((p) => (p + 1) % BREATH_PHASES.length);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [breathRunning, phaseIdx]);

  const complete = async () => {
    if (!lesson) return;
    const dur = Math.max(20, Math.round((performance.now() - startedAtRef.current) / 1000));
    try {
      await api.post("/sessions", { lesson_id: lesson.id, duration_seconds: dur, completed: true });
      pt.stop();
      setBreathRunning(false);
      toast.success(`Vocal ritual recorded: ${lesson.title}`);
      navigate("/progress");
    } catch {
      toast.error("Could not record session");
    }
  };

  const holdProgressPct = useMemo(() => {
    const target = mode === "held" ? 3 : 1.2;
    return Math.min(100, (pt.heldSeconds / target) * 100);
  }, [pt.heldSeconds, mode]);

  if (!lesson) return <PageContainer><div className="text-sm text-[hsl(var(--text-3))]">Loading…</div></PageContainer>;

  const isBreath = lesson.id === "vocal-breath-control";
  const isPitch = !isBreath;

  return (
    <PageContainer testid="vocal-exercise-page">
      <button onClick={() => navigate("/vocal")} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em]" data-testid="vocal-back">
        <ArrowLeft size={14}/> Back to vocal
      </button>
      <div className="mt-2 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">{lesson.genre} · {lesson.level}</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]" data-testid="vocal-title">{lesson.title}</h1>
          <p className="mt-2 text-sm text-[hsl(var(--text-2))] max-w-2xl">{lesson.description}</p>
        </div>
        <Button onClick={complete} variant="secondary" data-testid="vocal-complete-button" className="bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/35 text-[hsl(var(--foreground))] uppercase tracking-[0.18em]">
          <CheckCircle2 size={14} className="mr-2" /> Complete
        </Button>
      </div>

      <AITeacherPanel
        lesson={lesson}
        kind="vocal"
        pitch={pt}
        breath={{
          isBreath,
          running: breathRunning,
          phase: BREATH_PHASES[phaseIdx].name,
        }}
      />

      {isPitch && (
        <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          <Tabs value={mode} onValueChange={(v)=>{ pt.reset(); pt.stop(); setMode(v); }} data-testid="vocal-mode-tabs">
            <TabsList className="bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))]">
              <TabsTrigger value="held" data-testid="vocal-mode-held" className="data-[state=active]:bg-[hsl(var(--card))]/90 uppercase tracking-[0.18em] text-[11px]"><Target size={11} className="mr-2" /> Held Note</TabsTrigger>
              <TabsTrigger value="sequence" data-testid="vocal-mode-sequence" className="data-[state=active]:bg-[hsl(var(--card))]/90 uppercase tracking-[0.18em] text-[11px]"><ListMusic size={11} className="mr-2" /> Melodic Sequence</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "held" && (
            <div className="mt-4" data-testid="vocal-held-mode">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Target note</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HELD_TARGETS.map((n) => (
                  <button key={n} onClick={()=>{ pt.reset(); setHeldTarget(n); }} data-testid={`vocal-target-${n}`}
                    className={`px-3 py-1.5 rounded-md text-[11px] uppercase tracking-[0.18em] ring-1 ${heldTarget === n ? "bg-[hsl(var(--brand))]/20 ring-[hsl(var(--brand))]/40 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--secondary))]/70 ring-[hsl(var(--border))] text-[hsl(var(--text-2))]"}`}>
                    {n} <span className="text-[hsl(var(--text-3))] tabular-nums">· {NOTE_HZ[n]?.toFixed(1)}Hz</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "sequence" && (
            <div className="mt-4" data-testid="vocal-sequence-mode">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Sequence</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(SEQUENCES).map((name) => (
                  <button key={name} onClick={()=>{ pt.reset(); setSeqName(name); }} data-testid={`vocal-seq-${name.replace(/\s+/g,'-').toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-md text-[11px] uppercase tracking-[0.18em] ring-1 ${seqName === name ? "bg-[hsl(var(--brand))]/20 ring-[hsl(var(--brand))]/40 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--secondary))]/70 ring-[hsl(var(--border))] text-[hsl(var(--text-2))]"}`}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-1.5" data-testid="vocal-seq-tiles">
                {sequence.map((n, i) => (
                  <div key={i} className={`px-2 py-1.5 rounded text-[11px] uppercase tracking-[0.14em] ring-1 tabular-nums ${i === pt.seqIndex ? "bg-[hsl(var(--brand))]/20 ring-[hsl(var(--brand))]/45 text-[hsl(var(--foreground))]" : i < pt.seqIndex ? "bg-[hsl(var(--brand))]/8 ring-[hsl(var(--brand))]/25 text-[hsl(var(--text-2))]" : "bg-[hsl(var(--secondary))]/60 ring-[hsl(var(--border))] text-[hsl(var(--text-3))]"}`}>
                    {n}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md p-4 bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Target</div>
              <div className="mt-1 font-gothic text-4xl tabular-nums" data-testid="vocal-target-note">{pt.currentNoteLabel}</div>
              <div className="text-[11px] text-[hsl(var(--text-3))] tabular-nums">{pt.targetHz.toFixed(1)} Hz</div>
            </div>
            <div className="rounded-md p-4 bg-[hsl(var(--surface-2))]/60 ring-1 ring-[hsl(var(--border))]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">You</div>
              <div className="mt-1 font-gothic text-4xl tabular-nums" data-testid="vocal-detected-freq">{pt.detected.frequency ? pt.detected.frequency.toFixed(1) : "--"}</div>
              <div className={`text-[11px] tabular-nums ${pt.inWindow ? "text-[hsl(var(--brand))]" : "text-[hsl(var(--text-3))]"}`}>{pt.cents !== null ? `${pt.cents > 0 ? "+" : ""}${pt.cents} cents` : "waiting"}</div>
            </div>
            <div className="rounded-md p-4 bg-[hsl(var(--brand))]/10 ring-1 ring-[hsl(var(--brand))]/30">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--brand))]">Hold Progress</div>
              <div className="mt-1 font-gothic text-4xl tabular-nums" data-testid="vocal-hold-seconds">{pt.heldSeconds.toFixed(1)}s</div>
              <div className="mt-2 h-1.5 rounded-full bg-[hsl(var(--secondary))]/70 overflow-hidden">
                <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${holdProgressPct}%`, transition: "width 90ms linear" }} data-testid="vocal-hold-progress" />
              </div>
            </div>
          </div>
          {pt.seqDone && (
            <div className="mt-4 rounded-md p-3 bg-[hsl(var(--brand))]/12 ring-1 ring-[hsl(var(--brand))]/35 text-sm text-[hsl(var(--foreground))]" data-testid="vocal-seq-done-banner">
              Sequence complete — nice work.
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {!pt.active ? (
              <Button onClick={pt.start} data-testid="vocal-start-button" className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
                <Mic size={14} className="mr-2" /> Enable Mic
              </Button>
            ) : (
              <Button onClick={pt.stop} variant="secondary" data-testid="vocal-stop-button" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]">
                <Square size={14} className="mr-2" /> Stop
              </Button>
            )}
            <Button onClick={pt.reset} variant="ghost" data-testid="vocal-reset-button" className="text-[hsl(var(--text-2))] uppercase tracking-[0.18em]">Reset</Button>
            <span className="text-[11px] text-[hsl(var(--text-3))]" aria-live="polite">
              {pt.error ? pt.error : pt.active ? (pt.inWindow ? `Locked — hold ${pt.currentNoteLabel}` : `Slide toward ${pt.currentNoteLabel}`) : "Enable mic and match the target note."}
            </span>
          </div>
        </div>
      )}

      {isBreath && (
        <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Box Breathing</div>
              <div className="mt-1 font-gothic text-3xl uppercase" data-testid="breath-phase">{BREATH_PHASES[phaseIdx].name}</div>
              <div className="text-sm text-[hsl(var(--text-2))] tabular-nums" data-testid="breath-seconds">{phaseSec} / {BREATH_PHASES[phaseIdx].sec}s</div>
            </div>
            <Button onClick={() => setBreathRunning((r)=>!r)} data-testid="breath-toggle-button" className={`uppercase tracking-[0.18em] ${breathRunning ? "bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))]" : "bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))]"}`}>
              <Timer size={14} className="mr-2" /> {breathRunning ? "Pause" : "Start"}
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {BREATH_PHASES.map((p, i) => (
              <div key={i} className={`rounded-md p-3 text-center ring-1 ${i === phaseIdx ? "bg-[hsl(var(--brand))]/15 ring-[hsl(var(--brand))]/40" : "bg-[hsl(var(--surface-2))]/60 ring-[hsl(var(--border))]"}`} data-testid={`breath-phase-${i}`}>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{p.name}</div>
                <div className="mt-1 text-lg tabular-nums">{p.sec}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-[var(--radius)] bg-[hsl(var(--card))]/70 ring-1 ring-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--text-2))]">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Focus</div>
        <div className="mt-1">{lesson.focus}</div>
      </div>
    </PageContainer>
  );
}
