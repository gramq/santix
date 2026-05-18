import { Link, useLocation } from "@tanstack/react-router";
import { Boxes, BookOpen, Brain } from "lucide-react";
import { AiHistorySidebarBlock } from "@/components/layout/AiHistorySidebarBlock";

const nav = [
  { to: "/explorator", label: "Explorator Anatomie", icon: Boxes },
  { to: "/glosar", label: "Ghid de utilizare", icon: BookOpen },
  { to: "/quiz", label: "Test Rapid", icon: Brain },
] as const;

export function Sidebar() {
  const location = useLocation();
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col p-4 gap-4">
      {/* Brand */}
      <Link to="/" aria-label="Santix" className="glass rounded-3xl p-5 fade-up">
        <div className="group flex items-center justify-center rounded-2xl border border-primary/10 bg-white/[0.035] px-5 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.06]">
          <h1 className="text-2xl font-black leading-none tracking-[0.18em] text-foreground transition-colors group-hover:text-primary">
            San<span className="text-primary">tix</span>
          </h1>
        </div>
      </Link>

      {/* Nav */}
      <nav
        className="glass rounded-3xl p-3 fade-up flex flex-col gap-1"
        style={{ animationDelay: "60ms" }}
      >
        {nav.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium spring-hover ${
                active
                  ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_oklch(0.62_0.20_255_/_0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              }`}
            >
              <Icon className={`size-[18px] ${active ? "text-primary" : ""}`} strokeWidth={2} />
              <span className="tracking-tight">{label}</span>
              {active && (
                <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--bone-glow)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <AiHistorySidebarBlock />
    </aside>
  );
}
