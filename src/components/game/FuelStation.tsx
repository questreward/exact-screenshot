import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fillFuel, fuelQuery } from "@/services/game";

export function FuelGauge({ level, electric }: { level: number; electric?: boolean }) {
  const tone = level <= 0 ? "bg-destructive" : level < 25 ? "bg-primary" : "bg-success";
  return <div className="space-y-1">
    <div className="flex justify-between text-xs"><span>{electric ? "🔋 Batterie" : "⛽ Essence"}</span><strong>{level} %</strong></div>
    <div className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full ${tone} transition-all`} style={{ width: `${level}%` }} /></div>
    {level <= 0 && <p className="text-xs font-semibold text-destructive">Réservoir vide : la voiture ne peut plus rouler.</p>}
  </div>;
}

/** Jauge d'un véhicule précis (avant un trajet). */
export function CarFuel({ catalogId }: { catalogId: string }) {
  const { data } = useQuery(fuelQuery);
  const car = data?.cars.find(c => c.catalog_id === catalogId);
  return car ? <FuelGauge level={car.level} electric={car.electric} /> : null;
}

export function FuelStation({ here }: { here?: boolean }) {
  const { data } = useQuery(fuelQuery);
  const [pump, setPump] = useState<string | null>(null);
  if (!data || data.cars.length === 0) return null;
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-base font-bold">{here ? "⛽ Pompes" : "⛽ Essence"}</h2>
    <p className="mb-3 text-sm text-muted-foreground">{here ? "Choisis ta pompe. L'essence se paie au plein." : "Rends-toi dans une station-service sur la carte de la ville pour faire le plein. Réservoir vide = voiture bloquée."}</p>
    <div className="space-y-3">{data.cars.map(c => <div key={c.catalog_id} className="rounded-lg border border-border p-3">
      <p className="mb-2 font-semibold">🚗 {c.name}</p>
      <FuelGauge level={c.level} electric={c.electric} />
      <Button className="mt-3 min-h-12 w-full" disabled={!here || c.level >= 100} onClick={() => setPump(c.catalog_id)}>
        {c.level >= 100 ? "Plein fait" : !here ? `Plein sur place · ${c.fill_price} €` : `${c.electric ? "Recharger à la borne" : "Faire le plein"} · ${c.fill_price} €`}</Button>
    </div>)}</div>
    {pump && <Pump catalogId={pump} onClose={() => setPump(null)} />}
  </section>;
}

function Pump({ catalogId, onClose }: { catalogId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery(fuelQuery);
  const car = data?.cars.find(c => c.catalog_id === catalogId);
  const [filled, setFilled] = useState(false);
  const fill = useMutation({
    mutationFn: () => fillFuel(catalogId),
    onSuccess: r => { qc.setQueryData(fuelQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["bank"] }); qc.invalidateQueries({ queryKey: ["economy"] }); setFilled(true); toast.success("Plein effectué."); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!car) return null;
  return <Sheet open onOpenChange={o => !o && !fill.isPending && onClose()}>
    <SheetContent side="bottom" className="rounded-t-2xl">
      <SheetHeader><SheetTitle className="font-heading">{car.electric ? "🔌 Borne de recharge" : "⛽ Pompe n° 3"}</SheetTitle></SheetHeader>
      <div className="mt-3 flex h-32 items-end justify-center gap-3 rounded-xl border border-border bg-muted pb-3 text-6xl">
        <span>{car.electric ? "🔌" : "⛽"}</span><span className={fill.isPending ? "animate-pulse" : ""}>🚗</span>
      </div>
      <div className="mt-3"><FuelGauge level={car.level} electric={car.electric} /></div>
      {data && <FillQuote car={car} tank={data.settings.tank_liters} />}
      {filled ? <Button className="mt-4 min-h-14 w-full" onClick={onClose}>Repartir</Button>
        : <Button className="mt-4 min-h-14 w-full text-base" disabled={fill.isPending} onClick={() => fill.mutate()}>{fill.isPending ? "Remplissage…" : `Payer ${car.fill_price} € et remplir`}</Button>}
    </SheetContent>
  </Sheet>;
}

/** Estimation affichée avant confirmation ; le montant final est celui calculé par le serveur. */
function FillQuote({ car, tank }: { car: { electric: boolean; level: number; fill_price: number }; tank: number }) {
  const missing = 100 - car.level;
  const liters = Math.round(tank * missing) / 100;
  const perLiter = liters > 0 ? car.fill_price / liters : 0;
  return <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
    {car.electric ? <><dt className="text-muted-foreground">Batterie à recharger</dt><dd className="text-right font-semibold">{missing} %</dd></>
      : <><dt className="text-muted-foreground">Prix au litre</dt><dd className="text-right font-semibold">{perLiter.toFixed(2).replace(".", ",")} €</dd>
        <dt className="text-muted-foreground">Litres à mettre</dt><dd className="text-right font-semibold">≈ {liters.toFixed(1).replace(".", ",")} L</dd></>}
    <dt className="text-muted-foreground">Coût estimé</dt><dd className="text-right font-display text-lg font-bold text-primary">{car.fill_price} €</dd>
  </dl>;
}
