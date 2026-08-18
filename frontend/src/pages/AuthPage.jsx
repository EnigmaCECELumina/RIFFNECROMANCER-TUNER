import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const { loginWithEmail, registerWithEmail, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.onboarded ? "/dashboard" : "/onboarding", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await loginWithEmail(email, password);
      toast.success("Welcome back");
      navigate(u.onboarded ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await registerWithEmail(email, password, name || undefined);
      toast.success("Account created");
      navigate(u.onboarded ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setBusy(false); }
  };

  const startGoogle = () => {
    // Use direct Google OAuth via backend
    window.location.href = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        <Link to="/" className="inline-flex items-center gap-2" data-testid="auth-brand-back">
          <span className="inline-flex h-7 w-7 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]"><Music2 size={16} /></span>
          <span className="font-gothic text-sm uppercase">RiffNecromancer</span>
        </Link>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-2 pb-24">
        <div className="w-full max-w-md rounded-[var(--radius)] bg-[hsl(var(--card))]/85 ring-1 ring-[hsl(var(--border))] backdrop-blur-md p-6 sm:p-7 [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]">
          <h1 className="font-gothic uppercase text-xl tracking-[0.12em]">Enter the Sanctum</h1>
          <p className="mt-1 text-xs text-[hsl(var(--text-3))] uppercase tracking-[0.2em]">Sign in to continue your rituals</p>

          <Tabs value={tab} onValueChange={setTab} className="mt-5">
            <TabsList className="bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))]">
              <TabsTrigger value="login" data-testid="auth-tab-login" className="data-[state=active]:bg-[hsl(var(--card))]/90 data-[state=active]:text-[hsl(var(--foreground))] uppercase tracking-[0.16em] text-xs">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="auth-tab-register" className="data-[state=active]:bg-[hsl(var(--card))]/90 data-[state=active]:text-[hsl(var(--foreground))] uppercase tracking-[0.16em] text-xs">Create</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-5 space-y-4" data-testid="auth-login-form">
                <div>
                  <Label htmlFor="login-email" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Email</Label>
                  <Input id="login-email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" data-testid="login-email-input" />
                </div>
                <div>
                  <Label htmlFor="login-password" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Password</Label>
                  <Input id="login-password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" data-testid="login-password-input" />
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-[10px] text-[hsl(var(--brand))] hover:underline uppercase tracking-[0.18em]">Forgot Password?</Link>
                </div>
                <Button type="submit" disabled={busy} data-testid="login-submit-button" className="w-full bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
                  {busy ? "Summoning…" : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="mt-5 space-y-4" data-testid="auth-register-form">
                <div>
                  <Label htmlFor="reg-name" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Name (optional)</Label>
                  <Input id="reg-name" value={name} onChange={(e)=>setName(e.target.value)} className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" data-testid="register-name-input" />
                </div>
                <div>
                  <Label htmlFor="reg-email" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Email</Label>
                  <Input id="reg-email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" data-testid="register-email-input" />
                </div>
                <div>
                  <Label htmlFor="reg-password" className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--text-3))]">Password</Label>
                  <Input id="reg-password" type="password" minLength={6} required value={password} onChange={(e)=>setPassword(e.target.value)} className="bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]" data-testid="register-password-input" />
                </div>
                <Button type="submit" disabled={busy} data-testid="register-submit-button" className="w-full bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))] uppercase tracking-[0.18em]">
                  {busy ? "Forging…" : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[hsl(var(--border))]" />
            <span className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--text-3))]">or</span>
            <div className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>

          <Button onClick={startGoogle} variant="secondary" data-testid="google-oauth-button" className="w-full bg-[hsl(var(--secondary))]/80 ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] uppercase tracking-[0.18em]">
            Continue with Google
          </Button>
        </div>
      </main>
    </div>
  );
}
