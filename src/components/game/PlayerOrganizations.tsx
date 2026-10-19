import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Crown, HandCoins, CalendarPlus, Users, Flag, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { cityLocationsQuery, createOrgEvent, donateToOrganization, foundOrganization, playerOrgQuery, setMemberRole, type OrgKindChoice } from "@/services/game";

const KINDS: { id: OrgKindChoice; label: string; hint: string }[] = [
  { id: "association", label: "Association", hint: "Club, entraide, culture, sport" },
  { id: "movement", label: "Mouvement", hint: "Mouvement citoyen local" },
  { id: "party", label: "Parti politique", hint: "Peut présenter des candidats aux municipales (18 ans)" },
];
const ROLE_LABEL: Record<string, string> = { founder: "Fondateur", manager: "Responsable", member: "Membre" };
const fieldClass = "h-12 w-full rounded-md border border-input bg-background px-3 text-sm";

export function FoundOrganizationCard({ cityId }: { cityId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OrgKindChoice>("association");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const { data: locations } = useQuery({ ...cityLocationsQuery(cityId), enabled: open });
  const navigate = useNavigate();
  const found = useLifeMutation(foundOrganization, "Organisation fondée");
  if (!open) return <Button className="h-12 w-full sm:w-auto" onClick={() => setOpen(true)}><Flag /> Fonder une organisation</Button>;
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5">
    <h2 className="text-xl font-semibold">Fonder une organisation</h2>
    <p className="text-sm text-muted-foreground">Frais de dépôt : 200 crédits, payés une seule fois. La caisse de l'organisation est séparée de votre argent.</p>
    <div className="grid gap-2 sm:grid-cols-3">{KINDS.map(k => <Button key={k.id} variant={kind === k.id ? "default" : "outline"} className="h-auto min-h-14 flex-col items-start whitespace-normal py-2 text-left" onClick={() => setKind(k.id)}><span>{k.label}</span><span className="text-xs opacity-80">{k.hint}</span></Button>)}</div>
    <label className="block space-y-1 text-sm">Nom<Input className="h-12" value={name} maxLength={60} onChange={e => setName(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">Symbole (1 à 4 caractères, ex. un emoji)<Input className="h-12" value={symbol} maxLength={4} onChange={e => setSymbol(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">Description<Textarea value={description} maxLength={500} onChange={e => setDescription(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">Siège<select className={fieldClass} value={locationId} onChange={e => setLocationId(e.target.value)}><option value="">Choisir un lieu…</option>{locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    <div className="flex flex-wrap gap-2">
      <Button className="h-12" disabled={found.isPending || name.trim().length < 3 || !locationId} onClick={() => found.mutate({ kind, name: name.trim(), symbol, description, locationId }, { onSuccess: id => navigate({ to: "/organisations/$id", params: { id: String(id) }, search: { city: cityId } }) })}>{found.isPending ? <LoaderCircle className="animate-spin" /> : <Flag />} Fonder (200 crédits)</Button>
      <Button variant="ghost" className="h-12" onClick={() => setOpen(false)}>Annuler</Button>
    </div>
  </section>;
}

export function PlayerOrgPanel({ orgId }: { orgId: string }) {
  const { data: st, isLoading } = useQuery(playerOrgQuery(orgId));
  const [amount, setAmount] = useState("50");
  const [title, setTitle] = useState("");
  const [hour, setHour] = useState("18");
  const [loc, setLoc] = useState("");
  const { data: locations } = useQuery({ ...cityLocationsQuery(st?.organization.city_id ?? ""), enabled: !!st && (st.my_role === "founder" || st.my_role === "manager") });
  const donate = useLifeMutation(donateToOrganization, "Don versé à la caisse");
  const role = useLifeMutation(setMemberRole, "Rôle mis à jour");
  const event = useLifeMutation(createOrgEvent, "Événement créé");
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!st) return null;
  const leader = st.my_role === "founder" || st.my_role === "manager";
  return <section className="space-y-5 rounded-lg border border-primary/40 bg-card p-5">
    <div className="flex flex-wrap items-center gap-3"><Crown className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Organisation fondée par un joueur</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{st.level}</span></div>
    {st.my_role && <p className="text-sm">Votre rôle : <strong>{ROLE_LABEL[st.my_role]}</strong> · Cotisation : {st.settings.player_weekly_dues} crédits par semaine si vous en avez les moyens</p>}
    {st.balance !== undefined && <div className="space-y-3 border-y border-border py-4">
      <p className="text-sm text-muted-foreground">Caisse de l'organisation</p><p className="text-3xl font-bold">{st.balance} crédits</p>
      <div className="flex flex-wrap gap-2"><Input className="h-12 w-32" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} /><Button className="h-12" disabled={donate.isPending || !Number(amount)} onClick={() => donate.mutate({ orgId, amount: Number(amount) })}><HandCoins /> Faire un don</Button></div>
      <p className="text-xs text-muted-foreground">Un don est définitif : l'argent ne peut pas revenir sur votre compte.</p>
      {!!st.ledger?.length && <ul className="divide-y divide-border text-sm">{st.ledger.map((l, i) => <li key={i} className="flex justify-between py-2"><span>{l.label}</span><span className={l.amount < 0 ? "text-destructive" : "text-success"}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>)}</ul>}
    </div>}
    {leader && <div className="space-y-3">
      <h3 className="font-semibold">Organiser un événement ({st.settings.event_cost} crédits pris dans la caisse)</h3>
      <Input className="h-12" placeholder="Titre (ex. Réunion publique)" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={fieldClass} value={loc} onChange={e => setLoc(e.target.value)}><option value="">Lieu…</option>{locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className={fieldClass} value={hour} onChange={e => setHour(e.target.value)}>{Array.from({ length: 14 }, (_, i) => i + 8).map(h => <option key={h} value={h}>{h} h</option>)}</select>
      </div>
      <Button className="h-12" disabled={event.isPending || title.trim().length < 3 || !loc} onClick={() => event.mutate({ orgId, title: title.trim(), locationId: loc, startHour: Number(hour) }, { onSuccess: () => setTitle("") })}><CalendarPlus /> Créer l'événement</Button>
    </div>}
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Membres ({st.members.length + st.npc_members.length})</h3>
      <ul className="divide-y divide-border text-sm">
        {st.members.map(m => <li key={m.character_id} className="flex min-h-12 items-center justify-between gap-2 py-2"><span>{m.name} · {ROLE_LABEL[m.role] ?? "Membre"}</span>
          {st.my_role === "founder" && m.role !== "founder" && <Button variant="outline" size="sm" className="h-10" disabled={role.isPending} onClick={() => role.mutate({ orgId, characterId: m.character_id, role: m.role === "manager" ? "member" : "manager" })}>{m.role === "manager" ? "Retirer responsable" : "Nommer responsable"}</Button>}</li>)}
        {st.npc_members.map(n => <li key={n.id} className="py-2">{n.name} · Membre · Personnage fictif</li>)}
      </ul>
    </div>
  </section>;
}
