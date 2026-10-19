import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, Hammer, UserPlus, UserMinus, Briefcase, PiggyBank, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLifeMutation } from "@/components/game/LifeControls";
import {
  businessClose, businessCloseOffer, businessDeposit, businessFireNpc, businessHireNpc, businessJoin, businessLeave,
  businessOpenOffer, businessQuery, businessSetOwnerSalary, businessWork, formatMoney, foundBusiness, type BusinessState,
} from "@/services/game";
import { weeklyCosts } from "@/game/business";
import { BusinessTaxes } from "@/components/game/BusinessTaxes";

export function BusinessCard() {
  const { data: s, isLoading } = useQuery(businessQuery);
  if (isLoading || !s) return null;
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5">
    <div className="flex items-center gap-2"><Store className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Entreprise</h2></div>
    {s.business ? <MyBusiness s={s} /> : <FoundForm s={s} />}
    <EmployeeSide s={s} />
  </section>;
}

function FoundForm({ s }: { s: BusinessState }) {
  const [sector, setSector] = useState(s.sectors[0]?.id ?? "");
  const [name, setName] = useState("");
  const sec = s.sectors.find(x => x.id === sector);
  const [capital, setCapital] = useState(sec?.min_capital ?? 1000);
  const found = useLifeMutation(foundBusiness, "Entreprise créée");
  if (s.age < s.settings.min_age) return <p className="text-sm text-muted-foreground">Créer une entreprise est possible dès {s.settings.min_age} ans.</p>;
  const total = s.settings.founding_fee + capital;
  return <div className="space-y-3">
    {s.last_closed && <p className="text-sm text-muted-foreground">{s.last_closed.name} : {s.last_closed.status === "failed" ? "faillite" : "fermée"}.</p>}
    <p className="text-sm text-muted-foreground">Choisissez un secteur, un nom et un capital de départ. Le capital va dans la caisse de l'entreprise, séparée de votre compte.</p>
    <div className="grid gap-2 sm:grid-cols-2">{s.sectors.map(x => <button key={x.id} type="button" onClick={() => { setSector(x.id); setCapital(Math.max(capital, x.min_capital)); }}
      className={`min-h-12 rounded-md border p-3 text-left ${x.id === sector ? "border-primary bg-primary/10" : "border-border"}`}>
      <p className="font-semibold">{x.label}</p><p className="text-xs text-muted-foreground">{x.description}</p>
      <p className="text-xs text-muted-foreground">Capital min. {formatMoney(x.min_capital)} · loyer {formatMoney(x.weekly_rent)}/sem.</p>
    </button>)}</div>
    <Input className="h-12" placeholder="Nom de l'entreprise" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
    <label className="block text-sm">Capital de départ
      <Input className="mt-1 h-12" type="number" min={sec?.min_capital} value={capital} onChange={e => setCapital(Number(e.target.value))} /></label>
    <p className="text-sm">Total à payer : <b>{formatMoney(total)}</b> (frais de dépôt {formatMoney(s.settings.founding_fee)} + capital) · votre compte : {formatMoney(s.balance)}</p>
    <Button className="h-12 w-full" disabled={found.isPending || name.trim().length < 3 || !sec || capital < sec.min_capital || total > s.balance}
      onClick={() => found.mutate({ name: name.trim(), sector, capital })}>{found.isPending ? <LoaderCircle className="animate-spin" /> : <Store />} Créer l'entreprise</Button>
  </div>;
}

