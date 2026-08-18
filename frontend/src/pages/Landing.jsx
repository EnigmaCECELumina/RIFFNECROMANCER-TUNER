import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music2, Lock, Sparkles, Eye, Ear } from "lucide-react";
import { Button } from "@/components/ui/button";

const FREE_PREVIEW = [
  { title: "Intro to Drop D", level: "Beginner", desc: "Re-tune. Find the geometry of the new low string." },
  { title: "Heavy Chugging", level: "Beginner · Metal", desc: "Tight palm-muted low-D 8th notes." },
  { title: "Suspended Atmosphere", level: "Beginner · Alt-Rock", desc: "Sus2 and Sus4 dream voicings." },
];

const PREMIUM_PREVIEW = [
  { title: "Galloping Shadows", level: "Intermediate · Metal · 140 BPM" },
  { title: "Tremolo Picking Fury", level: "Advanced · Metal · 160 BPM" },
  { title: "Grit Resonance Control", level: "Vocal · Grunge" },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-[hsl(var(--border))] py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left gap-4 group">
        <span className="text-sm font-medium text-[hsl(var(--text-1))] group-hover:text-[hsl(var(--brand))] transition-colors">{q}</span>
        <span className="text-[hsl(var(--text-3))] text-lg leading-none shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="mt-3 text-sm text-[hsl(var(--text-2))] leading-relaxed">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative">
      {/* Header — logo only, minimal design */}
      <header className="px-4 sm:px-6 py-4 max-w-6xl mx-auto flex items-center">
        <Link to="/" className="flex items-center gap-2" data-testid="landing-brand">
          <span className="inline-flex h-7 w-7 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]">
            <Music2 size={16} />
          </span>
          <span className="font-gothic text-sm sm:text-base uppercase tracking-[0.08em]">RIFFNECROMANCER</span>
        </Link>
      </header>

      {/* Hero — text left, large vertically aligned headstock right */}
      <section className="obsidian-veil border-b border-[hsl(var(--border))] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left column — text */}
            <div className="max-w-2xl relative z-20">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[hsl(var(--brand))] mb-4">
                <span className="text-[hsl(var(--brand))]">*</span> Premium Drop D Training
              </div>
              <h1 className="font-gothic text-4xl sm:text-5xl md:text-6xl leading-tight uppercase">
                CONJURE HEAVIER RIFFS.<br /><span className="text-[hsl(var(--brand))]">IN DROP D.</span>
              </h1>
              <p className="mt-5 text-[hsl(var(--text-2))] text-sm sm:text-base max-w-xl leading-relaxed">
                A ritualistic training toolkit for alt-rock, grunge, and metal players. Real-time tuner, drill mechanics from chug to gallop, vocal control, and a live Tone Lab with WaveShaper distortion.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button onClick={() => navigate("/auth?mode=register")} data-testid="landing-hero-register" className="bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand))]/90 px-6 py-5 text-sm uppercase tracking-[0.18em]">
                  START FREE
                </Button>
                <Button variant="secondary" onClick={() => navigate("/auth")} data-testid="landing-hero-signin" className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] px-6 py-5 text-sm uppercase tracking-[0.18em]">
                  SIGN IN
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-xs text-[hsl(var(--text-3))]">
                <span className="inline-flex items-center gap-1"><Ear size={12} /> Deaf / HoH visual mode</span>
                <span className="inline-flex items-center gap-1"><Eye size={12} /> Screen-reader friendly</span>
              </div>
            </div>
            {/* Right column — standalone headstock with crimson glow */}
            <div className="hidden md:flex items-center justify-end relative z-10">
              <img 
                src="/headstock-clean.png" 
                alt="Professional matte black guitar headstock" 
                className="w-full h-auto object-contain max-w-[450px] md:max-w-[550px]"
                style={{ 
                  transform: 'rotate(-8deg) scale(1.05)',
                  filter: 'grayscale(100%) contrast(1.1) brightness(0.9) drop-shadow(0px 0px 35px rgba(220, 20, 60, 0.75))',
                  opacity: 0.9
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Free Foundations */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em]">Free Foundations</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">No card needed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FREE_PREVIEW.map((c) => (
            <div key={c.title} className="rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{c.level}</div>
              <h3 className="mt-1 font-gothic uppercase text-lg">{c.title}</h3>
              <p className="mt-2 text-sm text-[hsl(var(--text-2))]">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Premium Rituals */}
        <div className="flex items-end justify-between mt-14 mb-6">
          <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em]">Premium Rituals</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--brand))] inline-flex items-center gap-1"><Lock size={10} /> Unlocks with subscription</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PREMIUM_PREVIEW.map((c) => (
            <div key={c.title} className="relative rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--brand))]/25 p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30 px-2 py-0.5 rounded-full">
                <Lock size={10} /> Premium
              </span>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">{c.level}</div>
              <h3 className="mt-1 font-gothic uppercase text-lg">{c.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[hsl(var(--border))]">
        <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em] mb-8">What Players Are Saying</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { quote: "The Gallop drill finally got my picking speed up to 160 BPM. Absolute dark magic.", author: "Dave R.", title: "Metal Guitarist, 8 years" },
            { quote: "The tuner alone is worth it — instant, visual, no lag. My old clip-on is in the trash.", author: "Mara S.", title: "Alt-Rock Songwriter" },
            { quote: "I've tried three other apps. This one actually sounds like it was built by someone who plays.", author: "Kael T.", title: "Grunge / Heavy Rock Player" },
          ].map((t) => (
            <div key={t.author} className="rounded-[var(--radius)] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--border))] p-5 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)] flex flex-col gap-3">
              <p className="text-sm text-[hsl(var(--text-2))] italic leading-relaxed">"{t.quote}"</p>
              <div>
                <div className="text-xs font-semibold text-[hsl(var(--text-1))]">{t.author}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--text-3))]">{t.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Previews — Tuner + Tone Lab mockups */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[hsl(var(--border))]">
        <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em] mb-2">Inside the Ritual</h2>
        <p className="text-sm text-[hsl(var(--text-2))] mb-8">A look at the tools forged into the experience.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tuner Preview */}
          <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--brand))]/25 p-6 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--brand))] mb-3">Live Chromatic Tuner</div>
            {/* Simulated tuner UI */}
            <div className="bg-black/30 rounded-lg p-4 mb-3 flex flex-col items-center gap-2">
              <div className="font-gothic text-5xl text-[hsl(var(--brand))] tracking-widest">D</div>
              <div className="w-full bg-[hsl(var(--border))] rounded-full h-1.5 relative">
                <div className="absolute left-1/2 -translate-x-1/2 w-1 h-3 bg-[hsl(var(--brand))] rounded-full -top-[3px]"></div>
                <div className="h-1.5 bg-[hsl(var(--brand))]/60 rounded-full" style={{width: '52%'}}></div>
              </div>
              <div className="text-[10px] text-[hsl(var(--text-3))] uppercase tracking-widest">In Tune · Drop D</div>
            </div>
            <p className="text-xs text-[hsl(var(--text-2))]">Real-time pitch detection via your device microphone. Works for acoustic and electric guitars.</p>
          </div>
          {/* Tone Lab Preview */}
          <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--brand))]/25 p-6 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--brand))] mb-3">Tone Lab · WaveShaper Distortion</div>
            {/* Simulated waveform */}
            <div className="bg-black/30 rounded-lg p-4 mb-3">
              <svg viewBox="0 0 200 60" className="w-full h-12 text-[hsl(var(--brand))]">
                <polyline points="0,30 15,10 30,50 45,5 60,55 75,15 90,45 105,8 120,52 135,18 150,42 165,12 180,48 200,30" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="flex justify-between text-[9px] text-[hsl(var(--text-3))] uppercase tracking-widest mt-1">
                <span>Gain: 78%</span><span>Tone: Mid+</span><span>Output: Hot</span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--text-2))]">Shape your guitar signal live with the WaveShaper distortion engine. Metal, grunge, and alt-rock presets included.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[hsl(var(--border))]">
        <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em] mb-6">Frequently Asked</h2>
        <div className="max-w-2xl">
          <FAQItem q="Do I need a special cable to connect my guitar?" a="No cable required for the tuner or drill playback — your device microphone handles pitch detection. If you want to route your guitar signal through the Tone Lab for live distortion shaping, a standard guitar-to-USB or guitar-to-3.5mm adapter will work." />
          <FAQItem q="Does the tuner work with acoustic guitars?" a="Yes. The chromatic tuner uses your device's built-in microphone, so it picks up any acoustic instrument clearly. Electric guitars work best plugged in via an audio interface, though the mic method works in a quiet room." />
          <FAQItem q="Can I cancel my subscription at any time?" a="Absolutely. There are no contracts, no lock-in periods. Cancel from your account settings and you will retain access until the end of your current billing period." />
          <FAQItem q="What genres does the curriculum cover?" a="The drill catalog spans Drop D metal, grunge, and alt-rock — from palm-muted chugs and gallop rhythms to suspended chord voicings and dissonant intervals. The vocal suite covers grit technique, pitch matching, and breath control." />
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-[hsl(var(--border))]">
        <div className="grid md:grid-cols-2 gap-6 items-end">
          <div>
            <h2 className="font-gothic uppercase text-xl sm:text-2xl tracking-[0.12em]">One subscription. Every ritual.</h2>
            <p className="mt-3 text-[hsl(var(--text-2))] text-sm">Tuner and onboarding rituals are free. Unlock advanced drills, the vocal suite, and Tone Lab presets when you're ready.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-start md:justify-end">
            <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-5 min-w-[180px]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--text-3))]">Monthly</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">$7<span className="text-xs text-[hsl(var(--text-3))]">/mo</span></div>
            </div>
            <div className="rounded-[var(--radius)] bg-[hsl(var(--brand))]/10 ring-1 ring-[hsl(var(--brand))]/35 p-5 min-w-[180px] crimson-breathe">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--brand))]">Annual · save 30%</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">$59<span className="text-xs text-[hsl(var(--text-3))]">/yr</span></div>
            </div>
          </div>
        </div>
        {/* Bottom CTA */}
        <div className="mt-8">
          <Button onClick={() => navigate("/auth?mode=register")} className="bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand))]/90 px-6 py-5 text-sm uppercase tracking-[0.18em]" data-testid="landing-bottom-cta">
            Create account
          </Button>
        </div>
      </section>

      {/* Dedication Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[hsl(var(--border))]">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-gothic uppercase text-2xl sm:text-3xl tracking-[0.12em] text-[hsl(var(--brand))] mb-6">In Loving Memory</h2>
          <div className="text-sm text-[hsl(var(--text-2))] leading-relaxed space-y-4">
            <p>
              RIFFNECROMANCER is dedicated to my beloved husband of 15 years, whose vision and passion brought this entire project to life. Every idea, feature, and line of intent was his—I simply picked up the keyboard to help bring his dream into reality.
            </p>
            <p>
              This app was born from a deep love for music and the low-tuned resonance of Drop D tuning—a passion he shared with my late uncle. After my uncle passed, my husband inherited his guitar and was inspired to create a tool to help musicians connect with their instruments. Though he is dearly missed, his legacy lives on through our two sons, who have picked up their father's guitar to keep the music playing.
            </p>
            <p className="text-[hsl(var(--text-3))] text-xs uppercase tracking-[0.18em]">
              Special thanks to the Emergent Agent platform for providing the initial spark and foundational AI toolsets during early development.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-12 bg-[hsl(var(--card))]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Product */}
            <div>
              <h3 className="font-gothic uppercase text-xs tracking-[0.2em] text-[hsl(var(--brand))] mb-4">Product</h3>
              <ul className="space-y-2 text-xs text-[hsl(var(--text-2))]">
                <li><Link to="/pricing" className="hover:text-[hsl(var(--foreground))] transition-colors">Pricing</Link></li>
                <li><Link to="/about" className="hover:text-[hsl(var(--foreground))] transition-colors">About</Link></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h3 className="font-gothic uppercase text-xs tracking-[0.2em] text-[hsl(var(--brand))] mb-4">Legal</h3>
              <ul className="space-y-2 text-xs text-[hsl(var(--text-2))]">
                <li><Link to="/privacy" className="hover:text-[hsl(var(--foreground))] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-[hsl(var(--foreground))] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="font-gothic uppercase text-xs tracking-[0.2em] text-[hsl(var(--brand))] mb-4">Contact</h3>
              <ul className="space-y-2 text-xs text-[hsl(var(--text-2))]">
                <li><a href="mailto:support@riffnecromancer.com" className="hover:text-[hsl(var(--foreground))] transition-colors">support@riffnecromancer.com</a></li>
                <li>Hamilton, Ontario, Canada</li>
              </ul>
            </div>
          </div>
          
          {/* Accessibility Notice */}
          <div className="border-t border-[hsl(var(--border))] pt-6 mb-6">
            <p className="text-xs text-[hsl(var(--text-2))] leading-relaxed text-center">
              <span className="font-semibold text-[hsl(var(--brand))]">Accessibility:</span> RIFFNECROMANCER is committed to WCAG 2.1 Level AA compliance. Our interface features screen-reader friendly navigation, high-contrast visual modes for low-vision users, visual pitch indicators for deaf musicians, and customizable audio/visual feedback for hard-of-hearing players.
            </p>
          </div>

          {/* Copyright & Trademark */}
          <div className="border-t border-[hsl(var(--border))] pt-8 text-center">
            <div className="text-[10px] text-[hsl(var(--text-3))] uppercase tracking-[0.2em] space-y-2">
              <p>© 2026 RIFFNECROMANCER. All Rights Reserved.</p>
              <p>RIFFNECROMANCER™ and associated logos are trademarks of the creator.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
