import { Link } from "@tanstack/react-router";
import { Wallet, Zap, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import { useWorldClock } from "./WorldClock";
import { cityKey, gaugeTone, HOME_TILES, phaseFilter } from "@/game/home-scene";
import { formatMoney } from "@/services/game";
import { cn } from "@/lib/utils";
import paris from "@/assets/v2/ville-paris.webp";
import lyon from "@/assets/v2/ville-lyon.webp";
import marseille from "@/assets/v2/ville-marseille.webp";
import bordeaux from "@/assets/v2/ville-bordeaux.webp";
import lille from "@/assets/v2/ville-lille.webp";
import tTravail from "@/assets/v2/tuile-travail.webp";
import tVie from "@/assets/v2/tuile-vie.webp";
import tVille from "@/assets/v2/tuile-ville.webp";
import tCarte from "@/assets/v2/tuile-carte.webp";
import tTel from "@/assets/v2/tuile-telephone.webp";
import tServices from "@/assets/v2/tuile-services.webp";

const CITY = { paris, lyon, marseille, bordeaux, lille };
const TILE_IMG: Record<string, string> = { travail: tTravail, vie: tVie, ville: tVille, carte: tCarte, telephone: tTel, services: tServices };
const PHASE_ICON = { matin: Sunrise, journee: Sun, soiree: Sunset, nuit: Moon };

type Props = { firstName: string; cityName?: string | null | undefined; appearance: unknown; energy: number; balance: number; situation: string };

export function GameHome({ firstName, cityName, appearance, energy, balance, situation }: Props) {
  const { time, phase } = useWorldClock();
  const PhaseIcon = PHASE_ICON[phase];
  const tone = gaugeTone(energy);
  return (
    <div className="space-y-4">
      <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
        <img src={CITY[cityKey(cityName)]} alt={`Vue de ${cityName ?? "votre ville"}`}
          className="h-[22rem] w-full object-cover transition-[filter] duration-1000 sm:h-[26rem]" style={{ filter: phaseFilter(phase) }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        {/* Jauges */}
        <div className="absolute inset-x-3 top-3 flex gap-2">
          <Link to="/telephone" search={{ app: "banque" }} className="glass flex min-h-12 flex-1 items-center gap-2 rounded-2xl px-3 shadow-card">
            <Wallet className="h-5 w-5 text-primary" /><span className="font-display text-base font-bold">{formatMoney(balance)}</span>
          </Link>
          <div className="glass flex min-h-12 flex-1 flex-col justify-center gap-1 rounded-2xl px-3 shadow-card" aria-label={`Énergie ${energy} sur 100`}>
            <span className="flex items-center gap-1.5 text-sm font-bold"><Zap className="h-4 w-4 text-primary" />{energy}</span>
            <div className="h-2 rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", tone === "low" ? "bg-destructive" : "bg-gradient-primary")} style={{ width: `${energy}%` }} /></div>
          </div>
          <div className="glass flex min-h-12 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold shadow-card">
            <PhaseIcon className="h-4 w-4 text-primary" />
            {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
          </div>
        </div>
        {/* Personnage */}
        <div className="absolute inset-x-4 bottom-4 flex items-end gap-4">
          <div className="h-36 w-28 shrink-0 animate-rise overflow-hidden rounded-3xl border-2 border-primary/60 bg-card shadow-elegant">
            <CharacterAvatar appearance={normalizeAppearance(appearance as never)} />
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-sm font-medium text-muted-foreground">{cityName}</p>
            <h1 className="truncate font-display text-3xl font-bold">Bonjour, {firstName}</h1>
            <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{situation}</p>
          </div>
        </div>
      </section>

      <nav aria-label="Lieux" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HOME_TILES.map((t, i) => (
          <Link key={t.id} to={t.to as "/vie"}
            className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-card transition-transform active:scale-95 animate-rise"
            style={{ animationDelay: `${i * 60}ms` }}>
            <img src={TILE_IMG[t.id]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <span className="absolute bottom-3 left-3 font-display text-lg font-bold">{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
