import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, UserCircle } from "lucide-react";
import { useState } from "react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/explorator", label: "Explorator" },
  { to: "/glosar", label: "Bibliotecă" },
  { to: "/quiz", label: "Quiz" },
] as const;

export function Header() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="glass rounded-3xl mx-4 mt-4 px-5 py-3 flex items-center gap-4 fade-up">
        <Link to="/" aria-label="Santix" className="shrink-0">
          <span className="group flex items-center gap-2.5 rounded-2xl border border-primary/10 bg-white/[0.035] px-3 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.06]">
            <span className="relative flex size-7 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 transition-all duration-300 group-hover:border-primary/75 group-hover:bg-primary/15">
              <span className="size-2.5 rounded-[4px] bg-primary transition-all duration-300 group-hover:scale-110" />
            </span>
            <span className="text-sm font-black tracking-[0.12em] text-foreground transition-colors group-hover:text-primary">
              San<span className="text-primary">tix</span>
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-2xl text-sm font-medium tracking-tight transition-all duration-300 ${
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden max-w-[220px] items-center gap-2 rounded-2xl border border-primary/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground/85 md:flex">
                <UserCircle className="size-4 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 items-center gap-2 rounded-2xl border border-primary/15 bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:border-primary/35 hover:bg-primary/15"
              >
                <LogOut className="size-4" />
                Ieși
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-accent px-4 text-xs font-semibold text-primary-foreground shadow-[0_8px_22px_-12px_rgba(0,242,254,0.85)] transition-all hover:-translate-y-[1px] hover:shadow-[0_0_28px_rgba(0,242,254,0.22)] disabled:translate-y-0 disabled:opacity-60"
            >
              <UserCircle className="size-4" />
              Login
            </button>
          )}
        </div>
      </header>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
