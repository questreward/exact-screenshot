import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Car, LoaderCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { transportAction, transportQuery } from "@/services/game";
import { euros } from "@/game/income-tax";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/transports")({
  head: () => ({ meta: gameMeta("Transports", "Abonnement, contrôles, assurance auto, contrôle technique et amendes (fictif).") }),
  component: TransportPage,
});

const day = (s: string) => new Date(s).toLocaleDateString("fr-FR", { timeZone: "UTC" });

function TransportPage() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(transportQuery);
  const act = useMutation({
    mutationFn: (v: { fn: "transit_buy_pass" | "transport_set_without_ticket" | "transport_inspect"; args?: object; ok?: string }) => transportAction(v.fn, v.args),
    onSuccess: (r, v) => { qc.setQueryData(transportQuery.queryKey, r); qc.invalidateQueries({ queryKey: ["bank"] }); if (v.ok) toast.success(v.ok); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Bus className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Transports</h1><p className="text-sm text-muted-foreground">Bus, métro, tram et voiture · FICTIF</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {!isLoading && !s && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>}
    {s && (() => {
      const st = s.settings, p = s.profile;
      const young = !!s.license_at && new Date(s.license_at) > new Date(new Date(s.now).getTime() - st.young_years * 365.25 * 864e5);
      const points = Math.max(0, (young ? st.points_young : st.points_full) - (p?.points_lost ?? 0));
      return <>
        {(p?.debt ?? 0) > 0 && <p className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><TriangleAlert className="h-5 w-5 shrink-0" />Reste à payer : {euros(p!.debt)}. Ta voiture est bloquée jusqu'au règlement (prélevé dès que ton compte le permet).</p>}

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Transports en commun</h2>
          <p className="mb-3 text-sm text-muted-foreground">Ticket : 2 € par trajet. Abonnement mensuel : {euros(st.pass_price)}{s.employed && `, dont ${st.employer_pct} % remboursés par ton employeur`}.</p>
          {s.pass ? <p className="rounded-lg bg-primary/10 p-3 text-sm font-semibold">✓ Abonnement valable tout le mois ({s.pass.month}). Tes trajets sont couverts.</p>
            : <Button className="min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "transit_buy_pass", ok: "Abonnement acheté !" })}>Acheter l'abonnement du mois ({euros(st.pass_price)})</Button>}
          {!s.pass && <label className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <span>Voyager sans ticket<br /><span className="text-xs text-muted-foreground">Risque : 1 contrôle sur {st.control_one_in}, amende de {euros(st.fare_fine)}.</span></span>
            <Switch checked={!!p?.without_ticket} disabled={act.isPending} onCheckedChange={(v) => act.mutate({ fn: "transport_set_without_ticket", args: { _on: v } })} />
          </label>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-base font-bold"><Car className="h-5 w-5 text-primary" />Ma voiture</h2>
          {s.cars.length === 0 ? <p className="text-sm text-muted-foreground">Tu n'as pas de voiture. Elles sont en vente dans la Boutique (permis obligatoire).</p> : <>
            <p className="text-sm">Assurance auto : <b>{euros(young ? st.insurance_young_month : st.insurance_month)}/mois</b>{young && " (jeune conducteur)"}.</p>
            {s.license_at && <p className="text-sm">Points du permis : <b>{points}</b> / {young ? st.points_young : st.points_full}</p>}
            <div className="mt-3 space-y-2">{s.cars.map(c => {
              const late = new Date(c.due_at) <= new Date(s.now);
              const soon = new Date(c.due_at).getTime() - new Date(s.now).getTime() < 60 * 864e5;
              return <div key={c.asset_id} className={`rounded-lg border p-3 text-sm ${late ? "border-destructive" : "border-border"}`}>
                <p className="font-semibold">{c.name}</p>
                <p>Contrôle technique avant le <b>{day(c.due_at)}</b>{late && <span className="text-destructive"> · dépassé, voiture bloquée</span>}</p>
                {soon && <Button className="mt-2 min-h-12 w-full" disabled={act.isPending} onClick={() => act.mutate({ fn: "transport_inspect", args: { _asset: c.asset_id }, ok: "Contrôle technique validé." })}>Passer le contrôle technique ({euros(st.inspection_price)})</Button>}
              </div>;
            })}</div>
            <p className="mt-3 text-xs text-muted-foreground">Radars : excès de vitesse possible ({st.radar_pct} trajets sur 100), {euros(st.radar_fine)} et 1 point.</p>
          </>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-heading text-base font-bold">Historique</h2>
          {s.history.length === 0 ? <p className="text-sm text-muted-foreground">Rien pour l'instant.</p>
            : <ul className="divide-y divide-border text-sm">{s.history.map(h => <li key={h.key} className="flex justify-between gap-2 py-2">
              <span>{h.label}<br /><span className="text-xs text-muted-foreground">{day(h.created_at)}{h.unpaid > 0 && ` · ${euros(h.unpaid)} restant dû`}</span></span>
              <b className={h.kind === "remboursement" ? "text-primary" : ""}>{h.kind === "remboursement" ? "+" : "−"} {euros(h.amount)}</b></li>)}</ul>}
        </section>
      </>;
    })()}
  </div>;
}
