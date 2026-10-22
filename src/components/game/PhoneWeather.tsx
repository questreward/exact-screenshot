import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CloudSun, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { positionQuery, weatherQuery } from "@/services/game";
import { ExperienceState } from "./ExperienceState";
import { Button } from "@/components/ui/button";
export function PhoneWeather() {
  const { data: position } = useSuspenseQuery(positionQuery);
  const query = useQuery({ ...weatherQuery(position?.city_id ?? ""), enabled: !!position?.city_id });
  if (query.isPending && position) return <ExperienceState kind="loading" title="Consultation de la météo…" />;
  if (query.isError) return <ExperienceState kind="error" title="La météo n’a pas pu être chargée" onRetry={() => void query.refetch()} />;
  return <section className="space-y-5 py-3"><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{position?.city?.name}</p>{query.data ? <><CloudSun className="h-16 w-16 text-warning" /><p className="font-display text-4xl">{query.data.temperature} °C</p><h2 className="text-xl capitalize">{query.data.condition}</h2><p className="text-xs text-muted-foreground">Météo simulée du monde CIVITAS · aucune prévision disponible.</p></> : <ExperienceState kind="empty" title="Aucune météo enregistrée pour cette ville" />}<Button asChild variant="outline"><Link to="/carte" search={{}}>Ouvrir la carte</Link></Button></section>;
}