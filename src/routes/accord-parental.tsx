import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readParentRequest, decideParentRequest } from "@/lib/cosmetics.functions";

export const Route = createFileRoute("/accord-parental")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s["t"] === "string" ? { t: s["t"] } : {}),
  head: () => ({ meta: [
    { title: "Accord parental — CIVITAS" },
    { name: "description", content: "Acceptez ou refusez l'achat d'un objet de style demandé par votre enfant dans CIVITAS." },
    { property: "og:title", content: "Accord parental — CIVITAS" },
    { property: "og:description", content: "Acceptez ou refusez un achat demandé dans CIVITAS." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ParentPage,
});

type Req = { status: string; price: string; name: string; description: string };

function ParentPage() {
  const { t } = Route.useSearch();
  const read = useServerFn(readParentRequest); const decide = useServerFn(decideParentRequest);
  const [req, setReq] = useState<Req | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState("");
  useEffect(() => { if (!t) { setErr("Lien invalide."); return; } read({ data: { token: t } }).then(setReq).catch((e) => setErr(e.message)); }, [t]);
  async function go(accept: boolean) {
    setBusy(true);
    try {
      const r = await decide({ data: { token: t!, accept } });
      if (r.kind === "pay") { window.location.href = r.url; return; }
      setDone(r.kind === "refused" ? "Achat refusé. Rien n'a été payé." : "Cet achat est déjà payé.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-5">
    <ShieldCheck className="h-10 w-10 text-primary" />
    <h1 className="font-heading text-2xl font-bold">Accord parental</h1>
    {err && <p className="rounded-xl border border-border bg-card p-4 text-sm">{err}</p>}
    {done && <p className="rounded-xl border border-border bg-card p-4 text-sm">{done}</p>}
    {!err && !done && !req && <LoaderCircle className="animate-spin text-primary" />}
    {req && !done && !err && (req.status === "attente_parent" || req.status === "attente_paiement" ? <>
      <p className="text-sm">Votre enfant souhaite acheter dans le jeu CIVITAS :</p>
      <div className="rounded-xl border border-border bg-card p-4"><p className="font-heading font-semibold">{req.name}</p><p className="text-sm text-muted-foreground">{req.description}</p><p className="mt-2 font-bold">{req.price}, paiement unique</p></div>
      <p className="text-sm text-muted-foreground">Cet objet change seulement l'apparence, sans aucun avantage dans le jeu. Le paiement est sécurisé par Stripe et c'est vous qui payez.</p>
      <Button className="min-h-12" disabled={busy} onClick={() => go(true)}>J'accepte et je paie</Button>
      <Button variant="outline" className="min-h-12" disabled={busy} onClick={() => go(false)}>Refuser</Button>
    </> : <p className="rounded-xl border border-border bg-card p-4 text-sm">{req.status === "paye" ? "Cet achat est déjà payé. Merci !" : "Vous avez refusé cet achat. Rien n'a été payé."}</p>)}
  </main>;
}
