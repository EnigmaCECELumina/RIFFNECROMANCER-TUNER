import React, { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Flame, Award } from "lucide-react";

function monthName(m) {
  return ["January","February","March","April","May","June","July","August","September","October","November","December"][m-1];
}

export default function History() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/history/calendar?year=${year}&month=${month}`);
        setData(data);
      } catch {}
    })();
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); }
  };

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const startDow = first.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const dayMap = useMemo(() => {
    const m = new Map();
    (data?.days || []).forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  const stats = data?.stats || { total_sessions: 0, total_minutes: 0, current_streak: 0, longest_streak: 0 };

  return (
    <PageContainer testid="history-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Consistency Ledger</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">History</h1>
        </div>
      </div>

      {/* Stats blocks */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="Total Sessions" value={stats.total_sessions} icon={<CalIcon size={14} />} testid="history-total-sessions" />
        <StatBlock label="Total Time" value={`${stats.total_minutes}m`} icon={<CalIcon size={14} />} testid="history-total-minutes" />
        <StatBlock label="Current Streak" value={`${stats.current_streak}d`} icon={<Flame size={14} />} testid="history-current-streak" highlight />
        <StatBlock label="Longest Streak" value={`${stats.longest_streak}d`} icon={<Award size={14} />} testid="history-longest-streak" />
      </div>

      {/* Calendar header (3-col grid: prev / center / next) — won't collide on narrow viewports */}
      <div className="mt-8 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-4 sm:p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2 px-1" data-testid="history-calendar-header">
          <button onClick={prevMonth} aria-label="Previous month" data-testid="history-prev-month" className="h-10 w-12 rounded-md bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] inline-flex items-center justify-center">
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0 text-center font-gothic tracking-[0.18em] uppercase text-sm truncate" data-testid="history-month-label">
            {monthName(month)} {year}
          </div>
          <button onClick={nextMonth} aria-label="Next month" data-testid="history-next-month" className="h-10 w-12 rounded-md bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] inline-flex items-center justify-center">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1" data-testid="history-calendar-grid">
          {grid.map((d, i) => {
            if (d === null) return <div key={i} className="h-12 sm:h-14 rounded-md bg-transparent" />;
            const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const entry = dayMap.get(key);
            return (
              <div
                key={i}
                title={entry ? `${entry.sessions} ritual${entry.sessions > 1 ? "s" : ""} · ${Math.round(entry.duration_seconds / 60)}m` : undefined}
                data-testid={`history-day-${key}`}
                className={`relative h-12 sm:h-14 rounded-md flex items-center justify-center text-sm tabular-nums ${entry ? "bg-[hsl(var(--brand))]/8 ring-1 ring-[hsl(var(--brand))]/25 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface-2))]/40 text-[hsl(var(--text-2))]"}`}
              >
                {d}
                {entry && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand))]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}

function StatBlock({ label, value, icon, testid, highlight }) {
  return (
    <div className={`rounded-[var(--radius)] p-4 ring-1 ${highlight ? "bg-[hsl(var(--brand))]/10 ring-[hsl(var(--brand))]/30" : "bg-[hsl(var(--card))]/80 ring-[hsl(var(--border))]"} [box-shadow:var(--shadow-inner-marble)]`} data-testid={testid}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{icon} {label}</div>
      <div className="mt-2 text-2xl tabular-nums">{value}</div>
    </div>
  );
}
