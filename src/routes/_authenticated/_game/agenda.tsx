import { createFileRoute } from "@tanstack/react-router";
import { lifeQuery, clockQuery, adminQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { AgendaPage } from "@/components/game/AgendaPage";
export const Route = createFileRoute("/_authenticated/_game/agenda")({
  head:()=>({meta:gameMeta("Agenda","Vos cours, horaires de travail et activités quotidiennes dans CIVITAS.")}),
  loader:({context:{queryClient:q}})=>Promise.all([q.ensureQueryData(lifeQuery),q.ensureQueryData(clockQuery),q.ensureQueryData(adminQuery)]),
  component:AgendaPage,
});