import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS, type Section } from "@/game/navigation";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

function sectionLink(s: Section) {
  if (s.id === "mandat") return { to: "/mandat" as const };
  if (s.id === "ma-ville") return { to: "/ma-ville" as const };
  if (s.id === "politique") return { to: "/politique" as const };
  if (s.id === "actualites") return { to: "/actualites" as const };
  if (s.id === "organisations") return { to: "/organisations" as const };
  if (s.id === "vie") return { to: "/vie" as const };
  if (s.id === "carte") return { to: "/carte" as const };
  if (s.id === "telephone") return { to: "/telephone" as const };
  if (s.id === "personnage") return { to: "/personnage" as const };
  if (s.id === "parametres") return { to: "/parametres" as const };
  return { to: "/section/$id" as const, params: { id: s.id } };
}

export function SectionLink({ section, className, children }: { section: Section; className?: string; children: React.ReactNode }) {
  const l = sectionLink(section);
  return "params" in l
    ? <Link to={l.to} params={l.params} className={className} activeProps={{ "data-active": "true" }}>{children}</Link>
    : <Link to={l.to} className={className} activeProps={{ "data-active": "true" }}>{children}</Link>;
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

const MOBILE_IDS = ["telephone", "personnage", "carte", "politique"];

export function GameShell() {
  const signOut = useSignOut();
  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/tableau-de-bord" className="mb-8 px-2 pt-2"><Logo size={30} /></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {SECTIONS.map((s) => (
            <SectionLink key={s.id} section={s}
              className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary">
              <s.icon className="h-5 w-5" />
              <span className="flex-1">{s.label}</span>
              {!s.available && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bientôt</span>}
            </SectionLink>
          ))}
        </nav>
        <button onClick={signOut} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <LogOut className="h-5 w-5" /> Se déconnecter
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border glass px-4 py-3 lg:hidden">
        <Link to="/tableau-de-bord"><Logo size={26} /></Link>
        <Link to="/parametres" className="rounded-xl px-3 py-2 text-sm text-muted-foreground">Paramètres</Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border glass pb-[env(safe-area-inset-bottom)] lg:hidden">
        <Link to="/tableau-de-bord" activeProps={{ "data-active": "true" }}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground data-[active=true]:text-primary">
          <Logo showText={false} size={22} /> Accueil
        </Link>
        {SECTIONS.filter((s) => MOBILE_IDS.includes(s.id)).map((s) => (
          <SectionLink key={s.id} section={s}
            className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground data-[active=true]:text-primary")}>
            <s.icon className="h-5 w-5" /> {s.label}
          </SectionLink>
        ))}
      </nav>
    </div>
  );
}
