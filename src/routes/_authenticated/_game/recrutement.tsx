import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, UserPlus, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recruitQuery, recruitAction } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { serviceAmount } from "@/game/services";

export const Route = createFileRoute("/_authenticated/_game/recrutement")({
  head: () => ({ meta: gameMeta("Recrutement", "Candidats volontaires, offres d’emploi et agences de recrutement dans CIVITAS.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recruitQuery),
  errorComponent: () => <div className="space-y-4 p-4"><h1 className="font-heading text-2xl font-bold">Recrutement</h1><p className="text-muted-foreground">Disponible dans une prochaine étape.</p><Button asChild variant="outline"><Link to="/patrimoine">Patrimoine</Link></Button></div>,
  component: RecruitmentPage,
});
const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

function RecruitmentPage() {
  const { data: s } = useSuspenseQuery(recruitQuery);
  const qc = useQueryClient();
  const [agency, setAgency] = useState("");
  const [candidate, setCandidate] = useState("");
  const [percent, setPercent] = useState(s.mine?.percent ?? 100);
  const act = useMutation({
    mutationFn: (v: { fn: Parameters<typeof recruitAction>[0]; args: Record<string, unknown>; ok: string }) => recruitAction(v.fn, v.args),
    onSuccess: (r, v) => { toast.success(r?.already ? "Déjà enregistré." : v.ok); ["recruitment", "bank", "economy", "services", "life", "character"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const price = useMutation({
    mutationFn: async () => { const { serviceRpc } = await import("@/services/game"); return serviceRpc("service_set_price", { _percent: percent }); },
    onSuccess: () => { toast.success("Tarif enregistré."); qc.invalidateQueries({ queryKey: ["recruitment"] }); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const run = (fn: Parameters<typeof recruitAction>[0], args: Record<string, unknown>, ok: string) => act.mutate({ fn, args, ok });
  const myOffers = s.offers.filter(o => o.mine);
  const offers = s.offers.filter(o => !o.mine && o.delegated && (o.proposed || o.agency === "Agence fictive CIVITAS"));
  return <div className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
    <header className="flex items-center gap-3"><Briefcase className="h-8 w-8 shrink-0 text-primary" /><h1 className="font-heading text-2xl font-bold">Recrutement</h1></header>
    <Tabs defaultValue="emploi">
      <TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger className="min-h-12" value="emploi">Emploi</TabsTrigger><TabsTrigger className="min-h-12" value="employeur">Recruter</TabsTrigger><TabsTrigger className="min-h-12" value="agence">Mon agence</TabsTrigger></TabsList>
      <TabsContent value="emploi" className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-border py-4"><label htmlFor="seeking" className="font-semibold">Je cherche un emploi</label><Switch id="seeking" checked={s.seeking} disabled={act.isPending} onCheckedChange={v => run("recruit_seek", { _active: v }, v ? "Recherche ouverte." : "Recherche retirée.")} /></div>
        {!offers.length && <p className="text-muted-foreground">Aucune proposition pour le moment.</p>}
        {offers.map(o => <article key={o.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><div><h2 className="font-heading font-bold">{o.title}</h2><p className="text-sm text-muted-foreground">{o.business} · {eur(o.salary)} / semaine</p><p className="text-sm">{o.agency}</p></div><Button className="min-h-12 w-full" disabled={act.isPending || !s.seeking} onClick={() => run("recruit_accept", { _offer: o.id }, "Embauche confirmée, sans frais pour toi.")}><UserPlus />Accepter l’emploi</Button></article>)}
        <Button asChild variant="outline" className="min-h-12"><Link to="/carriere">Ma carrière</Link></Button>
      </TabsContent>
      <TabsContent value="employeur" className="space-y-4">
        <label htmlFor="agency" className="block font-semibold">Agence choisie</label>
        <select id="agency" value={agency} onChange={e => setAgency(e.target.value)} className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground"><option value="">Agence fictive CIVITAS · {eur(s.fee)}</option>{s.agencies.map(a => <option key={a.id} value={a.id}>{a.name} · {eur(serviceAmount(s.fee,a.percent))}</option>)}</select>
        {!myOffers.length && <p className="text-muted-foreground">Aucune offre ouverte dans ton entreprise.</p>}
        {myOffers.map(o => <article key={o.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><h2 className="font-heading font-bold">{o.title}</h2><p className="text-sm text-muted-foreground">{eur(o.salary)} / semaine</p>{o.delegated ? <><p className="text-sm">{o.agency} · prime {eur(o.fee ?? 0)}</p><Button variant="outline" className="min-h-12 w-full" disabled={act.isPending} onClick={() => run("recruit_hire_npc", { _offer: o.id }, "Habitant fictif embauché, prime versée.")}><UserPlus />Embaucher un habitant fictif</Button></> : <Button className="min-h-12 w-full" disabled={act.isPending} onClick={() => run("recruit_mandate", { _offer: o.id, _agency: agency || null }, "Offre confiée à l’agence.")}>Confier cette offre</Button>}</article>)}
        <Button asChild variant="outline" className="min-h-12"><Link to="/patrimoine"><Store />Mon entreprise</Link></Button>
      </TabsContent>
      <TabsContent value="agence" className="space-y-4">
        {s.mine ? <>
          <h2 className="font-heading text-xl font-bold">{s.mine.name}</h2><p>Caisse : {eur(s.mine.balance)}</p>
          <label htmlFor="fee" className="block text-sm">Mon tarif · {percent} %</label><input id="fee" type="range" min="70" max="150" step="5" value={percent} onChange={e => setPercent(Number(e.target.value))} className="h-12 w-full accent-primary" /><Button className="min-h-12" disabled={price.isPending || percent===s.mine.percent} onClick={() => price.mutate()}>Enregistrer le tarif</Button>
          <label htmlFor="candidate" className="block font-semibold">Candidat volontaire</label><select id="candidate" className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground" value={candidate} onChange={e => setCandidate(e.target.value)}><option value="">Choisir un candidat</option>{s.mine.candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {!s.mine.mandates.length && <p className="text-muted-foreground">Aucune offre confiée pour le moment.</p>}
          {s.mine.mandates.map(m => <article key={m.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><h3 className="font-heading font-bold">{m.title} · {m.business}</h3><p className="text-sm">Prime convenue : {eur(m.fee)}</p><Button variant="outline" className="min-h-12 w-full" disabled={act.isPending || !candidate} onClick={() => run("recruit_propose", { _offer: m.id, _candidate: candidate }, "Proposition envoyée au candidat.")}>Proposer ce candidat</Button></article>)}
          {s.mine.weeks.map(w => <div key={w.week} className="flex justify-between gap-3 border-b border-border py-3 text-sm"><span>{w.clients} clients fictifs · semaine {w.week}</span><span>{eur(w.revenue)}</span></div>)}
        </> : <><p className="text-muted-foreground">Tu ne diriges pas d’agence de recrutement.</p><Button asChild variant="outline" className="min-h-12"><Link to="/patrimoine">Créer mon entreprise</Link></Button></>}
      </TabsContent>
    </Tabs>
    {s.placements.length>0 && <section className="space-y-3"><h2 className="font-heading text-lg font-bold">Embauches réussies</h2>{s.placements.map((p,i) => <div key={i} className="border-b border-border py-3"><p className="font-semibold">{p.title} · {p.business}</p><p className="text-sm text-muted-foreground">{p.candidate} · prime employeur {eur(p.amount)}</p></div>)}</section>}
  </div>;
}