import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { furnishingQuery, homeInvitationsQuery, homeInvite, homeInviteRevoke } from "@/services/game";

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["home-visits"] });
}

/** On another player's profile: invite them to visit one of my homes. */
export function InviteHomeButton({ guest }: { guest: string }) {
  const { data: f } = useQuery({ ...furnishingQuery, throwOnError: false });
  const { data: inv } = useQuery({ ...homeInvitationsQuery, throwOnError: false });
  const refresh = useInvalidate();
  const homes = f?.homes ?? [];
  const [home, setHome] = useState("");
  const invited = inv?.sent.some(s => s.id === guest);
  const send = useMutation({ mutationFn: homeInvite, onSuccess: () => { toast.success("Invitation envoyée pour 7 jours."); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const revoke = useMutation({ mutationFn: homeInviteRevoke, onSuccess: () => { toast.success("Invitation retirée."); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  if (!inv || homes.length === 0) return null;
  if (invited) return <Button variant="outline" className="h-12" disabled={revoke.isPending} onClick={() => revoke.mutate(guest)}>🏠 Invité chez moi · retirer</Button>;
  return <div className="flex w-full flex-wrap gap-2">
    {homes.length > 1 && <GameSelect aria-label="Logement à faire visiter" className="h-12 flex-1 rounded-lg border border-input bg-background px-3" value={home} onChange={e => setHome(e.target.value)}>
      {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</GameSelect>}
    <Button className="h-12" disabled={send.isPending} onClick={() => send.mutate({ guest, home: home || homes[0]!.id })}>🏠 Inviter chez moi</Button>
  </div>;
}

/** In "Chez moi": invitations received (go visit) and sent (revoke). */
export function HomeInvitesPanel() {
  const { data } = useQuery({ ...homeInvitationsQuery, throwOnError: false });
  const refresh = useInvalidate();
  const revoke = useMutation({ mutationFn: homeInviteRevoke, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  if (!data) return null;
  return <section className="space-y-3 rounded-2xl bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Visites entre amis</h2>
    {data.received.length === 0 && data.sent.length === 0 && <p className="text-sm text-muted-foreground">Invite un joueur depuis son profil (Réseau) pour lui faire visiter ton logement.</p>}
    {data.received.map(r => <div key={r.id} className="flex items-center gap-2 rounded-xl bg-muted p-3">
      <p className="min-w-0 flex-1 text-sm">🔔 <strong>{r.name}</strong> t'invite chez lui</p>
      <Button asChild className="min-h-12"><Link to="/visite/$id" params={{ id: r.id }}>Visiter</Link></Button></div>)}
    {data.sent.length > 0 && <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Invités chez toi :</p>
      {data.sent.map(s => <div key={s.id} className="flex items-center gap-2 text-sm"><span className="flex-1">{s.name}</span>
        <Button variant="ghost" className="min-h-11" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>Retirer</Button></div>)}
    </div>}
  </section>;
}
