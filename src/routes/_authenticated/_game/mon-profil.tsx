import { useStyleLook } from "@/game/style-look";
import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Download, IdCard, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildCardPdf, downloadBlob } from "@/lib/card-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLifeMutation } from "@/components/game/LifeControls";
import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { FictionalSignature, IdentityCard, SIGNATURE_LABELS } from "@/components/game/IdentityDocs";
import { identityQuery, identityUpdate, lifeProfileQuery, orientationAction, orientationQuery, type IdentityCardData, type PublicPrefs } from "@/services/game";
import { CivicProfileCard } from "@/components/game/CivicProfileCard";
import { Switch } from "@/components/ui/switch";
import { APPEARANCE_OPTIONS, normalizeAppearance, type Appearance, type Option } from "@/game/appearance";
import { REPUTATION_LABELS, SKILL_LABELS } from "@/game/life-profile";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/mon-profil")({
  head: () => ({ meta: gameMeta("Mon profil", "Carte d'identité CIVITAS, photo, apparence et signature de votre personnage.") }),
  component: ProfilePage,
});

type Tab = "carte" | "apparence" | "signature" | "public" | "resume";
const GROUPS: { key: keyof Appearance; label: string }[] = [
  { key: "skin", label: "Couleur de peau" }, { key: "hair", label: "Cheveux" }, { key: "hairColor", label: "Couleur des cheveux" },
  { key: "outfit", label: "Vêtements" }, { key: "style", label: "Style" }, { key: "accessory", label: "Accessoire" }, { key: "silhouette", label: "Silhouette" },
];

/** Réduit l'image dans le téléphone avant l'envoi (portrait 300×400, JPEG). Le serveur revérifie type et taille. */
async function shrinkPhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choisissez une image JPEG, PNG ou WEBP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Image trop grande (15 Mo maximum avant réduction).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("Image illisible.")); i.src = url; });
    const W = 300, H = 400, canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
    canvas.getContext("2d")!.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    for (const q of [0.82, 0.7, 0.55, 0.4]) { const out = canvas.toDataURL("image/jpeg", q); if (out.length < 270000) return out; }
    throw new Error("Image trop lourde.");
  } finally { URL.revokeObjectURL(url); }
}

function AppearanceTab({ card }: { card: IdentityCardData }) {
  const { look } = useStyleLook();
  const [a, setA] = useState<Appearance>(normalizeAppearance(card.appearance));
  const fileRef = useRef<HTMLInputElement>(null);
  const save = useLifeMutation(() => identityUpdate("appearance", a), "Apparence enregistrée");
  const photo = useLifeMutation(async (f: File) => identityUpdate("photo", { photo: await shrinkPhoto(f) }), "Photo enregistrée");
  const del = useLifeMutation(() => identityUpdate("delete_photo"), "Photo supprimée");
  const mode = useLifeMutation((v: boolean) => identityUpdate("use_photo", { value: v }), "Choix enregistré");
  return <div className="space-y-4">
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Photo ou avatar</h2>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => mode.mutate(false)} className={`rounded-xl border-2 p-2 ${!card.use_photo ? "border-primary" : "border-border"}`}>
          <div className="mx-auto aspect-[3/4] w-20 overflow-hidden rounded-lg"><CharacterAvatar appearance={a} /></div><p className="mt-1 text-sm font-semibold">Avatar</p></button>
        <button type="button" disabled={!card.photo} onClick={() => mode.mutate(true)} className={`rounded-xl border-2 p-2 disabled:opacity-50 ${card.use_photo ? "border-primary" : "border-border"}`}>
          <div className="mx-auto flex aspect-[3/4] w-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {card.photo ? <img src={card.photo} alt="Ma photo" className="h-full w-full object-cover" /> : <Camera className="text-muted-foreground" />}</div>
          <p className="mt-1 text-sm font-semibold">Ma photo</p></button>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) photo.mutate(f); e.target.value = ""; }} />
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" disabled={photo.isPending} onClick={() => fileRef.current?.click()}><Camera />{card.photo ? "Changer" : "Ajouter une photo"}</Button>
        <Button variant="outline" className="h-12" disabled={!card.photo || del.isPending} onClick={() => del.mutate(undefined)}><Trash2 />Supprimer</Button>
      </div>
      <p className="text-xs text-muted-foreground">La photo est réduite puis gardée uniquement sur le serveur CIVITAS (200 Ko maximum). Vous pouvez la supprimer à tout moment.</p>
    </section>
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Personnaliser l'avatar</h2>
      <div className="mx-auto aspect-[3/4] w-28 overflow-hidden rounded-xl border border-border"><CharacterAvatar appearance={a} look={look} /></div>
      {GROUPS.map(g => <div key={g.key}><p className="mb-1 text-sm font-semibold">{g.label}</p>
        <div className="flex flex-wrap gap-2">{(APPEARANCE_OPTIONS[g.key] as Option[]).map(o =>
          <Button key={o.id} variant={a[g.key] === o.id ? "default" : "outline"} className="h-11" onClick={() => setA({ ...a, [g.key]: o.id })}>
            {o.value && <span className="h-4 w-4 rounded-full border border-border" style={{ background: o.value }} />}{o.label}</Button>)}</div></div>)}
      <Button className="h-12 w-full" disabled={save.isPending} onClick={() => save.mutate(undefined)}>Enregistrer l'apparence</Button>
    </section>
  </div>;
}

