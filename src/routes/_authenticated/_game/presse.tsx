import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, LoaderCircle, Newspaper, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gameMeta } from "@/game/metadata";
import { pressQuery, registerPress, publishArticle, hideArticle, type PressArticle } from "@/services/game";
import { useLifeMutation } from "@/components/game/LifeControls";
import { articleProblem, PRESS_LIMITS } from "@/game/press";
import { moderateArticle } from "@/lib/press-moderation.functions";

export const Route = createFileRoute("/_authenticated/_game/presse")({
  head: () => ({ meta: gameMeta("Presse", "Devenez journaliste dans CIVITAS : écrivez vos articles avec photo, ils passent au JT.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.ensureQueryData(pressQuery); },
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

function Writer() {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [photo, setPhoto] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const publish = useLifeMutation(publishArticle, "Article publié");
  const problem = articleProblem(title, body);
  const submit = async () => {
    setChecking(true);
    try {
      const v = await moderateArticle({ data: { title, body } });
      if (!v.ok) { toast.error(`Article refusé par le filtre automatique${v.reason ? ` : ${v.reason}` : "."}`); return; }
    } catch { /* la base vérifie de toute façon */ } finally { setChecking(false); }
    publish.mutate({ requestId, title: title.trim(), body: body.trim(), photo }, { onSuccess: () => { setTitle(""); setBody(""); setPhoto(null); setRequestId(crypto.randomUUID()); } });
  };
  const busy = checking || publish.isPending;
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Écrire un article</h2>
    <Input className="h-12" value={title} maxLength={PRESS_LIMITS.titleMax} onChange={e => setTitle(e.target.value)} placeholder="Titre" />
    <Textarea className="min-h-48" value={body} maxLength={PRESS_LIMITS.bodyMax} onChange={e => setBody(e.target.value)} placeholder="Votre article…" />
    <p className="text-xs text-muted-foreground">{body.trim().length} / {PRESS_LIMITS.bodyMax} · {PRESS_LIMITS.dailyMax} articles par jour maximum · vérifié automatiquement avant publication</p>
    <PhotoPicker value={photo} onChange={setPhoto} label="Ajouter une photo" maxSide={1000} />
    <Button className="h-12 w-full" disabled={!!problem || busy} onClick={submit}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{checking ? "Vérification…" : "Publier"}</Button>
  </div>;
}

export function ArticleCard({ a, compact = false }: { a: PressArticle; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const hide = useLifeMutation(hideArticle, "Article retiré");
  const date = new Date(a.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return <article className="overflow-hidden rounded-xl border border-border bg-card">
    {a.photo && <img src={a.photo} alt={a.title} loading="lazy" className="aspect-video w-full object-cover" />}
    <div className="space-y-2 p-4">
      <div className="flex items-center gap-2">
        {a.portrait ? <img src={a.portrait} alt={a.author} loading="lazy" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Newspaper className="h-4 w-4" /></div>}
        <div className="min-w-0 text-xs"><p className="truncate font-semibold">{a.author} · {a.outlet}</p><p className="text-muted-foreground">{a.city ? `${a.city} · ` : ""}{date}</p></div>
      </div>
      <h3 className="font-heading text-lg font-bold leading-tight">{a.title}</h3>
      <p className={`whitespace-pre-line text-sm text-muted-foreground ${open || !compact ? "" : "line-clamp-3"}`}>{open || !compact ? a.body : a.body}</p>
      <div className="flex gap-2">
        {compact && <Button variant="link" className="h-10 px-0" onClick={() => setOpen(o => !o)}>{open ? "Réduire" : "Lire la suite"}</Button>}
        {a.mine && !compact && <Button variant="outline" className="h-10" disabled={hide.isPending} onClick={() => hide.mutate({ id: a.id })}><Trash2 />Retirer</Button>}
      </div>
    </div>
  </article>;
}

function PressPage() {
  const { data } = useSuspenseQuery(pressQuery);
  const [editCard, setEditCard] = useState(false);
  return <div className="space-y-5 animate-rise">
    <div className="flex items-center gap-3"><Newspaper className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Presse</h1><p className="text-sm text-muted-foreground">Les articles des joueurs, repris au JT.</p></div></div>
    {data.card && !editCard
      ? <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          {data.card.portrait ? <img src={data.card.portrait} alt="Ma photo" className="h-14 w-14 rounded-full object-cover" /> : <Newspaper className="h-10 w-10 text-primary" />}
          <div className="flex-1"><p className="text-xs text-muted-foreground">Carte de presse</p><p className="font-semibold">{data.card.outlet}</p></div>
          <Button variant="outline" className="h-11" onClick={() => setEditCard(true)}>Modifier</Button>
        </div>
      : <PressCardForm initial={data.card} />}
    {data.card && <Writer />}
    <h2 className="font-heading text-xl font-bold">Derniers articles</h2>
    {data.feed.length ? <div className="grid gap-4 md:grid-cols-2">{data.feed.map(a => <ArticleCard key={a.id} a={a} />)}</div>
      : <p className="text-sm text-muted-foreground">Aucun article pour l'instant. Soyez le premier !</p>}
  </div>;
}
