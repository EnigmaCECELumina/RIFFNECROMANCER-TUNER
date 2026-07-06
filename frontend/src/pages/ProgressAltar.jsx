import React, { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { api } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Flame, CheckCircle2 } from "lucide-react";

export default function ProgressAltar() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/progress/altar");
        setData(data);
      } catch {}
    })();
  }, []);

  if (!data) return <PageContainer><div className="text-sm text-[hsl(var(--text-3))]">Loading…</div></PageContainer>;

  const { summary, by_category, timeline, lessons } = data;

  return (
    <PageContainer testid="progress-altar-page">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Completion Overview</p>
        <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Progress Altar</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Rituals Completed</div>
          <div className="mt-2 flex items-baseline gap-2" data-testid="altar-completion-counter">
            <span className="font-gothic text-4xl tabular-nums">{summary.completed}</span>
            <span className="text-[hsl(var(--text-3))] text-sm tabular-nums">/ {summary.total}</span>
          </div>
          <div className="mt-3 text-[11px] text-[hsl(var(--text-3))] uppercase tracking-[0.2em]">{summary.completion_rate}% complete</div>
        </div>
        {Object.entries(by_category).map(([cat, v]) => (
          <div key={cat} className="rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] p-5" data-testid={`altar-cat-${cat}`}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{cat}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-gothic text-3xl tabular-nums">{v.completed}</span>
              <span className="text-[hsl(var(--text-3))] text-sm tabular-nums">/ {v.total}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[hsl(var(--secondary))]/70 overflow-hidden">
              <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${v.total ? (v.completed / v.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
        <div className="flex items-center justify-between">
          <h2 className="font-gothic uppercase text-base tracking-[0.12em]">14-Day Timeline</h2>
          <Flame size={14} className="text-[hsl(var(--brand))]" />
        </div>
        <div className="mt-3 h-44" data-testid="progress-altar-timeline">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ left: -10, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="alt-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(8,10)} stroke="rgba(255,255,255,0.35)" fontSize={10} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.25)" fontSize={10} axisLine={false} tickLine={false} width={20}/>
              <Tooltip contentStyle={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="sessions" stroke="#DC2626" fill="url(#alt-grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="font-gothic uppercase tracking-[0.12em] mt-8 text-lg">Ritual Index</h2>
      <div className="mt-3 rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
        {lessons.map((l) => (
          <div key={l.lesson_id} className="flex items-center justify-between p-4" data-testid={`altar-lesson-${l.lesson_id}`}>
            <div className="min-w-0">
              <div className="text-sm truncate">{l.title}</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{l.category} · {l.is_premium ? "Premium" : "Free"}</div>
            </div>
            {l.completed ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30">
                <CheckCircle2 size={12} /> Done
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-md bg-[hsl(var(--secondary))]/70 text-[hsl(var(--text-2))] ring-1 ring-[hsl(var(--border))]">Pending</span>
            )}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