function SignatureTab({ card }: { card: IdentityCardData }) {
  const [style, setStyle] = useState(card.signature_style ?? card.settings.signature_styles[0] ?? "classique");
  const [text, setText] = useState(card.signature_text ?? `${card.first_name} ${card.last_name.charAt(0)}.`);
  const save = useLifeMutation(() => identityUpdate("signature", { style, text }), "Signature enregistrée");
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-bold">Ma signature CIVITAS</h2>
    <Input className="h-12" value={text} maxLength={30} onChange={e => setText(e.target.value)} placeholder="Texte de la signature" />
    <div className="grid grid-cols-2 gap-2">{card.settings.signature_styles.map(s =>
      <button key={s} type="button" onClick={() => setStyle(s)} className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 bg-background ${style === s ? "border-primary" : "border-border"}`}>
        <FictionalSignature style={s} text={text || "Signature"} /><span className="text-xs text-muted-foreground">{SIGNATURE_LABELS[s] ?? s}</span></button>)}</div>
    <Button className="h-12 w-full" disabled={save.isPending || text.trim().length < 2} onClick={() => save.mutate(undefined)}>Enregistrer</Button>
    <p className="text-xs text-muted-foreground">Signature fictive du jeu, sans aucune valeur juridique.</p>
  </section>;
}

function SummaryTab() {
  const { data } = useQuery(lifeProfileQuery);
  const top = (axis: "reputation" | "skill") => (data?.dimensions ?? []).filter(d => d.axis === axis).sort((a, b) => b.value - a.value).slice(0, 3);
  return <div className="space-y-3">
    <section className="rounded-xl border border-border bg-card p-4"><h2 className="font-heading text-lg font-bold">Points forts</h2>
      {!data ? <LoaderCircle className="mx-auto animate-spin text-primary" /> : <ul className="mt-2 space-y-1 text-sm">
        {top("reputation").map(d => <li key={d.dimension} className="flex justify-between"><span>{REPUTATION_LABELS[d.dimension]?.label}</span><b>{d.value}</b></li>)}
        {top("skill").map(d => <li key={d.dimension} className="flex justify-between"><span>{SKILL_LABELS[d.dimension]}</span><b>{d.value}</b></li>)}
      </ul>}</section>
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="outline" className="h-12"><Link to="/personnage">Vie et relations</Link></Button>
      <Button asChild variant="outline" className="h-12"><Link to="/ma-vie">Ma vie</Link></Button>
      <Button asChild variant="outline" className="h-12"><Link to="/patrimoine">Patrimoine</Link></Button>
      <Button asChild variant="outline" className="h-12"><Link to="/orientation">Mon orientation</Link></Button>
    </div>
    <p className="text-xs text-muted-foreground">Coffre-fort « Mes documents » : Disponible dans une prochaine étape.</p>
  </div>;
}

function CardTab({ card }: { card: IdentityCardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const prepare = async () => {
    if (!ref.current) return;
    setBusy(true);
    try { setPdf(await buildCardPdf(ref.current)); } catch { toast.error("Impossible de créer le PDF."); } finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <div ref={ref}><IdentityCard card={card} /></div>
    <p className="text-center text-xs text-muted-foreground">DOCUMENT FICTIF — CIVITAS. Numéro et dates attribués par le jeu ; aucune valeur réelle.</p>
    {pdf ? <Button className="h-14 w-full text-base" onClick={() => downloadBlob(pdf, `carte-civitas-${card.last_name.toLowerCase()}.pdf`)}><Download />Télécharger le PDF</Button>
      : <Button variant="outline" className="h-14 w-full text-base" disabled={busy} onClick={prepare}>{busy ? <LoaderCircle className="animate-spin" /> : <Download />}Préparer le PDF à imprimer</Button>}
  </div>;
}

const PREFS: { key: keyof PublicPrefs; label: string }[] = [
  { key: "show_photo", label: "Ma photo" }, { key: "show_party", label: "Mon parti ou « Indépendant »" }, { key: "show_job", label: "Mon métier" },
  { key: "show_orgs", label: "Mes organisations" }, { key: "show_mandates", label: "Mes mandats" }, { key: "show_projects", label: "Mes projets et pétitions" },
  { key: "show_skills", label: "Mes meilleures compétences" },
];
function PublicTab() {
  const { data: st } = useQuery(orientationQuery);
  const act = useLifeMutation((i: Partial<PublicPrefs>) => orientationAction("prefs", i), "Profil public mis à jour");
  if (!st) return <LoaderCircle className="mx-auto animate-spin text-primary" />;
  return <div className="space-y-3">
    <section className="space-y-1 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Ce que les autres joueurs voient</h2>
      {PREFS.map(p => <label key={p.key} className="flex min-h-12 items-center justify-between gap-3 border-b border-border last:border-0">
        <span>{p.label}</span><Switch checked={st.prefs[p.key]} disabled={act.isPending} onCheckedChange={v => act.mutate({ [p.key]: v })} /></label>)}
      <p className="pt-2 text-xs text-muted-foreground">Ne sont jamais publics : adresse, banque, documents, identifiants et numéro de carte.</p>
    </section>
    <p className="text-sm font-semibold">Aperçu de votre profil citoyen</p>
    <CivicProfileCard id={st.me} />
  </div>;
}

function ProfilePage() {
  const { data: card, isLoading, isError } = useQuery(identityQuery);
  const [tab, setTab] = useState<Tab>("carte");
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><IdCard className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Mon profil</h1><p className="text-sm text-muted-foreground">Votre identité dans CIVITAS.</p></div></header>
    <div className="grid grid-cols-5 gap-1">
      {([["carte", "Carte"], ["apparence", "Photo"], ["signature", "Signer"], ["public", "Public"], ["resume", "Résumé"]] as const).map(([id, l]) =>
        <Button key={id} variant={tab === id ? "default" : "outline"} className="h-12 px-0.5 text-xs" onClick={() => setTab(id)}>{l}</Button>)}
    </div>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Mon profil : Disponible dans une prochaine étape.</p>}
    {card && tab === "carte" && <CardTab card={card} />}
    {card && tab === "apparence" && <AppearanceTab card={card} />}
    {card && tab === "signature" && <SignatureTab card={card} />}
    {card && tab === "public" && <PublicTab />}
    {card && tab === "resume" && <SummaryTab />}
  </div>;
}
