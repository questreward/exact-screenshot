import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { businessPromoQuery, startBusinessPromo } from "@/services/game";

/** Promotion du patron : 5–30 % pendant 3 jours de jeu, appliquée par le serveur. */
export function BusinessPromo({ businessId }: { businessId: string }) {
  const { data: promo } = useQuery(businessPromoQuery(businessId));
  const [pct, setPct] = useState(10);
  const start = useMutation({ mutationFn: () => startBusinessPromo(pct), onSuccess: () => toast.success(`Promotion −${pct} % lancée pour 3 jours`), onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading font-bold">🏷️ Promotion</p>
      {promo ? <p className="mt-1 text-sm">En cours : <b>−{promo.percent} %</b> jusqu'au {new Date(promo.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Les clients paient moins, tu gagnes moins par client.</p> : <>
        <p className="mt-1 text-sm text-muted-foreground">Baisse ton tarif pendant 3 jours pour attirer des clients.</p>
        <div className="mt-3 grid grid-cols-4 gap-2">{[5, 10, 20, 30].map((v) => (
          <button key={v} type="button" onClick={() => setPct(v)} className={`min-h-12 rounded-xl border text-sm font-semibold ${pct === v ? "border-primary bg-primary/15" : "border-border"}`}>−{v} %</button>))}</div>
        <button type="button" disabled={start.isPending} onClick={() => start.mutate()} className="mt-3 min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{start.isPending ? "Traitement…" : `Lancer −${pct} % pendant 3 jours`}</button>
      </>}
    </div>
  );
}
