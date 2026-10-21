import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, X, ChevronRight } from "lucide-react";
import { introFor } from "@/game/page-intros";
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
    if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id]));
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setOpen(true)} aria-label={`À quoi sert ${intro.title} ?`}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" /> À quoi ça sert ?
        </button>
      </div>
    );
  }

  return (
    <section aria-label={`Présentation : ${intro.title}`} className="relative mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-card p-5 text-secondary-foreground shadow-lg animate-rise">
      <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 opacity-10"><Icon className="h-40 w-40" /></div>
      <button type="button" onClick={close} aria-label="Fermer la présentation" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-background/30">
        <X className="h-5 w-5" />
      </button>
      <div className="relative flex items-start gap-4 pr-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md"><Icon className="h-7 w-7" /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tu entres dans</p>
          <h2 className="font-heading text-2xl font-bold leading-tight">{intro.title}</h2>
        </div>
      </div>
      <p className="relative mt-4 rounded-xl rounded-tl-none bg-background/60 p-3 text-sm italic text-foreground">{intro.welcome}</p>
      <div className="relative mt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">À quoi ça sert</p>
        <p className="mt-1 text-sm leading-relaxed">{intro.purpose}</p>
      </div>
      {intro.actions && intro.actions.length > 0 && (
        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {intro.actions.map((a) => (
            <Link key={a.to} to={a.to} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-card-foreground hover:border-primary">
              {a.label} <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          ))}
        </div>
      )}
      <button type="button" onClick={close} className="relative mt-4 min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground active:scale-[0.98]">
        J’ai compris, c’est parti !
      </button>
    </section>
  );
}
