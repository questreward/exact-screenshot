import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Lock } from "lucide-react";
import { COMING_SOON } from "@/game/navigation";
import { GameHome } from "@/components/game/GameHome";
import { bankQuery, characterQuery, eventsQuery, formatMoney, notificationsQuery, worldQuery } from "@/services/game";
import { clockQuery, positionQuery } from "@/services/game";
import { PositionBlock } from "@/components/game/PositionBlock";
import { WorldClock } from "@/components/game/WorldClock";
import { gameMeta } from "@/game/metadata";
import { lifeQuery } from "@/services/game";
import { LifeSummary } from "@/components/game/LifeSummary";
import { FranceDay } from "@/components/game/FranceDay";
import { NextStepCard } from "@/components/game/NextStepCard";
import { notificationTarget } from "@/game/next-step";

export const Route = createFileRoute("/_authenticated/_game/tableau-de-bord")({
  head: () => ({ meta: gameMeta("Tableau de bord", "Retrouvez votre personnage, votre position et votre vie dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.fetchQuery(lifeQuery); await Promise.all([
    q.fetchQuery(characterQuery), q.fetchQuery(bankQuery), q.ensureQueryData(notificationsQuery),
    q.ensureQueryData(eventsQuery), q.ensureQueryData(worldQuery), q.fetchQuery(positionQuery), q.ensureQueryData(clockQuery),
  ]); },
  component: Dashboard,
});

function Dashboard() {
  const { data: character } = useSuspenseQuery(characterQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  if (!character) return null;

  return (
    <div className="-mt-6 space-y-6 lg:-mt-10">
      <GameHome firstName={character.first_name} cityName={character.city?.name} appearance={character.appearance}
        energy={character.energy} balance={bank?.balance ?? 0} situation={character.situation} />

      <NextStepCard cityName={character.city?.name} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-primary" /> Notifications</h2>
          <ul className="mt-3 space-y-2">
            {notifs.length === 0 && <li className="text-sm text-muted-foreground">Aucune notification.</li>}
            {notifs.slice(0, 4).map((n) => (
              <li key={n.id}>
                {n.news_id
                  ? <Link to="/actualites/$id" params={{ id: n.news_id }} className="block min-h-11 rounded-2xl bg-accent/60 p-3 active:scale-[0.98]"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p></Link>
                  : <Link to={notificationTarget(n) as "/banque"} className="block min-h-11 rounded-2xl bg-accent/60 p-3 active:scale-[0.98]"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p></Link>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-5 w-5 text-primary" /> Événements du monde</h2>
          {events.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Les événements du monde : {COMING_SOON.toLowerCase()}.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">{events.map((e) => <li key={e.id} className="rounded-2xl bg-accent/60 p-3">{e.title}</li>)}</ul>
          )}
        </div>
      </div>

    </div>
  );
}
