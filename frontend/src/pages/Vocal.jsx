import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import LessonCard from "@/components/LessonCard";
import PaywallDialog from "@/components/PaywallDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Vocal() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallLesson, setPaywallLesson] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/lessons?category=vocal");
        setLessons(data);
      } catch (e) {
        console.error("Failed to load vocal lessons", e);
        toast.error("Could not load vocal rituals");
      }
    })();
  }, []);

  const onClick = (l) => {
    if (l.locked) {
      setPaywallLesson(l.title);
      setPaywallOpen(true);
    } else {
      navigate(`/vocal/${l.id}`);
    }
  };

  return (
    <PageContainer testid="vocal-page">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">Vocal Suite</p>
        <h1 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.1em]">Voice Rituals</h1>
        <p className="text-sm text-[hsl(var(--text-2))] mt-2 max-w-2xl">Warm-ups, pitch matching, grit control, and breath endurance for alt-rock, grunge, and metal singers.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((l) => <LessonCard key={l.id} lesson={l} onClick={() => onClick(l)} />)}
      </div>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} lessonTitle={paywallLesson} />
    </PageContainer>
  );
}
