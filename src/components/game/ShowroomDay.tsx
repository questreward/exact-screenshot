import { useState } from "react";
import { Button } from "@/components/ui/button";
import { suggestCars, visitorsOf } from "@/game/showroom";
import { useWorldClock } from "./WorldClock";
import { dealerShowroomSell, type DealerCar } from "@/services/game";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const OPEN: [string, string][] = [["🔓", "Ouvrir le showroom"], ["🚗", "Vérifier les véhicules exposés"], ["🧽", "Préparer une voiture"], ["📅", "Consulter les rendez-vous"], ["📩", "Lire les demandes des clients"]];
const STEPS = ["Écouter son besoin", "Proposer un véhicule", "Présenter la voiture", "Faire essayer", "Préparer l'offre"];

/** Presentation-only showroom day. Visitors are fictional and never buy; real sales come from players. */
export function ShowroomDay({ stock, soldDays }: { stock: DealerCar[]; soldDays: string[] }) {
  const qc = useQueryClient();
  const [sold, setSold] = useState<string | null>(null);
  const sell = useMutation({ mutationFn: dealerShowroomSell, onSuccess: r => { setSold(`🔑 Vendu : ${r.name} pour ${eur(r.amount)}. La voiture est sortie du stock.`); toast.success("Vente conclue !"); qc.invalidateQueries({ queryKey: ["dealer"] }); }, onError: (e: Error) => toast.error(e.message) });
  const { time } = useWorldClock();
  const day = time.toISOString().slice(0, 10);
  const visitors = visitorsOf(day);
  const soldToday = soldDays.includes(day);
  const nowHm = time.toISOString().slice(11, 16);
  const [open, setOpen] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [car, setCar] = useState<string | null>(null);
  const opened = open.length >= OPEN.length;
  const v = visitors[idx];
  const arrived = visitors.filter(x => x.at <= nowHm).length;

  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">🏬 Ma journée au showroom</h2>
    {!opened ? <div className="space-y-2">
      <p className="text-sm text-muted-foreground">09:00 — ouverture. Prépare le showroom avant l'arrivée des clients.</p>
      {OPEN.map(([e, l], i) => <Button key={l} variant={open.includes(i) ? "secondary" : "outline"} className="min-h-14 w-full justify-between" onClick={() => setOpen(o => o.includes(i) ? o : [...o, i])}><span>{e} {l}</span><span>{open.includes(i) ? "✅" : "Faire"}</span></Button>)}
    </div> : !v ? <p className="rounded-lg bg-muted p-3 text-sm">Plus de visiteurs aujourd'hui. Reviens demain pour de nouveaux clients.</p>
    : idx >= arrived ? <p className="rounded-lg bg-muted p-3 text-sm">⏳ Prochain client vers {v.at}. Le showroom reste ouvert.</p>
    : <div className="space-y-3 animate-page">
      <div className="rounded-xl bg-muted p-3">
        <p className="text-xs text-primary">{v.at} · Client {idx + 1}/{visitors.length} · {v.need}</p>
        <p className="font-semibold">{v.emoji} {v.name}</p>
        <p className="text-sm italic">« {v.quote} »</p>
        {step >= 1 && <p className="mt-1 text-xs text-muted-foreground">Budget annoncé : environ {eur(v.budget)}</p>}
      </div>
      <div className="flex gap-1">{STEPS.map((s, i) => <span key={s} className={`h-2 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />)}</div>
      {step === 1 ? <div className="space-y-2">
        {!stock.some(c => c.quantity > 0) ? <p className="text-sm text-muted-foreground">Ton stock est vide : commande des voitures plus bas pour pouvoir proposer quelque chose.</p>
          : suggestCars(stock, v.budget).map(c => <Button key={c.catalog_id} variant={car === c.catalog_id ? "default" : "outline"} className="min-h-14 w-full justify-between" onClick={() => { setCar(c.catalog_id); setStep(2); }}><span>{c.name}</span><span>{eur(c.price)}</span></Button>)}
      </div> : step < STEPS.length ? <Button className="min-h-14 w-full text-base" onClick={() => setStep(s => s + 1)}>{STEPS[step]}</Button>
      : <div className="space-y-2">
        {sold ? <p className="rounded-lg bg-success/15 p-3 text-sm">{sold} Remise des clés à {v.name} 🎉</p>
          : <p className="rounded-lg bg-muted p-3 text-sm">📝 Offre : {stock.find(c => c.catalog_id === car)?.name ?? "—"} à {eur(stock.find(c => c.catalog_id === car)?.price ?? 0)} (ton tarif).</p>}
        {!sold && (soldToday ? <p className="text-sm text-muted-foreground">{v.name} repart réfléchir : tu as déjà vendu à un client du showroom aujourd'hui (1 par jour).</p>
          : car && <Button className="min-h-14 w-full text-base" disabled={sell.isPending} onClick={() => sell.mutate(car)}>🤝 Négocier et conclure la vente</Button>)}
        <Button variant="outline" className="min-h-14 w-full" onClick={() => { setIdx(i => i + 1); setStep(0); setCar(null); setSold(null); }}>👋 Client suivant</Button>
      </div>}
    </div>}
    <p className="text-xs text-muted-foreground">Un seul client du showroom peut acheter par jour, au prix de ton tarif. L'argent arrive dans la caisse de ta concession.</p>
  </div>;
}
