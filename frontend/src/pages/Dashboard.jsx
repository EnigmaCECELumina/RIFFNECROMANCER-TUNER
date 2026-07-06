import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Gauge, Music2, Flame, Mic2, Sliders, CalendarDays, Crown, Play, Pause, Upload, Sparkles, MessageCircle, ArrowUp } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [communityFeed, setCommunityFeed] = useState([
    { id: 1, author: "Mara", text: "Tightened the low-D drone on the intro riff and it feels huge.", upvotes: 12, previewing: false },
    { id: 2, author: "Jules", text: "Added a darker reverb tail to the chorus and the room opened up.", upvotes: 8, previewing: false },
  ]);
  const [challenge, setChallenge] = useState({ title: "140 BPM Gallop Mastery", prompt: "Submit a 16-bar gallop take with a steady palm-muted accent." });
  const [uploadLabel, setUploadLabel] = useState("No file selected");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const [previewPulse, setPreviewPulse] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const [{ data: p }, { data: s }, { data: cal }] = await Promise.all([
          api.get("/progress/altar"),
          api.get("/sessions?limit=5"),
          api.get(`/history/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
        ]);
        setProgress(p);
        setSessions(s);
        if (cal?.stats) setStreak(cal.stats);
      } catch {}
    })();
  }, []);

  const summary = progress?.summary || { completed: 0, total: 0, completion_rate: 0 };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleSubmitEntry = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    setUploadLabel(file.name);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setCommunityFeed((prev) => [
      {
        id: Date.now(),
        author: user?.name || "You",
        text: `Shared a new riff take: ${file.name}`,
        upvotes: 1,
        previewing: false,
      },
      ...prev,
    ]);
    setIsSubmitting(false);
    event.target.value = "";
  };

  const handleUpvote = (id) => {
    setCommunityFeed((prev) => prev.map((item) => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item));
  };

  const handlePreview = (id) => {
    const next = previewingId === id ? null : id;
    setPreviewingId(next);
    setPreviewPulse(Boolean(next));
  };

  return (
    <PageContainer testid="dashboard-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Welcome back</p>
          <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">{user?.name || "Adept"}</h1>
        </div>
        {!user?.is_premium && (
          <Link to="/pricing" data-testid="dashboard-upgrade-link" className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--brand))] inline-flex items-center gap-1">
            <Crown size={12} /> Upgrade
          </Link>
        )}
      </div>

      {streak.current_streak > 0 && (
        <div
          data-testid="dashboard-streak-banner"
          className="mt-5 flex items-center gap-3 rounded-[var(--radius)] bg-[hsl(var(--brand))]/10 ring-1 ring-[hsl(var(--brand))]/30 p-4 [box-shadow:var(--shadow-inner-marble)]"
        >
          <Flame size={22} className="text-[hsl(var(--brand))] shrink-0" />
          <div>
            <div className="text-lg font-semibold tabular-nums leading-tight">
              {streak.current_streak} day{streak.current_streak === 1 ? "" : "s"}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">
              Current streak · Longest {streak.longest_streak}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="dashboard-quick-stats">
        <Stat label="Rituals" value={`${summary.completed}/${summary.total}`} icon={<Gauge size={14} />} />
        <Stat label="Streak" value={`${streak.current_streak}d`} icon={<Flame size={14} />} highlight={streak.current_streak > 0} />
        <Stat label="Sessions Logged" value={sessions.length} icon={<Music2 size={14} />} />
        <Stat label="Tier" value={user?.is_premium ? "Premium" : "Free"} icon={<Crown size={14} />} highlight={user?.is_premium} />
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <QuickCard to="/tuner" title="Tuner" desc="Drop D pitch detection with visual waveform" icon={<Gauge size={18} />} testid="quick-card-tuner" />
        <QuickCard to="/drills" title="Drills" desc="From chug to gallop – your rhythm arsenal" icon={<Music2 size={18} />} testid="quick-card-drills" />
        <QuickCard to="/vocal" title="Vocal Suite" desc="Warm-ups, pitch matching, grit control" icon={<Mic2 size={18} />} testid="quick-card-vocal" />
        <QuickCard to="/tone-lab" title="Tone Lab" desc="WaveShaper + EQ + cabinet simulation" icon={<Sliders size={18} />} testid="quick-card-tonelab" />
        <QuickCard to="/progress" title="Progress Altar" desc="Your completion timeline" icon={<Flame size={18} />} testid="quick-card-altar" />
        <QuickCard to="/history" title="History Calendar" desc="Sessions, streaks, monthly view" icon={<CalendarDays size={18} />} testid="quick-card-history" />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Weekly Riff Challenge</div>
              <div className="mt-1 font-gothic uppercase tracking-[0.12em] text-lg">{challenge.title}</div>
            </div>
            <div className="rounded-full bg-[hsl(var(--brand))]/12 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--brand))]">Live</div>
          </div>
          <p className="mt-3 text-sm text-[hsl(var(--text-2))]">{challenge.prompt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={handleUploadClick} className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--brand))] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--brand-foreground))]">
              <Upload size={14} /> {isSubmitting ? "Submitting..." : "Submit Entry"}
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleSubmitEntry} />
            <span className="text-[11px] text-[hsl(var(--text-3))]">{uploadLabel}</span>
          </div>
        </div>

        <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Community Feed</div>
              <div className="mt-1 font-gothic uppercase tracking-[0.12em] text-lg">Mock uploads & feedback</div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">{communityFeed.length} posts</div>
          </div>
          <div className="mt-4 space-y-3">
            {communityFeed.map((item) => (
              <div key={item.id} className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{item.author}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">{item.upvotes} upvotes</div>
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--text-2))]">{item.text}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => handlePreview(item.id)} className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-2))]">
                    {previewingId === item.id ? <Pause size={12} /> : <Play size={12} />} {previewingId === item.id ? "Pause" : "Preview"}
                  </button>
                  <button onClick={() => handleUpvote(item.id)} className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-2))]">
                    <ArrowUp size={12} /> Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-gothic uppercase tracking-[0.14em] text-lg">Recent Rituals</h2>
        <div className="mt-3 rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
          {sessions.length === 0 && (
            <div className="p-4 text-sm text-[hsl(var(--text-3))]" data-testid="dashboard-no-sessions">No sessions yet. Start a drill to begin.</div>
          )}
          {sessions.map((s) => (
            <div key={s.session_id} className="flex items-center justify-between p-4" data-testid={`recent-session-${s.session_id}`}>
              <div className="min-w-0">
                <div className="text-sm truncate">{s.lesson_title}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">{s.lesson_genre} · {Math.round((s.duration_seconds||0)/60)}m</div>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))] tabular-nums">{new Date(s.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

function Stat({ label, value, icon, highlight }) {
  return (
    <div className={`rounded-[var(--radius)] p-4 ring-1 ${highlight ? "bg-[hsl(var(--brand))]/10 ring-[hsl(var(--brand))]/30" : "bg-[hsl(var(--card))]/80 ring-[hsl(var(--border))]"} [box-shadow:var(--shadow-inner-marble)]`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{icon}{label}</div>
      <div className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function QuickCard({ to, title, desc, icon, testid }) {
  return (
    <Link to={to} data-testid={testid} className="group rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--brand))]/35 transition-colors p-5 flex flex-col gap-3 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(var(--brand))]/12 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/25">{icon}</div>
      <div>
        <div className="font-gothic uppercase tracking-[0.12em]">{title}</div>
        <div className="text-xs text-[hsl(var(--text-2))] mt-1">{desc}</div>
      </div>
    </Link>
  );
}
