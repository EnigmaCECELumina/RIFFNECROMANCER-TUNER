import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Music2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Sanctum" },
  { to: "/tuner", label: "Tuner" },
  { to: "/drills", label: "Drills" },
  { to: "/vocal", label: "Vocal" },
  { to: "/tone-lab", label: "Tone Lab" },
  { to: "/progress", label: "Altar" },
  { to: "/history", label: "History" },
  { to: "/diagnostics", label: "Diag" },
];

export const AppNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(var(--background))]/75 border-b border-[hsl(var(--border))]"
      data-testid="app-nav"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2" data-testid="nav-brand">
          <span className="inline-flex h-7 w-7 rounded-md bg-[hsl(var(--brand))]/15 ring-1 ring-[hsl(var(--brand))]/30 items-center justify-center text-[hsl(var(--brand))]">
            <Music2 size={16} />
          </span>
          <span className="font-gothic text-sm sm:text-base text-[hsl(var(--foreground))] uppercase">
            RiffNecromancer
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-link-${n.to.replace("/", "")}`}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 text-xs uppercase tracking-[0.16em] rounded-md transition-colors duration-200",
                  isActive
                    ? "text-[hsl(var(--foreground))] bg-[hsl(var(--card))]/80 ring-1 ring-[hsl(var(--brand))]/30"
                    : "text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]/60",
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user?.is_premium ? (
            <span
              className="hidden sm:inline-flex items-center text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30"
              data-testid="premium-pill"
            >
              Premium
            </span>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/pricing")}
              className="hidden sm:inline-flex bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90 text-[hsl(var(--brand-foreground))]"
              data-testid="upgrade-button"
            >
              Upgrade
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="md:hidden p-2 rounded-md hover:bg-[hsl(var(--accent))]/60 text-[hsl(var(--text-2))]"
                data-testid="mobile-menu-button"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[hsl(var(--popover))] border-l border-[hsl(var(--border))]">
              <SheetHeader>
                <SheetTitle className="font-gothic uppercase tracking-[0.12em]">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    data-testid={`mobile-nav-${n.to.replace("/", "")}`}
                    className={({ isActive }) =>
                      cn(
                        "px-3 py-2 rounded-md text-sm uppercase tracking-[0.16em]",
                        isActive
                          ? "bg-[hsl(var(--card))]/80 text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--brand))]/25"
                          : "text-[hsl(var(--text-2))] hover:bg-[hsl(var(--accent))]/50",
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
                <button
                  onClick={() => { navigate("/pricing"); setOpen(false); }}
                  className="mt-2 px-3 py-2 rounded-md text-sm bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] uppercase tracking-[0.16em]"
                  data-testid="mobile-pricing-button"
                >
                  Pricing
                </button>
                <button
                  onClick={() => { navigate("/settings"); setOpen(false); }}
                  className="px-3 py-2 rounded-md text-sm bg-[hsl(var(--secondary))]/70 text-[hsl(var(--foreground))] uppercase tracking-[0.16em] ring-1 ring-[hsl(var(--border))]"
                  data-testid="mobile-settings-button"
                >
                  Settings
                </button>
                <button
                  onClick={async () => { await logout(); setOpen(false); navigate("/"); }}
                  className="px-3 py-2 rounded-md text-sm bg-transparent text-[hsl(var(--text-2))] hover:text-[hsl(var(--foreground))] uppercase tracking-[0.16em] flex items-center gap-2"
                  data-testid="mobile-logout-button"
                >
                  <X size={14} /> Logout
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default AppNav;
