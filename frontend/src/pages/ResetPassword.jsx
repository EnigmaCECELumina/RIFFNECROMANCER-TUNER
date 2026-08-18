import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Music2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("loading"); // loading, valid, invalid, success

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    // Token exists, allow user to proceed
    setStatus("valid");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setStatus("success");
      toast.success("Password reset successfully");
      setTimeout(() => navigate("/auth"), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Password reset failed");
      setStatus("invalid");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex h-12 w-12 rounded-full bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))] animate-spin">
            <Music2 size={24} />
          </div>
          <p className="font-gothic uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Validating reset token…</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
          <Link to="/auth" className="inline-flex items-center gap-2 text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-gothic text-sm uppercase">Back to Sign In</span>
          </Link>
        </div>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-2 pb-24">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] backdrop-blur-md p-6 sm:p-7 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)] text-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-red-500/10 ring-1 ring-red-500/30 items-center justify-center text-red-500 mb-4">
              <AlertCircle size={32} />
            </div>
            <h1 className="font-gothic uppercase text-xl tracking-[0.12em] mb-2">Invalid Reset Link</h1>
            <p className="text-sm text-[hsl(var(--text-2)] mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button 
              onClick={() => navigate("/forgot-password")} 
              className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]"
            >
              Request New Link
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
          <Link to="/auth" className="inline-flex items-center gap-2 text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-gothic text-sm uppercase">Back to Sign In</span>
          </Link>
        </div>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-2 pb-24">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] backdrop-blur-md p-6 sm:p-7 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)] text-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-green-500/10 ring-1 ring-green-500/30 items-center justify-center text-green-500 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="font-gothic uppercase text-xl tracking-[0.12em] mb-2">Password Reset Successful</h1>
            <p className="text-sm text-[hsl(var(--text-2)] mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]"
            >
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

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
            <h1 className="font-gothic uppercase text-xl tracking-[0.12em]">Reset Password</h1>
          </div>
          
          <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em] mb-6">
            Enter your new password below
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">New Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                minLength={6}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" 
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                required 
                minLength={6}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" 
              />
            </div>
            <Button 
              type="submit" 
              disabled={busy} 
              className="w-full bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]"
            >
              {busy ? "Resetting…" : "Reset Password"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
