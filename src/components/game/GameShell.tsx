import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutGrid, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS, groupedSections, type Section } from "@/game/navigation";
import { Logo } from "./Logo";
import { BirthdayBanner } from "./BirthdayBanner";
import { cn } from "@/lib/utils";

function sectionLink(s: Section) {
  // Every available section has its own page at /<id>; others show the "coming soon" screen.
  if (s.available) return { to: `/${s.id}` as "/monde" };
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

const MOBILE_IDS = ["telephone", "carte", "politique"];

const ITEM = "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary";

function GroupedMenu({ onPick, big }: { onPick?: () => void; big?: boolean }) {
  const groups = groupedSections();
  const [open, setOpen] = useState<Record<string, boolean>>({ moi: true, quotidien: true });
  return (
    <>
      {groups.map((g) => {
        const isOpen = open[g.id] ?? false;
        return (
          <div key={g.id} className="mb-1">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              aria-expanded={isOpen}>
              {g.label}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className={cn("flex flex-col gap-0.5", big && "grid grid-cols-2 gap-2")}>
                {g.sections.map((s) => (
                  <span key={s.id} onClick={onPick}>
                    <SectionLink section={s} className={cn(ITEM, big && "min-h-14 border border-border bg-card")}>
                      <s.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{s.label}</span>
                    </SectionLink>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function GameShell() {
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/tableau-de-bord" className="mb-8 px-2 pt-2"><Logo size={30} /></Link>
        <nav className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
          <GroupedMenu />
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
        <BirthdayBanner />
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
        <button type="button" onClick={() => setMenuOpen(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <LayoutGrid className="h-5 w-5" /> Menu
        </button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Tout CIVITAS</SheetTitle></SheetHeader>
          <div className="mt-2"><GroupedMenu big onPick={() => setMenuOpen(false)} /></div>
          <button onClick={signOut} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground">
            <LogOut className="h-5 w-5" /> Se déconnecter
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
