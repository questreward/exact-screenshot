import { createFileRoute } from "@tanstack/react-router";
import { lifeQuery, economyQuery, clockQuery, citiesQuery, districtsQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { LifePage } from "@/components/game/LifePage";
export const Route = createFileRoute("/_authenticated/_game/vie")({
  head:()=>({meta:gameMeta("Vie quotidienne","Vos études, votre emploi, votre énergie et votre logement dans CIVITAS.")}),
  loader:async ({context:{queryClient:q}})=>{
    const [life] = await Promise.all([q.ensureQueryData(lifeQuery),q.ensureQueryData(economyQuery),q.ensureQueryData(clockQuery),q.ensureQueryData(citiesQuery)]);
    await q.ensureQueryData(districtsQuery(life.character.city_id));
  },
  component:LifePage,
});