import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UserPlus, Star, Landmark, Store, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "@/components/game/LifeControls";
import { cancelContact, followPlayer, playerProfileQuery, requestContact, respondContact } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { PlayerActions } from "@/components/game/PlayerActions";

export const Route = createFileRoute("/_authenticated/_game/reseau_/$id")({
  head: () => ({ meta: gameMeta("Profil d'un joueur", "Profil public d'un citoyen de CIVITAS : parcours, engagements et réputation.") }),
  loader: async ({ context: { queryClient: q }, params }) => { await q.ensureQueryData(playerProfileQuery(params.id)); },
  component: ProfilePage,
});

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-muted p-3 text-center"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function ProfilePage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(playerProfileQuery(id));
  const add = useLifeMutation(requestContact, "Demande envoyée");
  const respond = useLifeMutation(respondContact, "Contact accepté");
  const cancel = useLifeMutation(cancelContact, "C'est fait");
  const follow = useLifeMutation(followPlayer, p.following ? "Vous ne suivez plus ce joueur" : "Vous suivez ce joueur");
  return <div className="space-y-5">
    <Button asChild variant="ghost" className="h-12"><Link to="/reseau">← Réseau</Link></Button>
    <section className="space-y-2 rounded-lg border border-border bg-card p-5">
      <h1 className="text-2xl font-bold">{p.name}</h1>
      <p className="text-muted-foreground">{p.age} ans · {p.city}{p.situation ? ` · ${p.situation}` : ""}</p>
      {p.bio && <p className="whitespace-pre-wrap">{p.bio}</p>}
      <p className="text-sm text-muted-foreground">{p.followers} abonné(s) · {p.contacts_count} contact(s)</p>
      {!p.is_me && !p.blocked_by_me && <div className="flex flex-wrap gap-2 pt-2">
        {!p.contact && <Button className="h-12" disabled={add.isPending} onClick={() => add.mutate(p.id)}><UserPlus /> Ajouter en contact</Button>}
        {p.contact?.status === "pending" && p.contact.incoming && <Button className="h-12" disabled={respond.isPending} onClick={() => respond.mutate({ id: p.contact!.id, accept: true })}>Accepter sa demande</Button>}
        {p.contact?.status === "pending" && !p.contact.incoming && <Button variant="outline" className="h-12" disabled={cancel.isPending} onClick={() => cancel.mutate(p.contact!.id)}>Demande envoyée · annuler</Button>}
        {p.contact?.status === "accepted" && <Button variant="outline" className="h-12" disabled={cancel.isPending} onClick={() => cancel.mutate(p.contact!.id)}>Retirer des contacts</Button>}
        <Button variant={p.following ? "secondary" : "outline"} className="h-12" disabled={follow.isPending} onClick={() => follow.mutate({ id: p.id, on: !p.following })}><Star /> {p.following ? "Suivi" : "Suivre"}</Button>
      </div>}
    </section>
    <PlayerActions p={p} />
    <div className="grid grid-cols-3 gap-2"><Stat label="Réputation" value={p.reputation} /><Stat label="Influence" value={p.influence} /><Stat label="Réputation politique" value={p.political_reputation} /></div>
    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
      {p.mandate && <p className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> {p.mandate.function} de {p.mandate.city}</p>}
      {p.job && <p className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> {p.job}</p>}
      {p.business && <p className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> Dirige {p.business.name} ({p.business.sector})</p>}
      <div><p className="flex items-center gap-2 font-semibold"><Users className="h-5 w-5 text-primary" /> Organisations</p>
        {p.organizations.length === 0 ? <p className="text-sm text-muted-foreground">Aucune.</p> : <ul className="mt-1 space-y-1">{p.organizations.map(o =>
          <li key={o.id}><Link className="text-primary underline" to="/organisations/$id" params={{ id: o.id }}>{o.name}</Link> <span className="text-sm text-muted-foreground">· {o.role === "founder" ? "fondateur" : o.role === "manager" ? "responsable" : "membre"}</span></li>)}</ul>}</div>
    </section>
  </div>;
}
