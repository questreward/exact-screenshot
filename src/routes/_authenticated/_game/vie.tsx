import { createFileRoute } from "@tanstack/react-router";
import { lifeQuery, clockQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { LifePage } from "@/components/game/LifePage";
export const Route = createFileRoute("/_authenticated/_game/vie")({
  head:()=>({meta:gameMeta("Vie quotidienne","Vos études, votre emploi, votre énergie et votre logement dans CIVITAS.")}),
  loader:({context:{queryClient:q}})=>Promise.all([q.ensureQueryData(lifeQuery),q.ensureQueryData(clockQuery)]),
  component:LifePage,
});