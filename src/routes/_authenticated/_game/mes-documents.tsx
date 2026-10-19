import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronLeft, Download, FolderLock, LoaderCircle, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { documentAction, documentVaultQuery, type DocumentVault, type FormType, type VaultDoc } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { DOC_CATEGORIES, STATUS_LABELS, adminTimeline, categoryLabel, euro, expiresSoon, formProgress, missingRequired, unseen } from "@/game/documents";
import { FictionalSignature } from "@/components/game/IdentityDocs";
import { buildDocPdf } from "@/lib/doc-pdf";
import { downloadBlob } from "@/lib/card-pdf";

export const Route = createFileRoute("/_authenticated/_game/mes-documents")({
  head: () => ({ meta: gameMeta("Mes documents", "Votre coffre-fort administratif CIVITAS : contrats, quittances, impôts et formulaires.") }),
  component: DocumentsPage,
});

const fd = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");
type Tab = "documents" | "formulaires" | "historique";

function DocumentsPage() {
  const { data, isLoading, isError } = useQuery(documentVaultQuery);
  const [tab, setTab] = useState<Tab>("documents");
  const [open, setOpen] = useState<VaultDoc | null>(null);
  const [form, setForm] = useState<FormType | null>(null);
  const qc = useQueryClient();

  const openDoc = (d: VaultDoc) => {
    setOpen(d);
    if (data && !data.seen.includes(d.key)) documentAction("seen", { keys: [d.key] }).then(() => qc.invalidateQueries({ queryKey: ["documents"] })).catch(() => {});
  };

  if (open && data) return <Shell><DocView doc={open} vault={data} onBack={() => setOpen(null)} onCorrect={async () => {
    try { await documentAction("correct", { form_id: open.key.slice(5) }); await qc.invalidateQueries({ queryKey: ["documents"] });
      const t = data.form_types.find(x => x.id === open.data.type_id); setOpen(null); if (t) { setTab("formulaires"); setForm(t); }
    } catch (e) { toast.error((e as Error).message); }
  }} /></Shell>;
  if (form && data) return <Shell><FormEditor type={form} vault={data} onBack={() => setForm(null)} /></Shell>;

  return <Shell>
    <header className="flex items-center gap-3"><FolderLock className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Mes documents</h1>
        <p className="text-sm text-muted-foreground">Ton coffre-fort administratif. Tous les documents sont fictifs.</p></div></header>
    <div className="grid grid-cols-3 gap-2">
      {([["documents", "Documents"], ["formulaires", "Formulaires"], ["historique", "Historique"]] as const).map(([id, l]) =>
        <Button key={id} variant={tab === id ? "default" : "outline"} className="h-12" onClick={() => setTab(id)}>{l}</Button>)}
    </div>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Mes documents : Disponible dans une prochaine étape.</p>}
    {data && tab === "documents" && <DocList vault={data} onOpen={openDoc} />}
    {data && tab === "formulaires" && <FormList vault={data} onOpen={setForm} />}
    {data && tab === "historique" && <History vault={data} />}
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">{children}</div>;
}

function Notices({ vault }: { vault: DocumentVault }) {
  const now = new Date(vault.now);
  const fresh = unseen(vault.documents, vault.seen);
  const soon = vault.documents.filter(d => expiresSoon(d, now));
  const items = [
    ...fresh.slice(0, 3).map(d => `📄 Nouveau document disponible : ${d.title}`),
    ...(fresh.length > 3 ? [`📄 Et ${fresh.length - 3} autre(s) nouveau(x) document(s)`] : []),
    ...vault.deadlines.map(d => `⏰ Échéance : ${d.title} avant le ${fd(d.due_at)}`),
    ...soon.map(d => `⚠️ Document expirant bientôt : ${d.title} (${fd(d.expires_at)})`),
  ];
  if (!items.length) return null;
  return <div className="space-y-1 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
    <p className="flex items-center gap-1 font-semibold"><Bell className="h-4 w-4 text-primary" /> À voir</p>
    {items.map((t, i) => <p key={i}>{t}</p>)}
  </div>;
}

