import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coffee, Send, Ban, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { blockPlayer, formatMoney, inviteTogether, networkQuery, reportPlayer, sendMoney, type PlayerProfile } from "@/services/game";

const REASONS = [["insultes", "Insultes"], ["harcelement", "Harcèlement"], ["arnaque", "Arnaque"], ["contenu", "Contenu choquant"], ["autre", "Autre"]] as const;

export function PlayerActions({ p }: { p: PlayerProfile }) {
  const { data: n } = useQuery(networkQuery);
  const [panel, setPanel] = useState<null | "invite" | "money" | "report">(null);
  const [amount, setAmount] = useState(50);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<string>("insultes");
  const [details, setDetails] = useState("");
  const invite = useLifeMutation(inviteTogether, "Invitation envoyée");
  const money = useLifeMutation(sendMoney, "Virement envoyé");
  const block = useLifeMutation(blockPlayer, p.blocked_by_me ? "Joueur débloqué" : "Joueur bloqué");
  const report = useLifeMutation(reportPlayer, "Signalement envoyé, merci");
  if (p.is_me || !n) return null;
  const contact = p.contact?.status === "accepted";
  const left = n.multiplayer.transfer_daily_max - n.sent_today;
  return <section className="space-y-3 rounded-lg border border-border bg-card p-5">
    {!p.blocked_by_me && contact && <div className="grid grid-cols-2 gap-2">
      <Button variant={panel === "invite" ? "default" : "outline"} className="h-12" onClick={() => setPanel(panel === "invite" ? null : "invite")}><Coffee /> Inviter</Button>
      <Button variant={panel === "money" ? "default" : "outline"} className="h-12" onClick={() => setPanel(panel === "money" ? null : "money")}><Send /> Envoyer de l'argent</Button>
    </div>}
    {!contact && !p.blocked_by_me && <p className="text-sm text-muted-foreground">Ajoutez ce joueur en contact pour l'inviter, lui écrire ou lui envoyer de l'argent.</p>}

    {panel === "invite" && <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Allez d'abord dans un lieu adapté. {p.name.split(" ")[0]} devra vous y rejoindre pour accepter : {n.multiplayer.together_minutes} min, −{n.multiplayer.together_energy} énergie, +{n.multiplayer.together_reputation} réputation chacun.</p>
      <div className="grid gap-2 sm:grid-cols-2">{n.together_kinds.map(k => <Button key={k.id} variant="outline" className="h-12" disabled={invite.isPending} onClick={() => invite.mutate({ id: p.id, kind: k.id }, { onSuccess: () => setPanel(null) })}>{k.label}</Button>)}</div>
    </div>}

    {panel === "money" && <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Votre compte : {formatMoney(n.balance)} · reste aujourd'hui : {formatMoney(left)}</p>
      <Input className="h-12" type="number" min={1} max={left} value={amount} onChange={e => setAmount(Number(e.target.value))} />
      <Input className="h-12" maxLength={120} value={note} onChange={e => setNote(e.target.value)} placeholder="Message (facultatif)" />
      <Button className="h-12 w-full" disabled={money.isPending || amount < 1 || amount > left || amount > n.balance} onClick={() => money.mutate({ id: p.id, amount, note }, { onSuccess: () => { setPanel(null); setNote(""); } })}>Envoyer {formatMoney(amount)}</Button>
    </div>}

    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" className="h-12 text-destructive" disabled={block.isPending} onClick={() => block.mutate({ id: p.id, on: !p.blocked_by_me })}><Ban /> {p.blocked_by_me ? "Débloquer" : "Bloquer"}</Button>
      <Button variant="ghost" className="h-12" onClick={() => setPanel(panel === "report" ? null : "report")}><Flag /> Signaler</Button>
    </div>
    {panel === "report" && <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{REASONS.map(([id, label]) => <Button key={id} variant={reason === id ? "default" : "outline"} className="h-12" onClick={() => setReason(id)}>{label}</Button>)}</div>
      <Textarea maxLength={500} value={details} onChange={e => setDetails(e.target.value)} placeholder="Que s'est-il passé ? (facultatif)" />
      <Button className="h-12 w-full" disabled={report.isPending} onClick={() => report.mutate({ id: p.id, reason, details }, { onSuccess: () => { setPanel(null); setDetails(""); } })}>Envoyer le signalement</Button>
    </div>}
    {!p.blocked_by_me && <p className="text-xs text-muted-foreground">Bloquer retire le contact, les abonnements et les invitations, et empêche tout échange.</p>}
  </section>;
}
