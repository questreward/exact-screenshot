import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, Check, X, MessageCircle, Send, MapPin, LoaderCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLifeMutation } from "@/components/game/LifeControls";
import {
  networkQuery, playerDirectoryQuery, playerThreadQuery, requestContact, respondContact, cancelContact,
  sendPlayerMessage, setPlayerBio, type PlayerCard,
} from "@/services/game";
import { newsDate } from "@/game/news";

export function PlayerRow({ p, children }: { p: PlayerCard; children?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
    <Link to="/reseau/$id" params={{ id: p.id }} className="min-h-12 min-w-0 flex-1">
      <p className="truncate font-semibold">{p.name}</p>
      <p className="truncate text-xs text-muted-foreground">{p.age} ans · {p.city}{p.situation ? ` · ${p.situation}` : ""} · réputation {p.reputation}</p>
    </Link>
    {children}
  </div>;
}

export function NetworkPanel() {
  const [tab, setTab] = useState<"annuaire" | "contacts" | "messages" | "profil">("annuaire");
  const [chat, setChat] = useState<string | null>(null);
  const { data: n } = useQuery(networkQuery);
  if (!n) return <LoaderCircle className="mx-auto animate-spin" />;
  const unread = n.threads.reduce((t, x) => t + x.unread, 0);
  if (chat) return <Chat id={chat} onBack={() => setChat(null)} max={n.settings.message_max} />;
  const tabs = [["annuaire", "Annuaire"], ["contacts", `Contacts${n.incoming.length ? ` (${n.incoming.length})` : ""}`], ["messages", `Messages${unread ? ` (${unread})` : ""}`], ["profil", "Mon profil"]] as const;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tabs.map(([id, label]) =>
      <Button key={id} variant={tab === id ? "default" : "outline"} className="h-12" onClick={() => setTab(id)}>{label}</Button>)}</div>
    {tab === "annuaire" && <Directory />}
    {tab === "contacts" && <Contacts onChat={setChat} />}
    {tab === "messages" && (n.threads.length === 0 ? <p className="text-sm text-muted-foreground">Aucune conversation. Ouvrez un contact pour lui écrire.</p> :
      <div className="space-y-2">{n.threads.map(t => <button key={t.id} onClick={() => setChat(t.other.id)} className="flex min-h-14 w-full items-center justify-between gap-2 rounded-md border border-border p-3 text-left">
        <div className="min-w-0"><p className="font-semibold">{t.other.name}</p><p className="truncate text-sm text-muted-foreground">{t.last_body}</p></div>
        {t.unread > 0 && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{t.unread}</span>}
      </button>)}</div>)}
    {tab === "profil" && <MyProfile bio={n.bio.bio} listed={n.bio.listed} max={n.settings.bio_max} followers={n.followers} me={n.me} />}
  </div>;
}

function Directory() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery(playerDirectoryQuery(q));
  const add = useLifeMutation(requestContact, "Demande envoyée");
  return <div className="space-y-4">
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQ(text.trim()); }}>
      <Input className="h-12" value={text} onChange={e => setText(e.target.value)} placeholder="Chercher un joueur par son nom" />
      <Button type="submit" className="h-12" aria-label="Chercher"><Search /></Button>
    </form>
    {isLoading || !data ? <LoaderCircle className="mx-auto animate-spin" /> : <>
      <div className="space-y-2"><h3 className="flex items-center gap-1 font-semibold"><MapPin className="h-4 w-4" /> Au même endroit que vous</h3>
        {data.here.length === 0 ? <p className="text-sm text-muted-foreground">Personne d'autre ici pour le moment.</p> : data.here.map(p => <PlayerRow key={p.id} p={p} />)}</div>
      <div className="space-y-2"><h3 className="font-semibold">Joueurs de {data.city}</h3>
        {data.players.length === 0 ? <p className="text-sm text-muted-foreground">Aucun joueur trouvé.</p> : data.players.map(p =>
          <PlayerRow key={p.id} p={p}><Button variant="outline" className="h-12 shrink-0" disabled={add.isPending} onClick={() => add.mutate(p.id)} aria-label={`Ajouter ${p.name}`}><UserPlus /></Button></PlayerRow>)}</div>
    </>}
  </div>;
}

