import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, X, ChevronRight } from "lucide-react";
import { introFor } from "@/game/page-intros";
import { Button } from "@/components/ui/button";
import { SECTIONS } from "@/game/navigation";

const KEY = "civitas-intro-seen";

function readSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function PageIntro({ path }: { path: string }) {
  const intro = introFor(path);
  const id = path.split("/").filter(Boolean)[0] ?? "";
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => { setOpen(!readSeen().includes(id)); }, [id]);
  if (!intro || open === null) return null;
  const Icon = SECTIONS.find((s) => s.id === id)?.icon ?? HelpCircle;

  const close = () => {
    const seen = readSeen();
    try { if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id])); } catch { /* Storage may be unavailable. */ }
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" type="button" onClick={() => setOpen(true)} aria-label={`À quoi sert ${intro.title} ?`}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" /> À quoi ça sert ?
        </Button>
      </div>
    );
  }

  return (
    <section aria-label={`Présentation : ${intro.title}`} className="page-intro relative animate-page">
      <Button variant="ghost" type="button" onClick={close} aria-label="Fermer la présentation" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-background/30">
        <X className="h-5 w-5" />
      </Button>
      <div className="relative flex items-start gap-4 pr-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-7 w-7" /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Votre espace</p>
          <h2 className="font-display text-xl font-bold leading-tight">{intro.title}</h2>
        </div>
      </div>
      <p className="relative mt-3 border-l-2 border-primary pl-4 text-sm text-foreground">{intro.welcome}</p>
      <div className="relative mt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dans votre vie de Citoyen</p>
        <p className="mt-1 text-sm leading-relaxed">{intro.purpose}</p>
      </div>
      {intro.actions && intro.actions.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {intro.actions.map((a) => (
            <Link key={a.to} to={a.to} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-card-foreground hover:border-primary">
              {a.label} <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          ))}
        </div>
      )}
      <Button variant="ghost" type="button" onClick={close} className="relative mt-3 min-h-11">
        Continuer ma journée
      </Button>
    </section>
  );
}
