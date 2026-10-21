import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lifeQuery } from "@/services/game";
import { FREEDOM, tourSteps, useTour } from "@/game/onboarding";

export function DiscoveryTour({ firstName, cityName }: { firstName: string; cityName?: string | null }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { state, seeIntro, complete, finish } = useTour();
  if (!state || state.finished) return null;
  const rescue = /pompier|police|gendarm|samu|secours|protection/i.test(life.employment?.job?.title ?? "");
  const steps = tourSteps({ studying: !!life.enrollment, working: !!life.employment, hasHousing: !!life.housing, rescue });

  if (!state.intro) {
    return createPortal(
      <div role="dialog" aria-label="Bienvenue" className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur">
        <p className="font-display text-4xl font-bold animate-rise">Bienvenue à CIVITAS.</p>
        <p className="text-xl text-muted-foreground animate-rise" style={{ animationDelay: "600ms", animationFillMode: "both" }}>Votre vie commence ici.</p>
        <p className="text-lg animate-rise" style={{ animationDelay: "1200ms", animationFillMode: "both" }}>Tu es <b>{firstName}</b>, à <b>{cityName}</b>.</p>
        <Button size="lg" onClick={seeIntro} className="mt-4 min-h-14 rounded-2xl px-8 text-base animate-rise" style={{ animationDelay: "1800ms", animationFillMode: "both" }}>
          Découvrir ma vie <ArrowRight className="h-5 w-5" />
        </Button>
      </div>,
      document.body,
    );
  }

  const current = steps.find((s) => !state.done.includes(s.id));
  const n = steps.length - steps.filter((s) => !state.done.includes(s.id)).length;

  if (!current) {
    return (
      <section className="rounded-3xl border-2 border-primary bg-gradient-card p-5 shadow-elegant animate-rise">
        <p className="font-display text-2xl font-bold">Votre vie vous appartient.</p>
        <p className="mt-1 text-sm text-muted-foreground">Tu connais l'essentiel. Que veux-tu faire ?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {FREEDOM.map((f) => (
            <Link key={f.label} to={f.to as "/vie"} onClick={finish} className="flex min-h-12 items-center justify-center rounded-2xl border border-border bg-card px-3 text-center text-sm font-semibold active:scale-95">{f.label}</Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Découverte" className="relative rounded-3xl border-2 border-primary bg-gradient-card p-4 shadow-elegant animate-rise">
      <Button variant="ghost" size="icon" onClick={finish} aria-label="Passer la découverte" className="absolute right-2 top-2 h-11 w-11"><X className="h-5 w-5" /></Button>
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Découverte · {n + 1}/{steps.length}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-primary transition-all" style={{ width: `${(n / steps.length) * 100}%` }} /></div>
      <div className="mt-3 flex items-center gap-3 pr-8">
        <span className="text-4xl" aria-hidden>{current.emoji}</span>
        <div><p className="font-display text-lg font-bold">{current.title}</p><p className="text-sm text-muted-foreground">{current.text}</p></div>
      </div>
      <Link to={current.to as "/vie"} onClick={() => complete(current.id)}
        className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground animate-pulse active:scale-95">
        {current.cta} <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
}
