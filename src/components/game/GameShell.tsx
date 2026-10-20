import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutGrid, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const term = normalize(search.trim());
  const visibleGroups = groups.map(g => ({ ...g, sections: g.sections.filter(s => !term || normalize(`${s.label} ${s.description} ${g.label}`).includes(term)) })).filter(g => g.sections.length);
  return (
    <>
      <label className="relative mb-3 block"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="h-12 pl-10" /></label>
      {!visibleGroups.length && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Aucune rubrique trouvée.</p>}
      {visibleGroups.map((g) => {
        const isOpen = !!term || (open[g.id] ?? false);
        return (
          <div key={g.id} className="mb-1">
            <Button variant="ghost" type="button" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}
              className="min-h-11 w-full justify-between rounded-xl px-3 text-left text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
              aria-expanded={isOpen}>
              {g.label}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
            {isOpen && (
              <div className={cn("flex flex-col gap-0.5", big && "grid grid-cols-2 gap-2")}>
                {g.sections.map((s) => (
                  <span key={s.id} onClick={onPick}>
                    <SectionLink section={s} className={cn(ITEM, "min-w-0", big && "min-h-16 border border-border bg-card py-3")}>
                      <s.icon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1 break-words">{s.label}</span>
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
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/tableau-de-bord" className="mb-8 px-2 pt-2"><Logo size={30} /></Link>
        <nav className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
          <GroupedMenu />
        </nav>
        <Button variant="ghost" onClick={signOut} className="h-11 justify-start gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <LogOut className="h-5 w-5" /> Se déconnecter
        </Button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border glass px-4 py-3 lg:hidden">
        <Link to="/tableau-de-bord"><Logo size={26} /></Link>
        <Link to="/parametres" className="flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 text-sm text-muted-foreground">Paramètres</Link>
      </header>

      <main className="game-content mx-auto min-w-0 max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <BirthdayBanner />
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border glass pb-[env(safe-area-inset-bottom)] lg:hidden">
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
        <Button variant="ghost" type="button" onClick={() => setMenuOpen(true)}
          className="h-16 flex-col gap-1 rounded-none px-0 text-[11px] text-muted-foreground">
          <LayoutGrid className="h-5 w-5" /> Menu
        </Button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Tout CIVITAS</SheetTitle></SheetHeader>
          <div className="mt-2"><GroupedMenu big onPick={() => setMenuOpen(false)} /></div>
          <Button variant="outline" onClick={signOut} className="mt-4 min-h-12 w-full gap-2 rounded-xl text-sm text-muted-foreground">
            <LogOut className="h-5 w-5" /> Se déconnecter
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
