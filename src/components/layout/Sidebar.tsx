import { Link, useLocation } from "@tanstack/react-router";
import { Boxes, BookOpen, Brain, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AiHistorySidebarBlock } from "@/components/layout/AiHistorySidebarBlock";
import { useLanguage } from "@/lib/useLanguage";

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();

  const nav = [
    { to: "/explorator", label: t.sidebar_explorator, icon: Boxes },
    { to: "/optica", label: t.sidebar_optica, icon: Eye },
    { to: "/glosar", label: t.sidebar_ghid, icon: BookOpen },
    { to: "/quiz", label: t.sidebar_quiz, icon: Brain },
  ] as const;

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col p-4 gap-4">
      {/* Logo */}
      <Link to="/" aria-label="Santix" className="glass glass-highlight rounded-3xl p-5 fade-up group block">
        <div className="relative flex items-center justify-center rounded-2xl border border-primary/10 bg-white/[0.035] px-5 py-5 transition-all duration-300 overflow-hidden group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
          {/* subtle radial glow behind text */}
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "radial-gradient(ellipse at 50% 120%, oklch(0.82 0.17 205 / 0.18) 0%, transparent 70%)" }} />
          <h1 className="relative text-2xl font-black leading-none tracking-[0.18em] text-foreground transition-colors group-hover:text-primary">
            San<span className="text-primary">tix</span>
          </h1>
        </div>
      </Link>

      {/* Navigation */}
      <nav
        className="glass glass-highlight rounded-3xl p-3 fade-up flex flex-col gap-1 relative"
        style={{ animationDelay: "60ms" }}
      >
        {nav.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl bg-primary/10"
                  style={{ boxShadow: "inset 0 0 0 1px oklch(0.82 0.17 205 / 0.22)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                style={active ? { background: "oklch(0.82 0.17 205 / 0.18)", boxShadow: "0 0 12px -2px oklch(0.82 0.17 205 / 0.5)" } : {}}>
                <Icon className={`size-[16px] ${active ? "text-primary" : ""}`} strokeWidth={2} />
              </span>
              <span className="relative z-10 tracking-tight">{label}</span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="relative z-10 ml-auto size-1.5 rounded-full bg-primary"
                    style={{ boxShadow: "0 0 10px oklch(0.86 0.13 205)" }}
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <AiHistorySidebarBlock />
    </aside>
  );
}
