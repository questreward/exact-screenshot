import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { citiesQuery, districtsQuery, institutionDecree, institutionQuery } from "@/services/game";
import { GAUGES, decreeError } from "@/game/institutions";

const sel = "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";

/** Arrêté du maire / décret du président ; effets réels appliqués par le serveur aux jauges des quartiers. */
export function InstitutionDecisions({ kind, cityId }: { kind: "mairie" | "elysee" | "assemblee"; cityId: string }) {
  const { data: st } = useQuery({ ...institutionQuery(cityId), enabled: !!cityId });
  const { data: cities } = useQuery(citiesQuery);
  const [city, setCity] = useState(cityId);
  const target = kind === "elysee" ? city : cityId;
  const { data: districts } = useQuery({ ...districtsQuery(target), enabled: !!target });
  const [district, setDistrict] = useState(""); const [gauge, setGauge] = useState("cadre");
  const [delta, setDelta] = useState(3); const [title, setTitle] = useState("");
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: () => institutionDecree({ kind: kind as "mairie" | "elysee", city: target, district: kind === "mairie" ? district : null, gauge, delta, title }),
    onSuccess: async () => { setTitle(""); await Promise.all([qc.invalidateQueries({ queryKey: ["institutions"] }), qc.invalidateQueries({ queryKey: ["district-gauges"] })]); toast.success("Décision signée : la ville change."); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!st) return null;
  if (kind === "assemblee") return <p className="rounded-2xl border border-border bg-card p-3 text-sm">Chaque loi adoptée donne <strong>+{st.law_gain}</strong> sur une jauge dans tous les quartiers de France (sécurité → tranquillité, culture et sport → animation, le reste → cadre de vie).</p>;
  const allowed = kind === "mairie" ? st.mayor : st.president;
  const max = kind === "mairie" ? st.mayor_max : st.president_max;
  const used = st.used.includes(kind);
  const err = decreeError(kind, title, delta, max) ?? (kind === "mairie" && !district ? "Choisis un quartier." : null);
  const recent = st.decrees.filter(d => d.kind === kind);
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
    <h2 className="flex items-center gap-2 font-semibold"><Gavel className="h-5 w-5 text-primary" />{kind === "mairie" ? "Arrêté municipal" : "Décret présidentiel"}</h2>
    {!allowed ? <p className="text-sm text-muted-foreground">{kind === "mairie" ? "Seul le maire de la ville peut signer un arrêté." : "Seul le président de la République peut signer un décret."} Tu vois ici les décisions déjà prises.</p>
    : used ? <p className="text-sm text-muted-foreground">Tu as déjà signé ta décision du jour. Reviens demain (jour de jeu).</p>
    : <div className="space-y-2">
        <Input className="h-12" maxLength={80} placeholder="Titre (ex. : Rénovation de la place)" value={title} onChange={e => setTitle(e.target.value)} />
        {kind === "elysee" && <GameSelect className={sel} value={city} onChange={e => setCity(e.target.value)} aria-label="Ville">{(cities ?? []).filter(c => c.available).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</GameSelect>}
        {kind === "mairie" && <GameSelect className={sel} value={district} onChange={e => setDistrict(e.target.value)} aria-label="Quartier"><option value="">Choisir un quartier</option>{(districts ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</GameSelect>}
        <GameSelect className={sel} value={gauge} onChange={e => setGauge(e.target.value)} aria-label="Jauge">{GAUGES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</GameSelect>
        <label className="block text-sm">Effet : <strong>{delta > 0 ? "+" : ""}{delta}</strong>
          <input type="range" min={-max} max={max} step={1} value={delta} onChange={e => setDelta(Number(e.target.value) || (delta > 0 ? -1 : 1))} className="mt-2 h-10 w-full accent-primary" /></label>
        <p className="text-xs text-muted-foreground">Une décision par jour de jeu · {kind === "mairie" ? "un quartier" : "tous les quartiers de la ville"} · retour progressif à 50.</p>
        <Button className="min-h-12 w-full" disabled={!!err || decide.isPending} onClick={() => decide.mutate()}>{decide.isPending ? <LoaderCircle className="animate-spin" /> : <Gavel />}Signer</Button>
        {err && title && <p className="text-xs text-destructive">{err}</p>}
      </div>}
    {recent.length > 0 && <ul className="space-y-1 border-t border-border pt-2 text-sm">{recent.slice(0, 4).map((d, i) => <li key={i}>• {d.title} <span className="text-muted-foreground">({GAUGES.find(g => g.id === d.gauge)?.label} {d.delta > 0 ? "+" : ""}{d.delta})</span></li>)}</ul>}
  </section>;
}