function DocList({ vault, onOpen }: { vault: DocumentVault; onOpen: (d: VaultDoc) => void }) {
  const [cat, setCat] = useState<string>("tous");
  const seen = new Set(vault.seen);
  const docs = vault.documents.filter(d => cat === "tous" || d.category === cat);
  return <div className="space-y-3">
    <Notices vault={vault} />
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {[["tous", "Tous", "📁"] as [string, string, string], ...DOC_CATEGORIES].map(([id, l, e]) => {
        const n = id === "tous" ? vault.documents.length : vault.documents.filter(d => d.category === id).length;
        return <Button key={id} size="sm" variant={cat === id ? "default" : "outline"} className="h-10 shrink-0" onClick={() => setCat(id)}>{e} {l} · {n}</Button>;
      })}
    </div>
    {docs.length === 0 ? <p className="text-sm text-muted-foreground">Aucun document ici pour l'instant. Ils apparaissent tout seuls quand ta vie avance : emploi, logement, impôts…</p>
      : docs.map(d => <button key={d.key} type="button" onClick={() => onOpen(d)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:scale-[0.99]">
        <span className="text-2xl">{DOC_CATEGORIES.find(c => c[0] === d.category)?.[2] ?? "📄"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className="truncate font-semibold">{d.title}</span>
            {!seen.has(d.key) && <span className="rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">NOUVEAU</span>}</span>
          <span className="block text-xs text-muted-foreground">{categoryLabel(d.category)} · {fd(d.at)}{d.expires_at ? ` · expire le ${fd(d.expires_at)}` : ""}</span>
        </span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[d.status] ?? d.status}</span>
      </button>)}
  </div>;
}

/** Lignes du document, calculées à partir des données réelles renvoyées par le serveur. */
function docRows(doc: VaultDoc, vault: DocumentVault): { section: string; rows: [string, string][] }[] {
  const x = doc.data as Record<string, any>;
  const id: [string, string][] = [["Nom", vault.owner.full_name], ["Identifiant CIVITAS", vault.owner.civitas_id], ["Ville", vault.owner.city ?? "—"]];
  switch (doc.kind) {
    case "carte": return [{ section: "Identité", rows: [...id, ["N° de carte", x.doc_number], ["Né(e) le", fd(x.birth_date)], ["À", x.birth_city]] }];
    case "contrat": return [{ section: "Salarié", rows: id }, { section: "Contrat", rows: [["Employeur", x.employer], ["Poste", x.job], ["Lieu", x.place ?? "—"], ["Début", fd(doc.at)], ["Salaire de référence", euro(x.salary)], ["Échelon", String(x.level ?? 0)]] }];
    case "paie": return [{ section: "Salarié", rows: id }, { section: `Période ${x.month}`, rows: [["Versements de salaire", String(x.lines)], ["Total versé", euro(x.gross)], ["Net payé", euro(x.gross)]] }];
    case "bail": return [{ section: "Locataire", rows: id }, { section: "Logement", rows: [["Bailleur", x.landlord], ["Logement", x.housing], ["Adresse", x.address], ["Coût par jour", euro(x.daily)], ["Coût mensuel estimé", euro(x.monthly)]] }];
    case "quittance": return [{ section: "Locataire", rows: id }, { section: `Période ${x.month}`, rows: [["Paiements reçus", String(x.payments)], ["Montant total payé", euro(x.paid)]] }];
    case "releve": return [{ section: "Titulaire", rows: id }, { section: `Mois ${x.month}`, rows: [["Opérations", String(x.count)], ["Total crédits", euro(x.credits)], ["Total débits", euro(x.debits)], ["Solde du mois", euro(Number(x.credits) - Number(x.debits))]] }];
    case "avis": return [{ section: "Contribuable", rows: id }, { section: `Revenus ${x.period}`, rows: [["Revenus déclarés", euro(x.income)], ["Revenus imposables", euro(x.taxable)], ["Impôt calculé", euro(x.tax)], ["Crédit d'impôt (prélèvements déduits)", euro(x.credit)], ["Montant restant", euro(x.net)], ["Date limite", fd(x.due_at)], ["Version", String(x.version)]] }];
    case "echeancier": return [{ section: "Emprunteur", rows: id }, { section: "Prêt", rows: [["Montant emprunté", euro(x.principal)], ["Durée", `${x.months} mois`], ["Taux", `${x.rate} %`], ["Mensualité", euro(x.monthly)]] },
      { section: "Échéances", rows: ((x.installments ?? []) as any[]).map(i => [`N° ${i.n} — ${fd(i.due)}`, `${euro(Number(i.capital) + Number(i.interest) + Number(i.fee))} · ${({ paid: "payée", pending: "à venir", late: "en retard", seized: "saisie", cancelled: "annulée" } as Record<string, string>)[i.status] ?? i.status}`] as [string, string]) }];
    case "assurance": return [{ section: "Assuré", rows: id }, { section: "Contrat", rows: [["Formule", x.product], ["Garanties", (x.covers ?? []).join(", ")], ["Prix mensuel", euro(x.monthly)], ["Mois payés", String(x.months_paid)], ["Prochaine échéance", fd(x.next_due_at)]] }];
    case "consultation": return [{ section: "Patient", rows: id }, { section: "Consultation", rows: [["Date", fd(x.day)], ["Praticien", "Médecin fictif CIVITAS"], ["Conclusion", "Consultation réalisée"]] }];
    case "mandat": return [{ section: "Élu(e)", rows: id }, { section: "Mandat", rows: [["Fonction", x.function], ["Ville", x.city], ["Début", fd(doc.at)], ["Fin prévue", fd(x.ends_at)]] }];
    case "candidature": return [{ section: "Candidat(e)", rows: id }, { section: "Candidature", rows: [["Nom affiché", x.name], ["Slogan", x.slogan], ["Déposée le", fd(doc.at)]] }];
    case "decision": return [{ section: "Demandeur", rows: id }, { section: "Décision", rows: [["Statut", STATUS_LABELS[x.status] ?? x.status], ...Object.entries((x.result ?? {}) as Record<string, unknown>).slice(0, 6).map(([k, v]) => [k.replace(/_/g, " "), typeof v === "object" ? "—" : String(v)] as [string, string])] }];
    case "formulaire": {
      const t = vault.form_types.find(f => f.id === x.type_id);
      return [{ section: "Déclarant", rows: id }, { section: `Réponses — version ${x.version}`, rows: (t?.fields ?? []).map(f => {
        const v = (x.values ?? {})[f.key];
        const shown = v === undefined || v === null ? "—" : f.type === "checkbox" ? (v ? "Oui" : "Non") : f.options ? (f.options.find(o => o[0] === v)?.[1] ?? String(v)) : f.type === "date" ? fd(String(v)) : String(v);
        return [f.label, shown] as [string, string];
      }) }];
    }
    default: return [{ section: "Informations", rows: [...id, ...Object.entries(x).filter(([, v]) => typeof v !== "object").slice(0, 6).map(([k, v]) => [k.replace(/_/g, " "), String(v)] as [string, string])] }];
  }
}

function DocView({ doc, vault, onBack, onCorrect }: { doc: VaultDoc; vault: DocumentVault; onBack: () => void; onCorrect: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const number = (doc.data.doc_number as string | undefined) ?? `CIV-D-${doc.key.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const signed = ["contrat", "bail", "formulaire", "echeancier", "assurance", "candidature", "etat"].includes(doc.kind);
  const pdf = async () => {
    if (!ref.current) return; setBusy(true);
    try { downloadBlob(await buildDocPdf(ref.current), `civitas-${doc.kind}.pdf`); } catch { toast.error("Le PDF n'a pas pu être créé. Réessaie."); } finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <Button variant="ghost" className="h-11" onClick={onBack}><ChevronLeft className="h-5 w-5" /> Retour</Button>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-11" onClick={() => setZoom(z => Math.max(0.8, z - 0.1))}>A−</Button>
      <Button variant="outline" className="h-11" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>A+</Button>
      <Button className="h-11 flex-1" onClick={pdf} disabled={busy}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger en PDF</Button>
      {doc.kind === "formulaire" && <Button variant="outline" className="h-11" onClick={onCorrect}><PencilLine className="h-4 w-4" /> Corriger</Button>}
    </div>
    <div className="overflow-x-auto">
      <div ref={ref} className="relative overflow-hidden rounded-lg border border-border bg-card p-4 text-card-foreground shadow-card" style={{ fontSize: `${zoom * 0.875}rem` }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-24deg] whitespace-nowrap font-heading text-4xl font-black tracking-widest text-primary/10">DOCUMENT FICTIF — CIVITAS</span>
        </div>
        <div className="relative flex items-start justify-between gap-2 border-b-2 border-secondary pb-2">
          <div><p className="font-heading font-black tracking-wider">CIVITAS</p><p className="text-[0.75em] text-muted-foreground">{categoryLabel(doc.category)} · Organisme fictif</p></div>
          <div className="text-right text-[0.75em]"><p className="rounded bg-primary px-1.5 font-bold text-primary-foreground">DOCUMENT FICTIF — CIVITAS</p>
            <p className="mt-1">N° {number}</p><p>Émis le {fd(doc.at)}</p></div>
        </div>
        <h2 className="relative mt-3 font-heading text-[1.15em] font-bold uppercase">{doc.title}</h2>
        <p className="relative text-[0.8em]">Statut : <b>{STATUS_LABELS[doc.status] ?? doc.status}</b>{doc.expires_at ? ` · Valable jusqu'au ${fd(doc.expires_at)}` : ""}</p>
        {docRows(doc, vault).map(s => <section key={s.section} className="relative mt-3">
          <p className="bg-muted px-2 py-1 text-[0.8em] font-bold uppercase tracking-wide">{s.section}</p>
          <table className="w-full text-[0.9em]"><tbody>{s.rows.map(([k, v], i) => <tr key={i} className="border-b border-border/60">
            <td className="py-1 pr-2 text-muted-foreground">{k}</td><td className="py-1 text-right font-medium">{v}</td></tr>)}</tbody></table>
        </section>)}
        {signed && <div className="relative mt-4 flex items-end justify-between gap-2">
          <p className="text-[0.7em] text-muted-foreground">Signature fictive, sans valeur juridique.</p>
          <div className="rounded border border-dashed border-border px-3 py-1 text-center"><FictionalSignature style={vault.owner.signature_style} text={vault.owner.signature_text} /></div>
        </div>}
        <p className="relative mt-4 border-t border-border pt-2 text-center text-[0.7em] text-muted-foreground">Document de jeu généré à partir de tes données CIVITAS. Aucune valeur officielle. · Page 1/1</p>
      </div>
    </div>
  </div>;
}

function FormList({ vault, onOpen }: { vault: DocumentVault; onOpen: (t: FormType) => void }) {
  return <div className="space-y-2">
    <p className="text-sm text-muted-foreground">Remplis, sauvegarde, vérifie, corrige puis valide. C'est le serveur qui contrôle et enregistre la version finale.</p>
    {vault.form_types.map(t => {
      const draft = vault.drafts.find(d => d.type_id === t.id);
      const done = vault.documents.filter(d => d.kind === "formulaire" && d.data.type_id === t.id).length;
      return <button key={t.id} type="button" onClick={() => onOpen(t)} className="w-full rounded-xl border border-border bg-card p-3 text-left">
        <p className="text-xs text-muted-foreground">{categoryLabel(t.category)}</p>
        <p className="font-semibold">{t.title}</p>
        <p className="mt-1 text-xs">{draft ? `Brouillon en cours · ${formProgress(t.fields, draft.data)} %` : "Nouveau"}{done ? ` · ${done} validé(s)` : ""}</p>
      </button>;
    })}
  </div>;
}

function FormEditor({ type, vault, onBack }: { type: FormType; vault: DocumentVault; onBack: () => void }) {
  const qc = useQueryClient();
  const draft = vault.drafts.find(d => d.type_id === type.id);
  const [data, setData] = useState<Record<string, unknown>>(() => ({ ...(draft?.data ?? {}) }));
  const [simple, setSimple] = useState(false);
  const [step, setStep] = useState<"edit" | "check">("edit");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = useRef(false);
  const progress = formProgress(type.fields, data);
  const missing = useMemo(() => missingRequired(type.fields, data), [type.fields, data]);

  // Sauvegarde automatique (brouillon) côté serveur.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setSaving("saving");
      try { await documentAction("save", { type_id: type.id, data }); setSaving("saved"); } catch (e) { setSaving("error"); toast.error((e as Error).message); }
    }, 1200);
    return () => clearTimeout(t);
  }, [data, type.id]);

  const set = (k: string, v: unknown) => { dirty.current = true; setData(d => ({ ...d, [k]: v })); };
  const submit = async () => {
    try { await documentAction("submit", { type_id: type.id, data }); await qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document validé et rangé dans tes documents."); onBack();
    } catch (e) { toast.error((e as Error).message); setStep("edit"); }
  };
  const remove = async () => { try { await documentAction("delete_draft", { type_id: type.id }); await qc.invalidateQueries({ queryKey: ["documents"] }); onBack(); } catch (e) { toast.error((e as Error).message); } };
  const back = async () => { await qc.invalidateQueries({ queryKey: ["documents"] }); onBack(); };
  const fields = simple ? type.fields.filter(f => !f.prefill && (f.required || f.type === "checkbox")) : type.fields;

  return <div className="space-y-3">
    <Button variant="ghost" className="h-11" onClick={back}><ChevronLeft className="h-5 w-5" /> Retour</Button>
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-bold text-primary">DOCUMENT FICTIF — CIVITAS · {categoryLabel(type.category)}</p>
      <h2 className="font-heading text-lg font-bold">{type.title}</h2>
      <p className="text-sm text-muted-foreground">{simple ? type.simple_intro : type.intro}</p>
      <label className="mt-2 flex items-center justify-between gap-2 text-sm">Version simplifiée<Switch checked={simple} onCheckedChange={setSimple} /></label>
      <div className="mt-2 h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      <p className="mt-1 text-xs text-muted-foreground">{progress} % rempli · {saving === "saving" ? "Sauvegarde…" : saving === "saved" ? "Brouillon sauvegardé" : saving === "error" ? "Sauvegarde refusée" : draft ? "Brouillon repris" : "Sauvegarde automatique"}</p>
    </div>

    {step === "edit" ? <>
      {fields.map(f => {
        const known = f.prefill ? vault.prefill[f.prefill] : undefined;
        return <div key={f.key} className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">{f.label}{f.required && !f.prefill ? <span className="text-primary"> *</span> : null}</p>
          {f.help && !simple && <p className="text-xs text-muted-foreground">{f.help}</p>}
          <div className="mt-2">
            {f.prefill ? <p className="rounded-lg bg-muted px-3 py-2 text-sm">{known ?? "Non connu du jeu"} <span className="text-xs text-muted-foreground">· rempli par le jeu</span></p>
              : f.type === "checkbox" ? <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-6 w-6 accent-[hsl(var(--primary))]" checked={data[f.key] === true} onChange={e => set(f.key, e.target.checked)} /><span className="text-sm">Oui</span></label>
              : f.type === "radio" ? <div className="grid grid-cols-2 gap-2">{f.options!.map(([v, l]) => <Button key={v} type="button" variant={data[f.key] === v ? "default" : "outline"} className="h-11" onClick={() => set(f.key, v)}>{l}</Button>)}</div>
              : f.type === "select" ? <select className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={String(data[f.key] ?? "")} onChange={e => set(f.key, e.target.value || null)}>
                  <option value="">Choisir…</option>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <Input className="h-11 text-base" type={f.type} inputMode={f.type === "number" ? "numeric" : undefined} min={f.min} max={f.max}
                  value={String(data[f.key] ?? "")} onChange={e => set(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />}
          </div>
        </div>;
      })}
      <Button className="h-12 w-full" onClick={() => setStep("check")}>Vérifier</Button>
      {draft && <Button variant="ghost" className="h-11 w-full text-destructive" onClick={remove}>Supprimer le brouillon</Button>}
    </> : <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <p className="font-semibold">Vérification</p>
      {type.fields.map(f => {
        const v = f.prefill ? vault.prefill[f.prefill] : data[f.key];
        const shown = v === undefined || v === null || v === "" ? "—" : f.type === "checkbox" ? (v ? "Oui" : "Non") : f.options ? (f.options.find(o => o[0] === v)?.[1] ?? String(v)) : String(v);
        return <p key={f.key} className="flex justify-between gap-2 border-b border-border/60 pb-1 text-sm"><span className="text-muted-foreground">{f.label}</span><span className="text-right font-medium">{shown}</span></p>;
      })}
      {missing.length > 0 && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">À compléter : {missing.join(", ")}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12" onClick={() => setStep("edit")}>Corriger</Button>
        <Button className="h-12" disabled={missing.length > 0} onClick={submit}>Valider</Button>
      </div>
    </div>}
  </div>;
}

function History({ vault }: { vault: DocumentVault }) {
  const items = adminTimeline(vault.documents);
  const names = Object.fromEntries(vault.form_types.map(t => [t.id, t.title]));
  return <div className="space-y-4">
    <h2 className="font-heading text-lg font-bold">Mon historique administratif</h2>
    {items.length === 0 ? <p className="text-sm text-muted-foreground">Ton histoire administrative commence.</p>
      : <ol className="space-y-2 border-l-2 border-primary pl-4">{items.map((e, i) => <li key={i}>
          <p className="text-xs text-muted-foreground">{new Date(e.at).getFullYear()}</p><p className="font-semibold">{e.title}</p></li>)}</ol>}
    {vault.history.length > 0 && <div className="space-y-1">
      <p className="font-semibold">Historique des formulaires</p>
      {vault.history.slice(0, 30).map((h, i) => <p key={i} className="text-sm"><span className="text-muted-foreground">{fd(h.at)}</span> · {names[h.type_id] ?? h.type_id} — {h.action} (v{h.version})</p>)}
    </div>}
  </div>;
}
