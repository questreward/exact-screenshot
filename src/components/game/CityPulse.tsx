import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { clockQuery } from "@/services/game";
import { cityPulse, type PulseStage } from "@/game/city-pulse";
import { cn } from "@/lib/utils";

const STAGE_STYLE: Record<PulseStage, string> = {
  signale: "bg-destructive/15 text-destructive",
  en_cours: "bg-primary/15 text-primary",
  maitrise: "bg-muted text-muted-foreground",
};

/** Scènes d'ambiance de la ville : aucune conséquence sur la partie. */
export function CityPulse({ cityName }: { cityName: string }) {
  const { data: clock } = useSuspenseQuery(clockQuery);
  const [now, setNow] = useState(() => new Date(clock.anchor));
  useEffect(() => {
    const tick = () => setNow(new Date(new Date(clock.anchor).getTime() + (Date.now() - clock.receivedAt) * clock.speed));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [clock]);
  const scenes = cityPulse(cityName, now);

  return (
    <section className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" /></span>
        {cityName} en direct
      </h2>
      <p className="text-xs text-muted-foreground">Ce qui se passe en ville en ce moment. Scènes d'ambiance, sans effet sur votre partie.</p>
      <ul className="mt-3 space-y-3">
        {scenes.map((s) => (
          <li key={s.id} className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl bg-accent/50 p-4 duration-500">
            <div className="flex items-start gap-3">
              <span className={cn("text-3xl", s.stage === "signale" && "animate-pulse")} aria-hidden>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">Dans {s.place}</p>
                <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_STYLE[s.stage])}>
                  {s.stageLabel}{s.responder && s.stage !== "signale" ? ` · ${s.responder}` : ""}
                </span>
              </div>
            </div>
            <ul className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
              {s.reactions.map((r, i) => (
                <li key={r} className="animate-in fade-in text-sm duration-700" style={{ animationDelay: `${i * 250}ms`, animationFillMode: "both" }}>{r}</li>
              ))}
            </ul>
            <Link to={s.link} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold active:scale-[0.98]">
              <Radio className="h-4 w-4" /> {s.link === "/secours" ? "Voir les métiers de secours" : s.link === "/actualites" ? "Voir les actualités" : "Voir la carte"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
