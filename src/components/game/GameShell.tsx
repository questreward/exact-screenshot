import { GameContext } from "./GameContext";
import { PageIntro } from "@/components/game/PageIntro";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutGrid, Menu, ArrowLeft, Search, Home, User, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS, groupedSections, hubSections, LIFE_HUB, CITY_HUB, type Section } from "@/game/navigation";
import { Logo } from "./Logo";
import { BirthdayBanner } from "./BirthdayBanner";
import { cn } from "@/lib/utils";
import { SalaryMoment } from "./MoneyMonth";
import { GameSpeed } from "./GameSpeed";

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


const ITEM = "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary";

function GroupedMenu({ onPick, big }: { onPick?: () => void; big?: boolean }) {
  const groups = groupedSections();
  const [search, setSearch] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const term = normalize(search.trim());
  const visibleGroups = groups.map(g => ({ ...g, sections: g.sections.filter(s => !term || normalize(`${s.label} ${s.description} ${g.label}`).includes(term)) })).filter(g => g.sections.length);
  return (
    <>
      <label className="relative mb-3 block"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="h-12 pl-10" /></label>
      {!visibleGroups.length && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Aucune rubrique trouvée.</p>}
      {visibleGroups.map((g) => {
        const isOpen = true;
        return (
          <div key={g.id} className="mb-1">
            <h2 className="mb-1 mt-4 px-3 text-xs font-semibold text-muted-foreground">{g.label}</h2>
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

const TAB = "flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-none px-0 text-[11px] font-medium text-muted-foreground transition-colors active:scale-95 data-[active=true]:text-primary";

function HubSheet({ open, onOpenChange, title, intro, ids, extra }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; intro: string; ids: string[]; extra?: React.ReactNode }) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle className="font-display text-xl">{title}</SheetTitle></SheetHeader>
        <p className="mb-3 text-sm text-muted-foreground">{intro}</p>
        <div className="grid grid-cols-2 gap-2">
          {hubSections(ids).map((s) => (
            <span key={s.id} onClick={close}>
              <SectionLink section={s} className="flex min-h-20 flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-3 transition-transform active:scale-95 data-[active=true]:border-primary">
                <s.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">{s.label}</span>
              </SectionLink>
            </span>
          ))}
          {extra && <span onClick={close}>{extra}</span>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function GameShell() {
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hub, setHub] = useState<null | "vie" | "ville">(null);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tel = SECTIONS.find((s) => s.id === "telephone");
  const carte = SECTIONS.find((s) => s.id === "carte");
  const [deskMenu, setDeskMenu] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "m" || e.key === "M") setDeskMenu((o) => !o);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const currentTitle = SECTIONS.find(s => s.id === path.split("/")[1])?.label ?? "Votre journée";
  return (
    <div className="min-h-dvh">
      {/* Desktop: menu hidden by default, opened with the button or the M key */}
      <Button type="button" variant="ghost" onClick={() => setDeskMenu(true)} aria-label="Ouvrir le menu (touche M)" title="Menu (M)"
        className="glass fixed left-4 top-4 z-40 hidden h-12 w-12 rounded-full shadow-card lg:flex"><Menu className="h-5 w-5" /></Button>
      <Sheet open={deskMenu} onOpenChange={setDeskMenu}>
        <SheetContent side="left" aria-describedby={undefined} className="flex w-72 flex-col bg-sidebar/90 p-4 backdrop-blur-xl">
          <SheetHeader><SheetTitle className="sr-only">Menu</SheetTitle><Link to="/tableau-de-bord" onClick={() => setDeskMenu(false)} className="px-2 pt-2"><Logo size={30} /></Link></SheetHeader>
          <nav className="-mx-1 mt-4 flex flex-1 flex-col gap-1 overflow-y-auto px-1"><GroupedMenu onPick={() => setDeskMenu(false)} /></nav>
          <Button variant="ghost" onClick={signOut} className="h-11 justify-start gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            <LogOut className="h-5 w-5" /> Se déconnecter
          </Button>
        </SheetContent>
      </Sheet>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border glass px-4 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">{path !== "/tableau-de-bord" && <Button asChild variant="ghost" size="icon" title="Revenir à l’accueil"><Link to="/tableau-de-bord" aria-label="Revenir à l’accueil"><ArrowLeft /></Link></Button>}<Link to="/tableau-de-bord" className="flex min-h-11 min-w-0 items-center"><span className="min-w-0 break-words text-sm font-semibold">{path === "/tableau-de-bord" ? <Logo size={26} /> : currentTitle}</span></Link></div>
        <Button variant="outline" type="button" onClick={() => setMenuOpen(true)} className="min-h-11 gap-2 rounded-xl px-4">
          <LayoutGrid className="h-5 w-5" /> Plus
        </Button>
      </header>

      <main className="game-content mx-auto min-w-0 max-w-6xl px-4 pt-6 sm:px-6 lg:px-20 lg:pt-10">
        <GameSpeed />
        <GameContext />
        <BirthdayBanner />
        <div key={path} className="animate-page">{path !== "/tableau-de-bord" && <PageIntro path={path} />}<Outlet /></div>
        <SalaryMoment />
      </main>

      {/* Mobile bottom nav: 5 entries */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border glass pb-[env(safe-area-inset-bottom)] lg:hidden">
        <Link to="/tableau-de-bord" activeProps={{ "data-active": "true" }} className={TAB}>
          <Home className="h-5 w-5" /> Accueil
        </Link>
        <Button variant="ghost" type="button" onClick={() => setHub("vie")} data-active={hub === "vie" || undefined} className={TAB}>
          <User className="h-5 w-5" /> Ma vie
        </Button>
        <Button variant="ghost" type="button" onClick={() => setHub("ville")} data-active={hub === "ville" || undefined} className={TAB}>
          <Building2 className="h-5 w-5" /> Ma ville
        </Button>
        {tel && <SectionLink section={tel} className={TAB}><tel.icon className="h-5 w-5" /> Téléphone</SectionLink>}
        {carte && <SectionLink section={carte} className={TAB}><carte.icon className="h-5 w-5" /> Carte</SectionLink>}
      </nav>

      <HubSheet open={hub === "vie"} onOpenChange={(o) => setHub(o ? "vie" : null)} title="Ma vie" intro="Ton personnage, ton quotidien, ta maison."
        ids={LIFE_HUB}
        extra={<Link to="/style" className="flex min-h-20 flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-3 transition-transform active:scale-95"><Sparkles className="h-6 w-6 text-primary" /><span className="text-sm font-semibold">Style</span></Link>} />
      <HubSheet open={hub === "ville"} onOpenChange={(o) => setHub(o ? "ville" : null)} title="Ma ville" intro="Ce qui se passe autour de toi, et comment t'engager."
        ids={CITY_HUB} />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Plus</SheetTitle></SheetHeader>
          <div className="mt-2"><GroupedMenu big onPick={() => setMenuOpen(false)} /></div>
          <Button variant="outline" onClick={signOut} className="mt-4 min-h-12 w-full gap-2 rounded-xl text-sm text-muted-foreground">
            <LogOut className="h-5 w-5" /> Se déconnecter
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
