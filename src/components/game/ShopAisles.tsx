import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS } from "@/game/shop";
import { AISLES } from "@/game/shop-aisles";
import { useWorldClock } from "./WorldClock";
import { cn } from "@/lib/utils";
import tech from "@/assets/v2/shop-tech.webp";
import mode from "@/assets/v2/shop-mode.webp";
import maison from "@/assets/v2/shop-maison.webp";
import electromenager from "@/assets/v2/shop-electromenager.webp";
import loisirs from "@/assets/v2/shop-loisirs.webp";
import auto from "@/assets/v2/shop-auto.webp";
import immobilier from "@/assets/v2/ville-paris.webp";

// Presentation only: existing catalogue sections shown as walkable aisles.
const IMG: Record<string, string> = { tech, mode, maison, electromenager, loisirs, auto, immobilier };
const EMOJI: Record<string, string> = { tech: "📱", maison: "🛋️", electromenager: "🧺", mode: "👕", loisirs: "⚽", auto: "🚗", immobilier: "🏠" };
const KEYS = Object.keys(SECTIONS);

export function ShopHall({ onPick }: { onPick: (k: string) => void }) {
  const { time } = useWorldClock();
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
        <img src={maison} alt="Entrée du magasin" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2">
          <div><p className="flex items-center gap-2 font-display text-xl font-bold"><DoorOpen className="h-5 w-5 text-primary" />Bienvenue au magasin</p>
            <p className="text-sm text-muted-foreground">Choisis un rayon pour commencer tes courses.</p></div>
          <span className="glass rounded-xl px-2 py-1 text-xs font-semibold">{time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} · Ouvert</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map((k, i) => (
          <button key={k} type="button" onClick={() => onPick(k)}
            className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-border text-left shadow-card transition-transform active:scale-95 animate-rise"
            style={{ animationDelay: `${i * 50}ms` }}>
            <img src={IMG[k]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <span className="absolute bottom-3 left-3 font-display text-lg font-bold">{EMOJI[k]} {SECTIONS[k]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AisleHeader({ section, onPick, onQuery, active }: { section: string; onPick: (k: string) => void; onQuery: (q: string) => void; active: string }) {
  const i = KEYS.indexOf(section);
  const prev = KEYS[(i - 1 + KEYS.length) % KEYS.length]!;
  const next = KEYS[(i + 1) % KEYS.length]!;
  const aisles = AISLES[section] ?? [];
  return (
    <div className="space-y-2 animate-page">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img src={IMG[section]} alt={`Rayon ${SECTIONS[section]}`} className="h-32 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 to-transparent" />
        <p className="absolute bottom-3 left-4 font-display text-2xl font-bold">{EMOJI[section]} {SECTIONS[section]}</p>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-2">
        <Button variant="outline" className="min-h-12 gap-1 px-3" onClick={() => onPick(prev)} aria-label={`Rayon précédent : ${SECTIONS[prev]}`}><ChevronLeft className="h-5 w-5" />{EMOJI[prev]}</Button>
        <Button variant="ghost" className="min-h-12" onClick={() => onPick("")}>Entrée du magasin</Button>
        <Button variant="outline" className="min-h-12 gap-1 px-3" onClick={() => onPick(next)} aria-label={`Rayon suivant : ${SECTIONS[next]}`}>{EMOJI[next]}<ChevronRight className="h-5 w-5" /></Button>
      </div>
      {aisles.some((a) => a.q) && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => onQuery("")} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold", !active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>Tout le rayon</button>
          {aisles.filter((a) => a.q).map((a) => (
            <button key={a.label} type="button" onClick={() => onQuery(a.q)} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold", active === a.q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
