import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { transportAction, transportQuery, vehicleWearQuery, repairVehicle } from "@/services/game";
import { inspectionChecks } from "@/game/inspection";
import { euros } from "@/game/income-tax";

// Scene over existing secured actions: vehicle_repair (garage) and transport_inspect (contrôle technique).
export function InspectionScene() {
  const { data: t } = useQuery(transportQuery);
  const { data: w } = useQuery(vehicleWearQuery);
  const [pick, setPick] = useState<string | null>(null);
  const cars = t?.cars ?? [];
  if (!t || cars.length === 0) return null;
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-base font-bold">🔧 Centre de contrôle technique</h2>
    <p className="mb-3 text-sm text-muted-foreground">Fais vérifier ta voiture point par point, puis règle les défauts au garage.</p>
    <div className="grid gap-2">{cars.map(c => <Button key={c.asset_id} variant="outline" className="min-h-14 justify-between" onClick={() => setPick(c.asset_id)}>
      <span>🚗 {c.name}</span><span className="text-xs">avant le {new Date(c.due_at).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</span></Button>)}</div>
    {pick && <Scene assetId={pick} onClose={() => setPick(null)} wearCars={w?.cars ?? []} />}
  </section>;
}

function Scene({ assetId, onClose, wearCars }: { assetId: string; onClose: () => void; wearCars: { catalog_id: string; name: string; condition_pct: number; repair_ref: number }[] }) {
  const qc = useQueryClient();
  const { data: t } = useQuery(transportQuery);
  const car = t?.cars.find(c => c.asset_id === assetId);
  const wear = wearCars.find(c => c.name === car?.name);
  const pct = wear?.condition_pct ?? 100;
  const checks = inspectionChecks(pct);
  const [step, setStep] = useState(0);
  const done = step >= checks.length;
  useEffect(() => { if (done) return; const id = setTimeout(() => setStep(s => s + 1), 900); return () => clearTimeout(id); }, [step, done]);
  const defects = checks.filter(c => c.status !== "ok");
  const soon = !!t && !!car && new Date(car.due_at).getTime() - new Date(t.now).getTime() <= 60 * 864e5;
  const refresh = () => ["transport", "vehicle-wear", "bank", "economy"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const repair = useMutation({ mutationFn: () => repairVehicle(wear!.catalog_id, null), onSuccess: () => { refresh(); toast.success("Défauts réglés au garage."); setStep(0); }, onError: (e: Error) => toast.error(e.message) });
  const inspect = useMutation({ mutationFn: () => transportAction("transport_inspect", { _asset: assetId }), onSuccess: () => { refresh(); toast.success("Contrôle technique validé."); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  return <Sheet open onOpenChange={o => !o && onClose()}>
    <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
      <SheetHeader><SheetTitle className="font-heading">🔧 Contrôle · {car?.name}</SheetTitle></SheetHeader>
      <div className="relative mt-3 flex h-28 items-end justify-center overflow-hidden rounded-xl border border-border bg-muted">
        <div className="absolute inset-x-0 bottom-0 h-4 bg-secondary" />
        <span className={`mb-3 text-6xl ${done ? "" : "animate-pulse"}`}>🚗</span><span className="mb-4 text-3xl">🧑‍🔧</span>
      </div>
      <ul className="mt-3 space-y-2">{checks.map((c, i) => <li key={c.id} className="flex min-h-12 items-center justify-between rounded-lg border border-border px-3 text-sm">
        <span>{c.emoji} {c.label}</span>
        <span className="font-semibold">{i >= step ? "…" : c.status === "ok" ? "✅ OK" : c.status === "minor" ? "🟠 À surveiller" : "🔴 À réparer"}</span></li>)}</ul>
      {done && <div className="mt-4 space-y-2">
        <p className="text-sm">État général enregistré : <strong>{pct} %</strong>. {defects.length ? `${defects.length} point(s) à régler.` : "Aucun défaut détecté."}</p>
        {defects.length > 0 && wear && <Button className="min-h-12 w-full" variant="outline" disabled={repair.isPending} onClick={() => repair.mutate()}>Régler les défauts au garage (prix du garage)</Button>}
        {soon ? <Button className="min-h-12 w-full" disabled={inspect.isPending} onClick={() => inspect.mutate()}>Valider le contrôle technique ({euros(t!.settings.inspection_price)})</Button>
          : <p className="text-xs text-muted-foreground">Le contrôle officiel se valide dans les 2 mois avant l'échéance. Tu peux déjà régler les défauts.</p>}
      </div>}
    </SheetContent>
  </Sheet>;
}
