import { AbsenceSummary } from "@/components/game/AbsenceSummary";
import { DailySituations } from "@/components/game/DailySituations";
import { CityPulse } from "@/components/game/CityPulse";
import { ElectionBanner } from "@/components/game/CampaignJourney";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { GameHome } from "@/components/game/GameHome";
import { bankQuery, characterQuery, notificationsQuery, worldQuery } from "@/services/game";
import { clockQuery, positionQuery } from "@/services/game";
import { PositionBlock } from "@/components/game/PositionBlock";
import { WorldClock } from "@/components/game/WorldClock";
import { gameMeta } from "@/game/metadata";
import { lifeQuery } from "@/services/game";
import { LifeSummary } from "@/components/game/LifeSummary";
import { FranceDay } from "@/components/game/FranceDay";
import { NextStepCard } from "@/components/game/NextStepCard";
import { DiscoveryTour } from "@/components/game/DiscoveryTour";
import { notificationTarget } from "@/game/next-step";

export const Route = createFileRoute("/_authenticated/_game/tableau-de-bord")({
  head: () => ({ meta: gameMeta("Tableau de bord", "Retrouvez votre personnage, votre position et votre vie dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.fetchQuery(lifeQuery); await Promise.all([
    q.fetchQuery(characterQuery), q.fetchQuery(bankQuery), q.ensureQueryData(notificationsQuery),
    q.ensureQueryData(worldQuery), q.fetchQuery(positionQuery), q.ensureQueryData(clockQuery),
  ]); },
  component: Dashboard,
});

function Dashboard() {
  const { data: character } = useSuspenseQuery(characterQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  if (!character) return null;

  return (
    <div className="space-y-6">
      <GameHome firstName={character.first_name} cityName={character.city?.name} appearance={character.appearance}
        energy={character.energy} balance={bank?.balance ?? 0} situation={character.situation} />

      <DiscoveryTour firstName={character.first_name} cityName={character.city?.name} />

      <AbsenceSummary />

      <ElectionBanner />

      <DailySituations />

      {character.city?.name && <CityPulse cityName={character.city.name} cityId={character.city_id} />}

      <NextStepCard cityName={character.city?.name} />

      <div>
        <div className="experience-section">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-primary" /> Notifications</h2>
          <ul className="mt-3 space-y-2">
            {notifs.length === 0 && <li className="text-sm text-muted-foreground">Aucune notification.</li>}
            {notifs.slice(0, 4).map((n) => (
              <li key={n.id}>
                {n.news_id
                  ? <Link to="/actualites/$id" params={{ id: n.news_id }} className="block min-h-11 rounded-2xl bg-accent/60 p-3 active:scale-[0.98]"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p></Link>
                  : <Link to={notificationTarget(n) as "/banque"} className="block min-h-11 rounded-2xl bg-accent/60 p-3 active:scale-[0.98]">{notificationTarget(n) === "/la-poste" && <p className="text-xs font-bold uppercase text-primary">📄 Nouveau document · {n.read ? "lu" : "à ouvrir"}</p>}<p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p></Link>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="pt-2 font-display text-lg font-bold">Ma situation en détail</h2>
      <WorldClock />
      <FranceDay />
      <LifeSummary />
      <PositionBlock />
    </div>
  );
}
