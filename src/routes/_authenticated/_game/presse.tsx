import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Flag, LoaderCircle, Newspaper, Send, Trash2, Tv, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameMeta } from "@/game/metadata";
import { pressQuery, registerPress, hideArticle, mediaQuery, openChannel, publishMedia, subscribeMedia, reportMedia, payMediaOwner,
  type PressArticle, type MediaItem, type MediaState } from "@/services/game";
import { useLifeMutation } from "@/components/game/LifeControls";
import { articleProblem, PRESS_LIMITS } from "@/game/press";
import { indicatorLabel, TONES, type Tone } from "@/game/media";
import { WritingHelper } from "@/components/game/WritingHelper";
import { moderateArticle } from "@/lib/press-moderation.functions";

export const Route = createFileRoute("/_authenticated/_game/presse")({
  head: () => ({ meta: gameMeta("Médias", "Crée ton journal et ta chaîne dans CIVITAS : articles, émissions, abonnés et influence sur ta ville.") }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(pressQuery), q.ensureQueryData(mediaQuery)]); },
  component: PressPage,
});

/** Réduit une photo du téléphone en petite image (≤ 200 Ko environ). */
async function compressImage(file: File, maxSide: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("Image illisible.")); i.src = url; });
    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = Math.min(1, side / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.72);
      if (data.length <= PRESS_LIMITS.photoMax) return data;
      side = Math.round(side * 0.75);
    }
    throw new Error("Photo trop lourde.");
  } finally { URL.revokeObjectURL(url); }
}

