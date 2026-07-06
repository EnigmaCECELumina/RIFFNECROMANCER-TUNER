import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import LessonCard from "@/components/LessonCard";
import PaywallDialog from "@/components/PaywallDialog";
import { api } from "@/lib/api";

const SHAPE_PRESETS = [
  {
    id: "power",
    label: "Flat One-Finger Power Chords",
    description: "Bar the low three strings at one fret for quick, punchy Drop D shapes.",
    points: [
      { string: 0, fret: 3 },
      { string: 1, fret: 3 },
      { string: 2, fret: 3 },
    ],
  },
  {
    id: "sus",
    label: "Suspended Arpeggio Shapes",
    description: "Use the open low-D drone and add sus2/sus4 color above it.",
    points: [
      { string: 0, fret: 0 },
      { string: 1, fret: 2 },
      { string: 2, fret: 2 },
      { string: 3, fret: 0 },
    ],
  },
  {
    id: "tritone",
    label: "Dissonant Tritone Grids",
    description: "Map the unstable intervals that give grunge its bite.",
    points: [
      { string: 0, fret: 3 },
      { string: 1, fret: 5 },
      { string: 2, fret: 4 },
      { string: 3, fret: 6 },
    ],
  },
];

const STRING_NAMES = ["D (drop)", "A", "D", "G", "B", "E"];
const FRET_COUNT = 5;

export default function Drills() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallLesson, setPaywallLesson] = useState("");
  const [shape, setShape] = useState("power");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/lessons?category=guitar");
        setLessons(data);
      } catch {}
    })();
  }, []);

  const onClick = (l) => {
    if (l.locked) {
      setPaywallLesson(l.title);
      setPaywallOpen(true);
    } else {
      navigate(`/drills/${l.id}`);
    }
  };

  const free = lessons.filter((l) => !l.is_premium);
  const premium = lessons.filter((l) => l.is_premium);
  const activeShape = SHAPE_PRESETS.find((item) => item.id === shape) || SHAPE_PRESETS[0];

  return (
    <PageContainer testid="drills-page">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Guitar Curriculum</p>
        <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Drills</h1>
      </div>

      <div className="mt-8 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Drop D Geography</div>
            <div className="mt-1 font-gothic uppercase tracking-[0.12em] text-lg">Fretboard Shape Explorer</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-3))]">Low string offset: +2 frets vs standard E</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SHAPE_PRESETS.map((item) => (
            <button key={item.id} onClick={() => setShape(item.id)} className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] ${shape === item.id ? "bg-[hsl(var(--brand))]/20 text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--brand))]/35" : "bg-[hsl(var(--secondary))]/60 text-[hsl(var(--text-2))] ring-1 ring-[hsl(var(--border))]"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/25 p-3">
          <div className="text-sm text-[hsl(var(--text-2))]">{activeShape.description}</div>
          <svg viewBox="0 0 620 260" className="mt-4 w-full h-auto">
            <rect x="16" y="18" width="588" height="224" rx="16" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
            {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => (
              <line key={fretIndex} x1={60 + fretIndex * 96} y1="36" x2={60 + fretIndex * 96} y2="220" stroke="hsl(var(--border))" strokeWidth="1" />
            ))}
            {STRING_NAMES.map((stringName, stringIndex) => {
              const y = 58 + stringIndex * 28;
              return (
                <g key={stringName}>
                  <line x1="44" y1={y} x2="584" y2={y} stroke="hsl(var(--border))" strokeWidth="2" />
                  <text x="16" y={y + 5} textAnchor="middle" className="fill-[hsl(var(--text-3))] text-[11px] uppercase tracking-[0.16em]">{stringName}</text>
                  {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => {
                    const isActive = activeShape.points.some((point) => point.string === stringIndex && point.fret === fretIndex);
                    const x = 60 + fretIndex * 96;
                    return (
                      <g key={`${stringName}-${fretIndex}`}>
                        {fretIndex === 0 && <circle cx={x} cy={y} r="8" fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" />}
                        <circle cx={x} cy={y} r={isActive ? "10" : "6"} fill={isActive ? "hsl(var(--brand))" : "hsl(var(--card))"} stroke={isActive ? "hsl(var(--brand))" : "hsl(var(--border))"} />
                        {isActive && <text x={x} y={y + 4} textAnchor="middle" className="fill-[hsl(var(--brand-foreground))] text-[9px]">{fretIndex}</text>}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <h2 className="font-gothic uppercase tracking-[0.12em] mt-8 text-lg">Free Foundations</h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {free.map((l) => <LessonCard key={l.id} lesson={l} onClick={() => onClick(l)} />)}
      </div>

      <h2 className="font-gothic uppercase tracking-[0.12em] mt-10 text-lg">Premium Rituals</h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {premium.map((l) => <LessonCard key={l.id} lesson={l} onClick={() => onClick(l)} />)}
      </div>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} lessonTitle={paywallLesson} />
    </PageContainer>
  );
}