function MyBusiness({ s }: { s: BusinessState }) {
  const b = s.business!;
  const [deposit, setDeposit] = useState(200);
  const [salary, setSalary] = useState(b.owner_salary);
  const [offerTitle, setOfferTitle] = useState("Vendeur");
  const [offerSalary, setOfferSalary] = useState(100);
  const [confirmClose, setConfirmClose] = useState(false);
  const work = useLifeMutation(businessWork, "Service commencé");
  const dep = useLifeMutation(businessDeposit, "Apport versé");
  const sal = useLifeMutation(businessSetOwnerSalary, "Salaire enregistré");
  const hire = useLifeMutation(businessHireNpc, "Employé embauché");
  const fire = useLifeMutation(businessFireNpc, "Employé licencié");
  const open = useLifeMutation(businessOpenOffer, "Offre publiée");
  const closeOffer = useLifeMutation(businessCloseOffer, "Offre retirée");
  const leave = useLifeMutation(businessLeave, "Contrat terminé");
  const close = useLifeMutation(businessClose, "Entreprise fermée");
  const costs = weeklyCosts(b.sector, b.npc_staff.length, b.employees.reduce((t, e) => t + e.weekly_salary, 0), b.owner_salary);
  return <div className="space-y-4">
    <div className="rounded-md bg-muted p-3">
      <p className="text-lg font-semibold">{b.name}</p>
      <p className="text-sm text-muted-foreground">{b.sector.label} · {b.location_name}, {b.city_name}</p>
      <p className="mt-2 text-2xl font-bold">{formatMoney(b.treasury)} <span className="text-sm font-normal text-muted-foreground">en caisse</span></p>
      <p className="text-sm text-muted-foreground">Charges prévues : {formatMoney(costs)} / semaine · services cette semaine : {b.shifts_this_week}</p>
      {b.strikes > 0 && <p className="mt-1 text-sm text-destructive">Attention : {b.strikes} semaine(s) sans pouvoir tout payer. Faillite à {s.settings.fail_strikes}.</p>}
    </div>
    <Button className="h-12 w-full" disabled={work.isPending} onClick={() => work.mutate(b.id)}><Hammer /> Travailler ({s.settings.shift_minutes / 60} h, −{s.settings.shift_energy} énergie)</Button>
    <p className="text-xs text-muted-foreground">Chaque service ajoute environ {formatMoney(b.sector.per_shift)} au chiffre d'affaires de la semaine. Le bilan est fait à la fin de chaque semaine de jeu.</p>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><p className="font-semibold">Apport personnel</p>
        <div className="flex gap-2"><Input className="h-12" type="number" min={1} value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
          <Button className="h-12" variant="outline" disabled={dep.isPending || deposit < 1} onClick={() => dep.mutate({ biz: b.id, amount: deposit })}><PiggyBank /> Verser</Button></div></div>
      <div className="space-y-2"><p className="font-semibold">Mon salaire (max {formatMoney(s.settings.max_owner_salary)}/sem.)</p>
        <div className="flex gap-2"><Input className="h-12" type="number" min={0} max={s.settings.max_owner_salary} value={salary} onChange={e => setSalary(Number(e.target.value))} />
          <Button className="h-12" variant="outline" disabled={sal.isPending} onClick={() => sal.mutate({ biz: b.id, amount: salary })}>Valider</Button></div></div>
    </div>

    <div className="space-y-2"><p className="font-semibold">Équipe fictive ({b.npc_staff.length}/{b.sector.max_npc}) · {formatMoney(b.sector.npc_wage)}/sem. chacun</p>
      {b.npc_staff.map(n => <div key={n.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
        <p className="text-sm">{n.name} <span className="text-muted-foreground">· {n.profession}</span></p>
        <Button variant="ghost" className="h-12" disabled={fire.isPending} onClick={() => fire.mutate({ biz: b.id, npc: n.id })} aria-label={`Licencier ${n.name}`}><UserMinus /></Button></div>)}
      <Button variant="outline" className="h-12 w-full" disabled={hire.isPending || b.npc_staff.length >= b.sector.max_npc} onClick={() => hire.mutate(b.id)}><UserPlus /> Embaucher un habitant</Button>
    </div>

    <div className="space-y-2"><p className="font-semibold">Salariés joueurs</p>
      {b.employees.length === 0 && <p className="text-sm text-muted-foreground">Aucun pour l'instant. Publiez une offre : les joueurs de votre ville pourront la prendre.</p>}
      {b.employees.map(e => <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
        <p className="text-sm">{e.name} · {e.title} · {formatMoney(e.weekly_salary)}/sem.</p>
        <Button variant="ghost" className="h-12" disabled={leave.isPending} onClick={() => leave.mutate(e.id)} aria-label={`Mettre fin au contrat de ${e.name}`}><UserMinus /></Button></div>)}
      {b.offers.map(o => <div key={o.id} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border p-2">
        <p className="text-sm">Offre : {o.title} · {formatMoney(o.weekly_salary)}/sem.</p>
        <Button variant="ghost" className="h-12" disabled={closeOffer.isPending} onClick={() => closeOffer.mutate(o.id)} aria-label="Retirer l'offre"><X /></Button></div>)}
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <Input className="h-12" value={offerTitle} onChange={e => setOfferTitle(e.target.value)} placeholder="Intitulé du poste" />
        <Input className="h-12" type="number" min={s.settings.min_player_salary} max={s.settings.max_player_salary} value={offerSalary} onChange={e => setOfferSalary(Number(e.target.value))} />
        <Button className="h-12" variant="outline" disabled={open.isPending} onClick={() => open.mutate({ biz: b.id, title: offerTitle, salary: offerSalary })}><Briefcase /> Publier</Button>
      </div>
    </div>

    <div className="space-y-1"><p className="font-semibold">Bilans des dernières semaines</p>
      {b.weeks.length === 0 ? <p className="text-sm text-muted-foreground">Premier bilan à la fin de la semaine de jeu.</p> :
        b.weeks.map(w => <p key={w.week} className="text-sm">Semaine {w.week % 52 + 1} · recettes {formatMoney(w.revenue)} · charges {formatMoney(w.costs)} ·{" "}
          <b className={w.revenue - w.costs >= 0 ? "text-primary" : "text-destructive"}>{w.revenue - w.costs >= 0 ? "+" : ""}{formatMoney(w.revenue - w.costs)}</b>
          <span className="text-muted-foreground"> · {w.workers} pers., {w.shifts} services</span></p>)}
    </div>

    <BusinessTaxes />

    {confirmClose ? <div className="flex gap-2">
      <Button variant="destructive" className="h-12 flex-1" disabled={close.isPending} onClick={() => close.mutate(b.id)}>Confirmer la fermeture</Button>
      <Button variant="outline" className="h-12" onClick={() => setConfirmClose(false)}>Annuler</Button></div>
      : <Button variant="ghost" className="h-12 w-full text-destructive" onClick={() => setConfirmClose(true)}>Fermer l'entreprise (le solde de la caisse vous revient)</Button>}
  </div>;
}

function EmployeeSide({ s }: { s: BusinessState }) {
  const work = useLifeMutation(businessWork, "Service commencé");
  const join = useLifeMutation(businessJoin, "Vous êtes embauché");
  const leave = useLifeMutation(businessLeave, "Vous avez démissionné");
  return <div className="space-y-2 border-t border-border pt-4">
    <h3 className="font-semibold">Travailler pour un autre joueur</h3>
    {s.job ? <div className="space-y-2 rounded-md border border-border p-3">
      <p className="font-semibold">{s.job.title} chez {s.job.business_name}</p>
      <p className="text-sm text-muted-foreground">{formatMoney(s.job.weekly_salary)} / semaine, versé à la fin de chaque semaine si la caisse le permet · services cette semaine : {s.job.shifts_this_week}</p>
      <div className="flex gap-2">
        <Button className="h-12 flex-1" disabled={work.isPending} onClick={() => work.mutate(s.job!.business_id)}><Hammer /> Travailler</Button>
        <Button variant="outline" className="h-12" disabled={leave.isPending} onClick={() => leave.mutate(s.job!.id)}>Démissionner</Button>
      </div>
    </div> : s.offers.length === 0 ? <p className="text-sm text-muted-foreground">Aucune offre d'un joueur dans votre ville pour le moment.</p> :
      s.offers.map(o => <div key={o.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
        <div><p className="font-semibold">{o.title}</p><p className="text-xs text-muted-foreground">{o.business_name} · {o.sector} · {formatMoney(o.weekly_salary)}/sem.</p></div>
        <Button className="h-12 shrink-0" disabled={join.isPending} onClick={() => join.mutate(o.id)}>Postuler</Button></div>)}
    {s.pay_history.length > 0 && <div className="text-xs text-muted-foreground">{s.pay_history.map((p, i) => <p key={i}>{p.label} : +{formatMoney(p.amount)}</p>)}</div>}
  </div>;
}
