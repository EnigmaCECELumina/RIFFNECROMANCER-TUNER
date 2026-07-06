import React from "react";
import { Lock, Flame, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const LessonCard = ({ lesson, onClick, locked }) => {
  const isLocked = locked ?? lesson.locked;
  return (
    <button
      onClick={onClick}
      data-testid={`lesson-card-${lesson.id}`}
      className={cn(
        "group relative w-full text-left rounded-[var(--radius)] bg-[hsl(var(--card))]/80 backdrop-blur-md",
        "ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--brand))]/35 transition-colors duration-200",
        "p-4 sm:p-5 flex flex-col gap-3 overflow-hidden",
        "[box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))] flex items-center gap-2">
            <span>{lesson.genre}</span><span aria-hidden>·</span><span>{lesson.level}</span>
          </div>
          <h3 className="mt-1 font-gothic text-base sm:text-lg uppercase truncate">{lesson.title}</h3>
        </div>
        {lesson.is_premium ? (
          isLocked ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30">
              <Lock size={10} /> Premium
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--brand))]/12 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/25">
              Premium
            </span>
          )
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--secondary))]/80 text-[hsl(var(--text-2))] ring-1 ring-[hsl(var(--border))]">
            Free
          </span>
        )}
      </div>

      <p className="text-xs sm:text-sm text-[hsl(var(--text-2))] line-clamp-3">{lesson.description}</p>

      <div className="mt-auto flex items-center gap-4 pt-2 text-[11px] text-[hsl(var(--text-3))] uppercase tracking-[0.16em]">
        {lesson.bpm ? (
          <span className="inline-flex items-center gap-1"><Flame size={11} /> {lesson.bpm} BPM</span>
        ) : null}
        <span className="inline-flex items-center gap-1"><Music2 size={11} /> {lesson.duration_minutes}m</span>
      </div>
    </button>
  );
};

export default LessonCard;
