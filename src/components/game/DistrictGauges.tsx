import { useQuery } from "@tanstack/react-query";
import { districtGaugesQuery } from "@/services/game";

const LABEL = { cadre: "Cadre de vie", tranquillite: "Tranquillité", animation: "Animation" } as const;

export function DistrictGauges({ cityId, districtId }: { cityId: string; districtId: string }) {
  const { data } = useQuery(districtGaugesQuery(cityId));
  if (!data) return null;
  const gauges = data.gauges.filter(g => g.district_id === districtId);
  if (!gauges.length) return null;
  const history = data.history.filter(h => h.district_id === districtId && h.delta !== 0).slice(0, 5);
  return <div className="space-y-3 border-t border-border pt-3">
    {(["cadre", "tranquillite", "animation"] as const).map(k => { const g = gauges.find(x => x.gauge === k); if (!g) return null; return <div key={k}>
      <div className="mb-1 flex justify-between text-xs"><span>{LABEL[k]}</span><span className="font-semibold">{g.value}/100</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={LABEL[k]} aria-valuenow={g.value} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${g.value}%` }} /></div>
    </div>; })}
    {history.length > 0 && <div><p className="mb-1 text-xs text-muted-foreground">Derniers changements</p><ul className="space-y-1">{history.map((h, i) => <li key={i} className="flex justify-between gap-2 text-xs"><span>{h.reason}</span><span className={h.delta > 0 ? "text-success" : "text-destructive"}>{h.delta > 0 ? "+" : ""}{h.delta}</span></li>)}</ul></div>}
  </div>;
}