function PhotoPicker({ value, onChange, label, maxSide }: { value: string | null; onChange: (v: string | null) => void; label: string; maxSide: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return <div className="flex items-center gap-3">
    {value ? <img src={value} alt="Aperçu de la photo" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted"><Camera className="text-muted-foreground" /></div>}
    <div className="flex flex-1 gap-2">
      <Button type="button" variant="outline" className="h-12 flex-1" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <LoaderCircle className="animate-spin" /> : <Camera />}{label}</Button>
      {value && <Button type="button" variant="ghost" className="h-12" aria-label="Retirer la photo" onClick={() => onChange(null)}><X /></Button>}
    </div>
    <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async e => {
      const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
      setBusy(true); try { onChange(await compressImage(f, maxSide)); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
    }} />
  </div>;
}

function PressCardForm({ initial }: { initial: { outlet: string; portrait: string | null } | null }) {
  const [outlet, setOutlet] = useState(initial?.outlet ?? "");
  const [portrait, setPortrait] = useState<string | null>(initial?.portrait ?? null);
  const save = useLifeMutation(registerPress, initial ? "Carte de presse mise à jour" : "Vous êtes journaliste !");
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">{initial ? "Ma carte de presse" : "Devenir journaliste"}</h2>
    <Input className="h-12" value={outlet} maxLength={60} onChange={e => setOutlet(e.target.value)} placeholder="Nom de votre média (ex. Le Petit Civitas)" />
    <PhotoPicker value={portrait} onChange={setPortrait} label="Ma photo" maxSide={400} />
    <Button className="h-12 w-full" disabled={outlet.trim().length < 3 || save.isPending} onClick={() => save.mutate({ outlet: outlet.trim(), portrait })}>{save.isPending && <LoaderCircle className="animate-spin" />}{initial ? "Enregistrer" : "Obtenir ma carte de presse"}</Button>
  </div>;
}

const selectCls = "h-12 w-full rounded-md border border-input bg-background px-3 text-sm";

function Writer({ media }: { media: MediaState }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [photo, setPhoto] = useState<string | null>(null);
  const [format, setFormat] = useState<"article" | "emission">("article");
  const [tone, setTone] = useState<Tone>("neutre"); const [cited, setCited] = useState(""); const [indicator, setIndicator] = useState("");
  const [checking, setChecking] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const publish = useLifeMutation(publishMedia, format === "emission" ? "Émission diffusée" : "Article publié");
  const problem = articleProblem(title, body);
  const hasChannel = !!media.mine?.channel;
  const submit = async () => {
    setChecking(true);
    try {
      const v = await moderateArticle({ data: { title, body } });
      if (!v.ok) { toast.error(`Refusé par le filtre automatique${v.reason ? ` : ${v.reason}` : "."}`); return; }
    } catch { /* la base vérifie de toute façon */ } finally { setChecking(false); }
    publish.mutate({ requestId, format, title: title.trim(), body: body.trim(), photo, cited: cited || null, tone, indicator: indicator || null },
      { onSuccess: () => { setTitle(""); setBody(""); setPhoto(null); setCited(""); setIndicator(""); setTone("neutre"); setRequestId(crypto.randomUUID()); } });
  };
  const busy = checking || publish.isPending;
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Publier</h2>
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant={format === "article" ? "default" : "outline"} className="h-12" onClick={() => setFormat("article")}><Newspaper />Article</Button>
      <Button type="button" variant={format === "emission" ? "default" : "outline"} className="h-12" disabled={!hasChannel} onClick={() => setFormat("emission")}><Tv />Émission</Button>
    </div>
    {!hasChannel && <p className="text-xs text-muted-foreground">Ouvre ta chaîne dans « Mon média » pour diffuser des émissions.</p>}
    <Input className="h-12" value={title} maxLength={PRESS_LIMITS.titleMax} onChange={e => setTitle(e.target.value)} placeholder={format === "emission" ? "Titre de l'émission" : "Titre"} />
    <Textarea className="min-h-48" value={body} maxLength={PRESS_LIMITS.bodyMax} onChange={e => setBody(e.target.value)} placeholder={format === "emission" ? "Ton texte, comme lu à l'antenne…" : "Ton article…"} />
    <WritingHelper kind="article" max={PRESS_LIMITS.bodyMax} onUse={setBody} />
    <p className="text-xs text-muted-foreground">{body.trim().length} / {PRESS_LIMITS.bodyMax} · {PRESS_LIMITS.dailyMax} publications par jour maximum · vérifié automatiquement</p>
    <PhotoPicker value={photo} onChange={setPhoto} label="Ajouter une photo" maxSide={1000} />
    <details className="rounded-lg bg-muted/50 p-3">
      <summary className="cursor-pointer py-1 text-sm font-semibold">Citer quelqu'un ou un sujet de ville (facultatif)</summary>
      <div className="mt-3 space-y-2">
        <select className={selectCls} value={cited} onChange={e => setCited(e.target.value)} aria-label="Personne citée">
          <option value="">Personne citée : aucune</option>
          {media.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={selectCls} value={indicator} onChange={e => setIndicator(e.target.value)} aria-label="Sujet de la ville">
          <option value="">Sujet de la ville : aucun</option>
          {media.indicators.map(i => <option key={i} value={i}>{indicatorLabel(i)}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map(t => <Button key={t.id} type="button" variant={tone === t.id ? "default" : "outline"} className="h-11" onClick={() => setTone(t.id)}>{t.label}</Button>)}
        </div>
        <p className="text-xs text-muted-foreground">Un ton positif ou critique change un peu la réputation de la personne citée (au plus {media.settings.mention_week_cap} points par semaine) et le sujet de la ville (au plus {media.settings.opinion_week_cap} fois par semaine pour ton média).</p>
      </div>
    </details>
    <Button className="h-12 w-full" disabled={!!problem || busy} onClick={submit}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{checking ? "Vérification…" : format === "emission" ? "Diffuser" : "Publier"}</Button>
  </div>;
}

export function ArticleCard({ a, compact = false }: { a: PressArticle | MediaItem; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const hide = useLifeMutation(hideArticle, "Contenu retiré");
  const report = useLifeMutation(reportMedia, "Signalement envoyé");
  const m = "format" in a ? a : null;
  const show = m?.format === "emission";
  const date = new Date(a.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return <article className={`overflow-hidden rounded-xl border bg-card ${show ? "border-primary/40" : "border-border"}`}>
    {show && <div className="flex items-center gap-2 bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"><Tv className="h-4 w-4" />Émission · {a.outlet}</div>}
    {a.photo && <img src={a.photo} alt={a.title} loading="lazy" className="aspect-video w-full object-cover" />}
    <div className="space-y-2 p-4">
      <div className="flex items-center gap-2">
        {a.portrait ? <img src={a.portrait} alt={a.author} loading="lazy" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Newspaper className="h-4 w-4" /></div>}
        <div className="min-w-0 text-xs"><p className="truncate font-semibold">{a.author} · {a.outlet}</p><p className="text-muted-foreground">{a.city ? `${a.city} · ` : ""}{date}</p></div>
      </div>
      <h3 className="font-heading text-lg font-bold leading-tight">{a.title}</h3>
      {m && (m.cited || m.indicator) && <div className="flex flex-wrap gap-1">
        {m.cited && <Badge variant="secondary">Cite : {m.cited}</Badge>}
        {m.indicator && <Badge variant="secondary">{indicatorLabel(m.indicator)}</Badge>}
        {m.tone !== "neutre" && <Badge variant="outline">{m.tone === "positif" ? "Positif" : "Critique"}</Badge>}
      </div>}
      <p className={`whitespace-pre-line text-sm text-muted-foreground ${show ? "italic" : ""} ${open || !compact ? "" : "line-clamp-3"}`}>{a.body}</p>
      <div className="flex flex-wrap gap-2">
        {compact && <Button variant="link" className="h-10 px-0" onClick={() => setOpen(o => !o)}>{open ? "Réduire" : "Lire la suite"}</Button>}
        {a.mine && !compact && <Button variant="outline" className="h-10" disabled={hide.isPending} onClick={() => hide.mutate({ id: a.id })}><Trash2 />Retirer</Button>}
        {m && !a.mine && !compact && <Button variant="ghost" className="h-10" disabled={m.reported || report.isPending} onClick={() => report.mutate({ id: a.id })}><Flag />{m.reported ? "Signalé" : "Signaler"}</Button>}
      </div>
    </div>
  </article>;
}

function MyMedia({ media }: { media: MediaState }) {
  const mine = media.mine!;
  const [channel, setChannel] = useState(mine.channel ?? "");
  const [amount, setAmount] = useState(String(Math.min(mine.balance, media.settings.owner_pay_max)));
  const open = useLifeMutation(openChannel, mine.channel ? "Chaîne renommée" : "Ta chaîne est ouverte !");
  const pay = useLifeMutation(payMediaOwner, "Rémunération versée sur ton compte");
  const n = Number(amount);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Caisse du média</p><p className="font-heading text-2xl font-bold">{mine.balance} €</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Abonnés joueurs</p><p className="font-heading text-2xl font-bold">{mine.subscribers}</p></div>
    </div>
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Ma chaîne</h2>
      <Input className="h-12" value={channel} maxLength={60} onChange={e => setChannel(e.target.value)} placeholder="Nom de la chaîne (ex. Civitas TV)" />
      <Button className="h-12 w-full" disabled={channel.trim().length < 3 || open.isPending} onClick={() => open.mutate({ name: channel.trim() })}><Tv />{mine.channel ? "Renommer" : "Ouvrir ma chaîne"}</Button>
    </div>
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Me verser une rémunération</h2>
      <p className="text-sm text-muted-foreground">Une fois par semaine, jusqu'à {media.settings.owner_pay_max} €. La caisse du média ne peut pas passer sous zéro.</p>
      <div className="flex gap-2">
        <Input className="h-12" type="number" inputMode="numeric" min={1} max={media.settings.owner_pay_max} value={amount} onChange={e => setAmount(e.target.value)} />
        <Button className="h-12" disabled={mine.paid_this_week || pay.isPending || !(n >= 1 && n <= Math.min(mine.balance, media.settings.owner_pay_max))} onClick={() => pay.mutate({ amount: n })}><Wallet />{mine.paid_this_week ? "Déjà fait" : "Verser"}</Button>
      </div>
    </div>
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Lecteurs fictifs</h2>
      <p className="text-sm text-muted-foreground">Chaque contenu publié dans la semaine attire {media.settings.npc_per_item} lecteurs ; chacun rapporte {media.settings.npc_cents} centimes. Payé au début de la semaine suivante.</p>
      {mine.weeks.length ? <ul className="divide-y divide-border text-sm">{mine.weeks.map(w => <li key={w.week} className="flex justify-between py-2"><span>Semaine {w.week}</span><span>{w.readers} lecteurs · {w.revenue} €</span></li>)}</ul>
        : <p className="text-sm text-muted-foreground">Aucune semaine terminée pour l'instant.</p>}
    </div>
    {mine.ledger.length > 0 && <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Mouvements de la caisse</h2>
      <ul className="divide-y divide-border text-sm">{mine.ledger.map((l, i) => <li key={i} className="flex justify-between gap-2 py-2"><span className="min-w-0 truncate">{l.label}</span><span className={l.amount < 0 ? "text-destructive" : "font-semibold"}>{l.amount > 0 ? "+" : ""}{l.amount} €</span></li>)}</ul>
    </div>}
  </div>;
}

function Outlets({ media }: { media: MediaState }) {
  const sub = useLifeMutation(subscribeMedia, "Abonnement mis à jour");
  if (!media.outlets.length) return <p className="text-sm text-muted-foreground">Aucun média pour l'instant.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{media.outlets.map(o => <div key={o.owner_id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
    {o.portrait ? <img src={o.portrait} alt={o.author} className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Newspaper className="h-5 w-5" /></div>}
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold">{o.outlet}{o.channel ? ` · ${o.channel}` : ""}</p>
      <p className="text-xs text-muted-foreground">{o.author} · {o.items} contenus · {o.subscribers} abonnés</p>
    </div>
    {!o.mine && <Button variant={o.subscribed ? "outline" : "default"} className="h-11 shrink-0" disabled={sub.isPending} onClick={() => sub.mutate({ owner: o.owner_id, on: !o.subscribed })}>
      {o.subscribed ? "Se désabonner" : `S'abonner · ${media.settings.sub_price} €/sem.`}</Button>}
  </div>)}</div>;
}

function PressPage() {
  const { data } = useSuspenseQuery(pressQuery);
  const { data: media } = useSuspenseQuery(mediaQuery);
  const [editCard, setEditCard] = useState(false);
  return <div className="space-y-5 animate-rise">
    <div className="flex items-center gap-3"><Newspaper className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Médias</h1><p className="text-sm text-muted-foreground">Journaux et chaînes des joueurs, repris au JT.</p></div></div>
    <Tabs defaultValue="fil">
      <TabsList className="grid h-auto w-full grid-cols-3">
        <TabsTrigger value="fil" className="h-11">À la une</TabsTrigger>
        <TabsTrigger value="medias" className="h-11">Médias</TabsTrigger>
        <TabsTrigger value="mien" className="h-11">Mon média</TabsTrigger>
      </TabsList>
      <TabsContent value="fil" className="space-y-4">
        {media.feed.length ? <div className="grid gap-4 md:grid-cols-2">{media.feed.map(a => <ArticleCard key={a.id} a={a} />)}</div>
          : <p className="text-sm text-muted-foreground">Rien de publié pour l'instant. Sois le premier !</p>}
      </TabsContent>
      <TabsContent value="medias" className="space-y-3">
        <p className="text-sm text-muted-foreground">Abonne-toi pour soutenir un média : {media.settings.sub_price} € par semaine, payés tant que ton compte le permet. Un contenu signalé par {media.settings.report_hide} joueurs est masqué.</p>
        <Outlets media={media} />
      </TabsContent>
      <TabsContent value="mien" className="space-y-4">
        {data.card && !editCard
          ? <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              {data.card.portrait ? <img src={data.card.portrait} alt="Ma photo" className="h-14 w-14 rounded-full object-cover" /> : <Newspaper className="h-10 w-10 text-primary" />}
              <div className="flex-1"><p className="text-xs text-muted-foreground">Carte de presse</p><p className="font-semibold">{data.card.outlet}</p></div>
              <Button variant="outline" className="h-11" onClick={() => setEditCard(true)}>Modifier</Button>
            </div>
          : <PressCardForm initial={data.card} />}
        {data.card && <Writer media={media} />}
        {media.mine && <MyMedia media={media} />}
      </TabsContent>
    </Tabs>
  </div>;
}
