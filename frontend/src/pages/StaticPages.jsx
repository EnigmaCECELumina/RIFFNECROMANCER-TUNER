import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Music2, Mail, MapPin, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PAGE_CONTENT = {
  about: {
    title: "The Story of RiffNecromancer",
    icon: Music2,
    content: (
      <>
        <p className="text-[hsl(var(--text-2))] leading-relaxed mb-6">
          RiffNecromancer Tuner & Tone Lab was originally architected and co-created by Curtis Aaron Kirchmayer. Curtis built the core of this tone engine to be a precise, uncompromising tool for guitarists who demand immediate accuracy.
        </p>
        <p className="text-[hsl(var(--text-2))] leading-relaxed mb-6">
          Following his sudden passing on May 21st, the project sat at a crossroads. Instead of letting the code disappear, his wife stepped in to take over development, untangle the infrastructure, and finish the application.
        </p>
        <p className="text-[hsl(var(--text-2))] leading-relaxed">
          RiffNecromancer is here because good engineering shouldn't belong to the dark. It is a fully completed, functional realization of the tool Curtis set out to build, maintained and deployed to keep the gear alive.
        </p>
      </>
    ),
  },
  contact: {
    title: "Get in Touch",
    icon: Mail,
    content: (
      <div className="space-y-6">
        <p className="text-[hsl(var(--text-2))] leading-relaxed">
          For technical support, billing inquiries, or bug reports regarding the Tuner & Tone Lab, please reach out via email:
        </p>
        <a 
          href="mailto:mj26.services@gmail.com" 
          className="inline-flex items-center gap-2 text-[hsl(var(--brand))] hover:text-[hsl(var(--brand))]/80 transition-colors"
        >
          <Mail size={16} />
          mj26.services@gmail.com
        </a>
        <div className="flex items-center gap-2 text-[hsl(var(--text-2))]">
          <MapPin size={16} className="text-[hsl(var(--text-3))]" />
          <span>Hamilton, Ontario, Canada</span>
        </div>
      </div>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    icon: Shield,
    content: (
      <div className="space-y-6">
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Data Collection</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            We only collect necessary authentication data, including your email address and securely hashed passwords. All payment processing is handled securely through Stripe, and we receive only secure processing tokens.
          </p>
        </section>
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Financial Data</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            We do not store financial information or credit card details on our servers. All payment data is processed directly by Stripe in compliance with PCI-DSS standards.
          </p>
        </section>
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Legal Compliance</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            We operate in full compliance with the Personal Information Protection and Electronic Documents Act (PIPEDA) of Canada and the provincial privacy laws of Ontario. Your data is stored securely and used only for the purposes of providing and improving our services.
          </p>
        </section>
      </div>
    ),
  },
  terms: {
    title: "Terms of Service",
    icon: FileText,
    content: (
      <div className="space-y-6">
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Service Provision</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            RiffNecromancer is provided "as-is" for your use. We strive to maintain high service availability and accuracy, but we make no warranties regarding uninterrupted access or error-free operation.
          </p>
        </section>
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Hardware Performance</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            We are not responsible for local hardware performance or audio latency caused by individual device setups. The tuner and audio processing features depend on your device's microphone, processor, and browser capabilities.
          </p>
        </section>
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Billing & Disputes</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            Digital access billing disputes can be managed via our contact portal. All subscription charges are processed through Stripe, and refund requests are handled on a case-by-case basis in accordance with our refund policy.
          </p>
        </section>
        <section>
          <h3 className="font-gothic uppercase text-lg tracking-[0.12em] text-[hsl(var(--text-1))] mb-3">Account Terms</h3>
          <p className="text-[hsl(var(--text-2))] leading-relaxed">
            You are responsible for maintaining the security of your account credentials. You may cancel your subscription at any time through your account settings, with access continuing until the end of your current billing period.
          </p>
        </section>
      </div>
    ),
  },
};

export default function StaticPages({ page }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageData = PAGE_CONTENT[page];
  const Icon = pageData?.icon;

  useEffect(() => {
    if (!pageData) {
      navigate("/");
    }
  }, [pageData, navigate]);

  if (!pageData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 max-w-6xl mx-auto flex items-center justify-between border-b border-[hsl(var(--border))]">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]">
            <Music2 size={16} />
          </span>
          <span className="font-gothic text-sm sm:text-base uppercase text-[hsl(var(--foreground))]">
            RiffNecromancer
          </span>
        </Link>
        <Button 
          variant="secondary" 
          onClick={() => navigate(user ? "/dashboard" : "/auth")}
          className="bg-[hsl(var(--secondary))]/70 ring-1 ring-[hsl(var(--border))] text-sm uppercase tracking-[0.18em]"
        >
          {user ? "Dashboard" : "Sign in"}
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] p-8 sm:p-12 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex h-10 w-10 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]">
              <Icon size={20} />
            </div>
            <h1 className="font-gothic text-2xl sm:text-3xl uppercase tracking-[0.12em] text-[hsl(var(--foreground))]">
              {pageData.title}
            </h1>
          </div>

          {/* Page Content */}
          <div className="text-sm sm:text-base">
            {pageData.content}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]/60"
          >
            ← Back to Home
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-[10px] text-[hsl(var(--text-3))] uppercase tracking-[0.2em]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
            <Link to="/about" className="hover:text-[hsl(var(--foreground))] transition-colors">About</Link>
            <span className="hidden sm:inline text-[hsl(var(--border))]">·</span>
            <Link to="/contact" className="hover:text-[hsl(var(--foreground))] transition-colors">Contact</Link>
            <span className="hidden sm:inline text-[hsl(var(--border))]">·</span>
            <Link to="/privacy" className="hover:text-[hsl(var(--foreground))] transition-colors">Privacy</Link>
            <span className="hidden sm:inline text-[hsl(var(--border))]">·</span>
            <Link to="/terms" className="hover:text-[hsl(var(--foreground))] transition-colors">Terms</Link>
          </div>
          <div>© 2026 RiffNecromancer · Forged for Drop D</div>
        </div>
      </footer>
    </div>
  );
}
