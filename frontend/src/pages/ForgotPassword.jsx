import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      toast.success("If the email exists, a reset link will be sent");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        <Link to="/auth" className="inline-flex items-center gap-2 text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] transition-colors">
          <ArrowLeft size={16} />
          <span className="font-gothic text-sm uppercase">Back to Sign In</span>
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-2 pb-24">
        <div className="w-full max-w-md rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] backdrop-blur-md p-6 sm:p-7 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex h-8 w-8 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]"><Music2 size={18} /></span>
            <h1 className="font-gothic uppercase text-xl tracking-[0.12em]">Forgot Password</h1>
          </div>
          
          {!submitted ? (
            <>
              <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em] mb-6">
                Enter your email address and we'll send you a link to reset your password
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={busy} 
                  className="w-full bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]"
                >
                  {busy ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex h-12 w-12 rounded-full bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]">
                <Music2 size={24} />
              </div>
              <p className="text-sm text-[hsl(var(--text-2)]">
                Check your email for the password reset link
              </p>
              <Button 
                onClick={() => navigate("/auth")} 
                variant="secondary" 
                className="bg-[hsl(var(--secondary))]/80 ring-1 ring-[hsl(var(--border))] uppercase tracking-[0.18em]"
              >
                Return to Sign In
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
