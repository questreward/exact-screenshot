import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { districtGaugesQuery, positionQuery } from "@/services/game";
import mairie from "@/assets/v2/inst-mairie.webp";
import assemblee from "@/assets/v2/inst-assemblee.webp";
import elysee from "@/assets/v2/inst-elysee.webp";

const INST = {
  mairie: { img: mairie, title: "Mairie · salle du conseil", sub: "Les décisions votées ici changent les quartiers." },
  assemblee: { img: assemblee, title: "Assemblée nationale · hémicycle", sub: "577 sièges · les lois s'appliquent à tout le pays." },
  elysee: { img: elysee, title: "Palais de l'Élysée", sub: "Promulguer, renvoyer une loi, s'adresser aux Français." },
} as const;
const GAUGE: Record<string, string> = { cadre: "Cadre de vie", tranquillite: "Tranquillité", animation: "Animation" };

/** Décor de l'institution + dernières conséquences réellement enregistrées dans la ville (jauges de quartier). */
export function InstitutionScene({ kind }: { kind: keyof typeof INST }) {
  const i = INST[kind];
  const { data: pos } = useQuery(positionQuery);
  const city = pos?.city_id ?? "";
  const { data: g } = useQuery({ ...districtGaugesQuery(city), enabled: !!city });
  const recent = (g?.history ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);
  return <section className="space-y-3">
    <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
      <img src={i.img} alt={i.title} width={1024} height={576} className="h-52 w-full object-cover sm:h-72" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute inset-x-4 bottom-3">
        <h1 className="font-display text-2xl font-bold">{i.title}</h1>
        <p className="text-sm text-foreground/80">{i.sub}</p>
      </div>
    </div>
    {recent.length > 0 && <div className="rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-sm font-semibold">Ce qui a changé en ville{pos?.city?.name ? ` · ${pos.city.name}` : ""}</p>
      <ul className="space-y-2">{recent.map((h, n) => <li key={n} className="flex items-start gap-2 text-sm animate-rise" style={{ animationDelay: `${n * 80}ms` }}>
        {h.delta >= 0 ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
        <span><strong>{GAUGE[h.gauge] ?? h.gauge} {h.delta > 0 ? "+" : ""}{h.delta}</strong> · {h.reason}</span></li>)}</ul>
    </div>}
  </section>;
}
