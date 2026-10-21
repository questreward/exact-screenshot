import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmCosmeticPayment } from "@/lib/cosmetics.functions";

export const Route = createFileRoute("/paiement-style")({
  validateSearch: (s: Record<string, unknown>): { session?: string; annule?: string } => ({
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}), ...(s["annule"] != null ? { annule: "1" } : {}) }),
  head: () => ({ meta: [
    { title: "Paiement — CIVITAS" },
    { name: "description", content: "Confirmation de votre achat d'objet de style dans CIVITAS." },
    { property: "og:title", content: "Paiement — CIVITAS" },
    { property: "og:description", content: "Confirmation d'achat CIVITAS." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PaymentPage,
});

function PaymentPage() {
  const { session, annule } = Route.useSearch();
  const confirm = useServerFn(confirmCosmeticPayment);
  const [state, setState] = useState<{ paid: boolean; name: string | null } | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (session) confirm({ data: { session } }).then(setState).catch((e) => setErr(e.message)); }, [session]);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-5">
    {annule ? <p className="rounded-xl border border-border bg-card p-4 text-sm">Paiement annulé. Rien n'a été payé.</p>
      : err ? <p className="rounded-xl border border-border bg-card p-4 text-sm">{err}</p>
      : !state ? <LoaderCircle className="animate-spin text-primary" />
      : state.paid ? <><CheckCircle2 className="h-10 w-10 text-primary" /><h1 className="font-heading text-2xl font-bold">Merci !</h1><p>« {state.name} » est ajouté au personnage.</p></>
      : <p className="rounded-xl border border-border bg-card p-4 text-sm">Le paiement n'est pas encore confirmé. Recharge la page dans un instant.</p>}
    <Button asChild className="min-h-12"><Link to="/style">Retour aux objets de style</Link></Button>
  </main>;
}
