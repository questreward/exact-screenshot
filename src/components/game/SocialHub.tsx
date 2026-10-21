import { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { characterQuery, lifeQuery, worldEventsQuery } from "@/services/game";
import { eventsAroundMe, socialPlans } from "@/game/social-hub";
import { eventEmoji } from "@/game/map-layers";
import { HomeInvitesPanel } from "./HomeVisits";
import { useWorldClock } from "./WorldClock";

const hm = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

// Espace « Vie sociale » du téléphone : regroupe invitations, rendez-vous et événements existants.
export function SocialHub({ open }: { open: (id?: string) => void }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: c } = useSuspenseQuery(characterQuery);
  const { data: ev } = useQuery(worldEventsQuery);
  const { time } = useWorldClock();
  const plans = socialPlans(life.activities, time).slice(0, 4);
  const around = eventsAroundMe(ev?.events ?? [], c?.city_id);
  const tile = "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-xs font-medium active:scale-95";
  return <div className="space-y-5">
    <div className="grid grid-cols-4 gap-2">
      <button type="button" className={tile} onClick={() => open("contacts")}><span className="text-2xl" aria-hidden>📇</span>Contacts</button>
      <button type="button" className={tile} onClick={() => open("messages")}><span className="text-2xl" aria-hidden>💬</span>Messages</button>
      <Link to="/organisations" className={tile}><span className="text-2xl" aria-hidden>🤝</span>Groupes</Link>
      <button type="button" className={tile} onClick={() => open("reseau")}><span className="text-2xl" aria-hidden>🌐</span>Joueurs</button>
    </div>

    <section className="space-y-2">
      <h2 className="text-sm font-bold">📅 Mes rendez-vous</h2>
      {plans.length === 0 ? <p className="rounded-xl bg-card p-3 text-sm text-muted-foreground">Aucune sortie prévue. Propose un moment à un contact depuis sa fiche.</p> :
        <ul className="space-y-2">{plans.map(a => <li key={a.id}><Link to="/carte" search={{ city: a.location.city_id, district: a.location.district_id ?? undefined, location: a.location.id }} className="flex min-h-14 items-center gap-3 rounded-xl bg-card p-3 active:scale-[0.98]">
          <span className="text-xl" aria-hidden>📍</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block truncate text-xs text-muted-foreground">{hm(a.start_time)} · {a.location.name}</span></span><span className="text-xs font-semibold text-primary">Carte</span></Link></li>)}</ul>}
    </section>

    <section className="space-y-2">
      <h2 className="text-sm font-bold">💌 Invitations</h2>
      <Suspense fallback={null}><HomeInvitesPanel /></Suspense>
    </section>

    <section className="space-y-2">
      <h2 className="text-sm font-bold">🎉 Autour de toi</h2>
      {around.length === 0 ? <p className="rounded-xl bg-card p-3 text-sm text-muted-foreground">Rien de prévu dans ta ville pour le moment.</p> :
        <ul className="space-y-2">{around.map(e => <li key={e.id}><Link to="/evenements" className="flex min-h-14 items-center gap-3 rounded-xl bg-card p-3 active:scale-[0.98]">
          <span className="text-xl" aria-hidden>{eventEmoji(e.title)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.title}</span><span className="block truncate text-xs text-muted-foreground">{e.phase === "en_cours" ? "🔴 En ce moment" : hm(e.starts_at)}{e.location_name ? ` · ${e.location_name}` : ""}</span></span></Link></li>)}</ul>}
    </section>
  </div>;
}
