import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Search, LoaderCircle, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gameMeta } from "@/game/metadata";

type Law = { id: string; title: string; category: string; effects: Record<string, number>; kind: "vigueur" | "reforme"; reference: string; summary: string };
type Position = { template_id: string; party_key: string; vote: "yes" | "no" };
type LawsData = { laws: Law[]; positions: Position[]; parties: Record<string, string>; deputy: boolean };

const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }> };

const lawsQuery = queryOptions({
  queryKey: ["national", "law-library"],
  queryFn: async (): Promise<LawsData> => {
    const [l, p, o, s] = await Promise.all([
      db.from("national_law_templates").select("id,title,category,effects,kind,reference,summary").eq("active", true).order("id"),
      db.from("national_law_positions").select("template_id,party_key,vote"),
      db.from("organizations").select("id,name").eq("kind", "party"),
      db.rpc("national_state"),
    ]);
    if (l.error) throw new Error(l.error.message);
    const parties: Record<string, string> = { divers: "Divers (Sénat)" };
    for (const x of (o.data ?? []) as { id: string; name: string }[]) parties[x.id] = x.name;
    const seats = (s.data?.seats ?? []) as { mine: boolean }[];
    return { laws: l.data as Law[], positions: (p.data ?? []) as Position[], parties, deputy: seats.some(x => x.mine) };
  },
});

const EFFECT_LABEL: Record<string, string> = { housing: "Logement", employment: "Emploi", transport: "Transports", environment: "Environnement", safety: "Sécurité", services: "Services publics", commerce: "Commerce", culture: "Culture", satisfaction: "Satisfaction" };

export const Route = createFileRoute("/_authenticated/_game/lois")({
  head: () => ({ meta: gameMeta("Bibliothèque des lois", "100 vraies lois françaises et grandes réformes débattues, à consulter et proposer au Parlement.") }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(lawsQuery),
  component: LawsPage,
});

function Propose({ law }: { law: Law }) {
  const qc = useQueryClient();
  const [text, setText] = useState(law.summary);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("national_action", { _command: "law", _request_id: crypto.randomUUID(), _input: { template_id: law.id, title: law.title, description: text.trim() } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Proposition déposée au Parlement"); qc.invalidateQueries({ queryKey: ["national"] }); },
    onError: e => toast.error(e.message),
  });
  return <div className="space-y-2 border-t border-border pt-3">
    <Textarea value={text} maxLength={4000} onChange={e => setText(e.target.value)} placeholder="Exposé des motifs" />
    <Button className="h-12 w-full" disabled={text.trim().length < 10 || m.isPending} onClick={() => m.mutate()}>{m.isPending ? <LoaderCircle className="animate-spin" /> : <Send />} Déposer cette proposition</Button>
  </div>;
}

function LawsPage() {
  const { data } = useSuspenseQuery(lawsQuery);
  const [kind, setKind] = useState<"all" | "vigueur" | "reforme">("all");
  const [cat, setCat] = useState("Tous");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const cats = useMemo(() => ["Tous", ...Array.from(new Set(data.laws.map(l => l.category))).sort()], [data.laws]);
  const list = data.laws.filter(l => (kind === "all" || l.kind === kind) && (cat === "Tous" || l.category === cat)
    && (!q || `${l.title} ${l.summary} ${l.reference}`.toLowerCase().includes(q.toLowerCase())));

  return <div className="space-y-5 animate-rise">
    <div className="flex items-center gap-3"><BookOpen className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Bibliothèque des lois</h1><p className="text-sm text-muted-foreground">{data.laws.length} vraies lois françaises et réformes débattues</p></div></div>
    <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">{data.deputy ? "Vous êtes parlementaire : ouvrez une loi pour la déposer au Parlement." : "Seuls les parlementaires peuvent déposer une loi. Tout le monde peut consulter la bibliothèque."}</p>
    <div className="relative"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" /><Input className="h-12 pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une loi (SRU, retraites, SMIC…)" /></div>
    <div className="grid grid-cols-3 gap-2">
      {([["all", "Toutes"], ["vigueur", "En vigueur"], ["reforme", "Réformes"]] as const).map(([k, label]) =>
        <Button key={k} className="h-12" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{label}</Button>)}
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{cats.map(c => <Button key={c} size="sm" className="h-10 shrink-0" variant={cat === c ? "secondary" : "ghost"} onClick={() => setCat(c)}>{c}</Button>)}</div>
    <p className="text-sm text-muted-foreground">{list.length} résultat{list.length > 1 ? "s" : ""}</p>
    <ul className="space-y-3">{list.map(l => {
      const isOpen = open === l.id;
      const pos = data.positions.filter(p => p.template_id === l.id);
      return <li key={l.id} className="rounded-lg border border-border bg-card">
        <button className="w-full p-4 text-left" onClick={() => setOpen(isOpen ? null : l.id)}>
          <p className="text-xs font-semibold text-primary">{l.kind === "vigueur" ? "En vigueur" : "Réforme débattue"} · {l.category}</p>
          <h2 className="font-semibold">{l.title}</h2>
          <p className="text-xs text-muted-foreground">{l.reference}</p>
          <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
        </button>
        {isOpen && <div className="space-y-3 px-4 pb-4">
          <div><p className="mb-1 text-sm font-medium">Effets attendus sur les villes</p><div className="flex flex-wrap gap-2">{Object.entries(l.effects).map(([k, v]) =>
            <span key={k} className={`rounded-full px-3 py-1 text-xs font-medium ${v >= 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{EFFECT_LABEL[k] ?? k} {v > 0 ? "+" : ""}{v}</span>)}</div></div>
          <div><p className="mb-1 text-sm font-medium">Position des groupes</p><ul className="space-y-1">{pos.map(p => <li key={p.party_key} className="flex items-center justify-between text-sm"><span>{data.parties[p.party_key] ?? "Groupe"}</span>
            {p.vote === "yes" ? <span className="flex items-center gap-1 text-primary"><ThumbsUp className="h-4 w-4" />Pour</span> : <span className="flex items-center gap-1 text-destructive"><ThumbsDown className="h-4 w-4" />Contre</span>}</li>)}</ul></div>
          <p className="text-xs text-muted-foreground">Coût pour l'État : 12 000 · effets 24 h après adoption.</p>
          {data.deputy && <Propose law={l} />}
        </div>}
      </li>;
    })}</ul>
  </div>;
}
