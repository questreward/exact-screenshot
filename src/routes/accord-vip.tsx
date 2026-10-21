import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readVipParent, decideVipParent } from "@/lib/vip.functions";

export const Route = createFileRoute("/accord-vip")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s["t"] === "string" ? { t: s["t"] } : {}),
  head: () => ({ meta: [
    { title: "Accord parental VIP — CIVITAS" },
    { name: "description", content: "Acceptez ou refusez l'abonnement CIVITAS VIP demandé par votre enfant." },
    { property: "og:title", content: "Accord parental VIP — CIVITAS" },
    { property: "og:description", content: "Acceptez ou refusez l'abonnement CIVITAS VIP." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: VipParentPage,
});

function VipParentPage() {
  const { t } = Route.useSearch();
  const read = useServerFn(readVipParent); const decide = useServerFn(decideVipParent);
  const [status, setStatus] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState("");
  useEffect(() => { if (!t) { setErr("Lien invalide."); return; } read({ data: { token: t } }).then((r) => setStatus(r.status)).catch((e) => setErr(e.message)); }, [t]);
  async function go(accept: boolean) {
    setBusy(true);
    try {
      const r = await decide({ data: { token: t!, accept } });
      if (r.kind === "pay") { window.location.href = r.url; return; }
      setDone(r.kind === "refused" ? "Abonnement refusé. Rien n'a été payé." : "Cet abonnement est déjà actif.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  const open = status === "attente_parent" || status === "attente_paiement";
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-5">
    <ShieldCheck className="h-10 w-10 text-primary" />
    <h1 className="font-heading text-2xl font-bold">Accord parental</h1>
    {err && <p className="rounded-xl border border-border bg-card p-4 text-sm">{err}</p>}
    {done && <p className="rounded-xl border border-border bg-card p-4 text-sm">{done}</p>}
    {!err && !done && !status && <LoaderCircle className="animate-spin text-primary" />}
    {status && !done && !err && (open ? <>
      <p className="text-sm">Votre enfant souhaite s'abonner à <b>CIVITAS VIP</b> :</p>
      <div className="rounded-xl border border-border bg-card p-4"><p className="font-bold">2,99 € par mois</p><p className="text-sm text-muted-foreground">Sans engagement, résiliable à tout moment depuis le jeu. Badge, tenues exclusives, thèmes et plus de favoris : aucun avantage pour gagner.</p></div>
      <p className="text-sm text-muted-foreground">Le paiement est sécurisé par Stripe et c'est vous qui payez chaque mois.</p>
      <Button className="min-h-12" disabled={busy} onClick={() => go(true)}>J'accepte et je paie</Button>
      <Button variant="outline" className="min-h-12" disabled={busy} onClick={() => go(false)}>Refuser</Button>
    </> : <p className="rounded-xl border border-border bg-card p-4 text-sm">{status === "actif" ? "Cet abonnement est déjà actif. Merci !" : "Cette demande est terminée. Rien n'a été payé."}</p>)}
  </main>;
}
