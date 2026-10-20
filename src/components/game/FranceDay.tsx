import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { clockQuery } from "@/services/game";
import { dayInfo } from "@/game/france-calendar";

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Jour férié, vacances scolaires et prochain jour férié selon l'heure du monde. */
export function FranceDay() {
  const { data } = useQuery(clockQuery);
  const now = (data as { now?: string } | undefined)?.now;
  if (!now) return null;
  const { holiday, school, next } = dayInfo(new Date(now));
  return <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Calendrier</p>
    {holiday ? <p className="mt-1 font-semibold text-primary">Jour férié : {holiday.label}. Pas de cours, travail payé double.</p>
      : <p className="mt-1 font-semibold">Jour ordinaire</p>}
    {school && <p className="text-sm">{school.label} jusqu'au {fmt(school.to)}</p>}
    {next && <p className="text-sm text-muted-foreground">Prochain jour férié : {next.label}, {fmt(next.date)}</p>}
  </div>;
}
