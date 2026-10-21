import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Monitor, Store } from "lucide-react";
import { postQuery } from "@/services/game";
import { DESK, unreadFor, type DeskService } from "@/game/desk-scene";
import { cn } from "@/lib/utils";
import caf from "@/assets/v2/desk-caf.webp";
import emploi from "@/assets/v2/desk-emploi.webp";
import sante from "@/assets/v2/desk-sante.webp";
import banque from "@/assets/v2/desk-banque.webp";
import poste from "@/assets/v2/desk-poste.webp";
import impots from "@/assets/v2/desk-impots.webp";
import prefecture from "@/assets/v2/desk-prefecture.webp";

const IMG: Record<DeskService, string> = { caf, emploi, sante, banque, poste, impots, prefecture };

// Décor d'entrée : guichet ou ordinateur, et courriers qui arrivent (lus depuis la vraie boîte aux lettres).
export function DeskScene({ service, flush = false }: { service: DeskService; flush?: boolean }) {
  const d = DESK[service];
  const [online, setOnline] = useState(false);
  const { data } = useQuery({ ...postQuery, retry: false });
  const mail = unreadFor(service, data?.letters ?? []);
  return (
    <section className={cn("relative overflow-hidden sm:rounded-3xl", !flush && "-mx-4 sm:mx-0")}>
      <div className={cn("relative transition-all duration-500", online && "desk-online")}>
        <img src={IMG[service]} alt={`${d.title} — ${d.place}`} width={1024} height={576}
          className={cn("h-56 w-full object-cover sm:h-72", online && "scale-90 rounded-xl")} />
        {online && <div className="desk-monitor-bar absolute inset-x-[5%] top-[5%] flex h-7 items-center gap-1.5 rounded-t-xl bg-card px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" /><span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="ml-2 truncate text-xs font-semibold text-muted-foreground">{d.online} · FICTIF</span>
        </div>}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{online ? d.online : d.place}</p>
          <h1 className="truncate font-display text-2xl font-bold">{d.title}</h1>
        </div>
        <div className="flex shrink-0 rounded-2xl bg-card p-1 shadow-card">
          <button type="button" onClick={() => setOnline(false)} aria-pressed={!online} aria-label="Au guichet"
            className={cn("flex min-h-11 min-w-11 items-center justify-center rounded-xl", !online && "bg-primary text-primary-foreground")}><Store className="h-5 w-5" /></button>
          <button type="button" onClick={() => setOnline(true)} aria-pressed={online} aria-label="En ligne"
            className={cn("flex min-h-11 min-w-11 items-center justify-center rounded-xl", online && "bg-primary text-primary-foreground")}><Monitor className="h-5 w-5" /></button>
        </div>
      </div>
      {mail.length > 0 && (
        <Link to="/la-poste" className="absolute right-3 top-3 flex min-h-12 items-center gap-2 rounded-2xl bg-card px-3 shadow-elegant mail-arrive">
          <span className="relative"><Mail className="h-6 w-6 text-primary" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">{mail.length}</span></span>
          <span className="max-w-40 truncate text-sm font-semibold">{mail.length > 1 ? `${mail.length} nouveaux courriers` : mail[0]!.subject}</span>
        </Link>
      )}
    </section>
  );
}