function Contacts({ onChat }: { onChat: (id: string) => void }) {
  const { data: n } = useQuery(networkQuery);
  const respond = useLifeMutation(respondContact, "Réponse envoyée");
  const cancel = useLifeMutation(cancelContact, "C'est fait");
  if (!n) return null;
  return <div className="space-y-4">
    {n.incoming.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Demandes reçues</h3>{n.incoming.map(p => <PlayerRow key={p.id} p={p}>
      <Button className="h-12" disabled={respond.isPending} onClick={() => respond.mutate({ id: p.contact_id!, accept: true })} aria-label="Accepter"><Check /></Button>
      <Button variant="outline" className="h-12" disabled={respond.isPending} onClick={() => respond.mutate({ id: p.contact_id!, accept: false })} aria-label="Refuser"><X /></Button>
    </PlayerRow>)}</div>}
    <div className="space-y-2"><h3 className="font-semibold">Mes contacts</h3>
      {n.contacts.length === 0 ? <p className="text-sm text-muted-foreground">Aucun contact. Ajoutez des joueurs depuis l'annuaire.</p> : n.contacts.map(p => <PlayerRow key={p.id} p={p}>
        <Button variant="outline" className="h-12" onClick={() => onChat(p.id)} aria-label={`Écrire à ${p.name}`}><MessageCircle /></Button>
      </PlayerRow>)}</div>
    {n.outgoing.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Demandes envoyées</h3>{n.outgoing.map(p => <PlayerRow key={p.id} p={p}>
      <Button variant="ghost" className="h-12" disabled={cancel.isPending} onClick={() => cancel.mutate(p.contact_id!)}>Annuler</Button></PlayerRow>)}</div>}
    {n.following.length > 0 && <div className="space-y-2"><h3 className="flex items-center gap-1 font-semibold"><Star className="h-4 w-4" /> Personnalités suivies</h3>{n.following.map(p => <PlayerRow key={p.id} p={p} />)}</div>}
  </div>;
}

function Chat({ id, onBack, max }: { id: string; onBack: () => void; max: number }) {
  const { data } = useQuery(playerThreadQuery(id));
  const [body, setBody] = useState("");
  const send = useLifeMutation(sendPlayerMessage, "Message envoyé");
  return <div className="space-y-3">
    <Button variant="ghost" className="h-12" onClick={onBack}>← Retour</Button>
    {!data ? <LoaderCircle className="mx-auto animate-spin" /> : <>
      <h3 className="text-lg font-semibold">{data.other.name}</h3>
      <div className="space-y-2">{data.messages.length === 0 ? <p className="text-sm text-muted-foreground">Aucun message pour l'instant.</p> : data.messages.map(m =>
        <div key={m.id} className={`max-w-[85%] rounded-lg p-3 text-sm ${m.mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
          <p className="whitespace-pre-wrap">{m.body}</p><p className="mt-1 text-[10px] opacity-70">{newsDate(m.sent_at)}</p></div>)}</div>
      {data.can_write ? <div className="space-y-2">
        <Textarea value={body} maxLength={max} onChange={e => setBody(e.target.value)} placeholder="Votre message" />
        <Button className="h-12 w-full" disabled={!body.trim() || send.isPending} onClick={() => send.mutate({ id, body: body.trim() }, { onSuccess: () => setBody("") })}><Send /> Envoyer</Button>
      </div> : <p className="text-sm text-muted-foreground">Vous devez être en contact pour vous écrire.</p>}
    </>}
  </div>;
}

function MyProfile({ bio, listed, max, followers, me }: { bio: string; listed: boolean; max: number; followers: number; me: string }) {
  const [text, setText] = useState(bio);
  const [show, setShow] = useState(listed);
  const save = useLifeMutation(setPlayerBio, "Profil enregistré");
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Les autres joueurs voient votre nom, âge, ville, métier, organisations, mandat, entreprise, réputation, influence et cette présentation. Jamais votre argent, votre agenda ni vos votes.</p>
    <Textarea value={text} maxLength={max} onChange={e => setText(e.target.value)} placeholder="Présentez-vous en quelques mots" />
    <p className="text-xs text-muted-foreground">{text.length} / {max}</p>
    <label className="flex min-h-12 items-center justify-between gap-2"><span>Apparaître dans l'annuaire de la ville</span><Switch checked={show} onCheckedChange={setShow} /></label>
    <Button className="h-12 w-full" disabled={save.isPending} onClick={() => save.mutate({ bio: text, listed: show })}>Enregistrer</Button>
    <p className="text-sm">{followers} abonné(s) · <Link className="text-primary underline" to="/reseau/$id" params={{ id: me }}>Voir mon profil public</Link></p>
  </div>;
}
