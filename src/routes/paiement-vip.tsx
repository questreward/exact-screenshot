import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmVip } from "@/lib/vip.functions";

export const Route = createFileRoute("/paiement-vip")({
  validateSearch: (s: Record<string, unknown>): { session?: string; annule?: string } => ({
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}), ...(s["annule"] != null ? { annule: "1" } : {}) }),
  head: () => ({ meta: [
    { title: "Abonnement VIP — CIVITAS" },
    { name: "description", content: "Confirmation de l'abonnement CIVITAS VIP." },
    { property: "og:title", content: "Abonnement VIP — CIVITAS" },
    { property: "og:description", content: "Confirmation de l'abonnement CIVITAS VIP." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: VipPaymentPage,
});

function VipPaymentPage() {
  const { session, annule } = Route.useSearch();
  const confirm = useServerFn(confirmVip);
  const [paid, setPaid] = useState<boolean | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (session) confirm({ data: { session } }).then((r) => setPaid(r.paid)).catch((e) => setErr(e.message)); }, [session]);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-5">
    {annule ? <p className="rounded-xl border border-border bg-card p-4 text-sm">Abonnement annulé. Rien n'a été payé.</p>
      : err ? <p className="rounded-xl border border-border bg-card p-4 text-sm">{err}</p>
      : paid === null ? <LoaderCircle className="animate-spin text-primary" />
      : paid ? <><CheckCircle2 className="h-10 w-10 text-primary" /><h1 className="font-heading text-2xl font-bold">Bienvenue chez les VIP ⭐</h1><p>Ton abonnement est actif. Tes objets exclusifs t'attendent sur la page VIP.</p></>
      : <p className="rounded-xl border border-border bg-card p-4 text-sm">Le paiement n'est pas encore confirmé. Recharge la page dans un instant.</p>}
    <Button asChild className="min-h-12"><Link to="/vip">Aller à la page VIP</Link></Button>
  </main>;
}
