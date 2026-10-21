import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gameMeta } from "@/game/metadata";
import { characterQuery } from "@/services/game";
import { vipStatus, startVip, cancelVip, claimVipItems } from "@/lib/vip.functions";
import { VIP_FLAG } from "@/game/place-memory";
import { PHONE_THEMES, usePhoneTheme } from "@/game/phone-theme";

export const Route = createFileRoute("/_authenticated/_game/vip")({
  head: () => ({ meta: gameMeta("CIVITAS VIP", "Abonnement CIVITAS VIP à 2,99 € par mois : badge, tenues exclusives, thèmes du téléphone et plus de favoris, sans avantage pour gagner.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(characterQuery),
  component: VipPage,
});

const PERKS = [
  { e: "⭐", t: "Badge VIP", d: "Visible sur ton profil public." },
  { e: "👔", t: "Tenues et cadres exclusifs", d: "Tenue de gala et cadre « Étoile », réservés aux VIP." },
  { e: "📱", t: "Thèmes du téléphone", d: "Corail, Ardoise ou Nuit étoilée." },
  { e: "📍", t: "24 lieux favoris", d: "Au lieu de 12 sur la carte." },
];

function VipPage() {
  const { data: ch } = useSuspenseQuery(characterQuery);
  const minor = (ch?.age ?? 18) < 18;
  const read = useServerFn(vipStatus); const start = useServerFn(startVip); const cancel = useServerFn(cancelVip); const claim = useServerFn(claimVipItems);
  const qc = useQueryClient();
  const { data: st, refetch } = useQuery({ queryKey: ["vip-status"], queryFn: () => read(), retry: false });
  const [email, setEmail] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const theme = usePhoneTheme();
  const active = st?.status === "actif";
  useEffect(() => { if (st) try { localStorage.setItem(VIP_FLAG, active ? "1" : "0"); } catch { /* */ } }, [st, active]);

  async function act(fn: () => Promise<unknown>, msg?: string) {
    setBusy(true);
    try { await fn(); if (msg) toast.success(msg); await refetch(); qc.invalidateQueries({ queryKey: ["cosmetics"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  async function subscribe() {
    setBusy(true);
    try {
      const r = await start({ data: minor ? { parentEmail: email } : {} });
      if (r.kind === "pay") { window.location.href = r.url; return; }
      toast.success("Email envoyé à ton parent"); await refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  const until = st?.periodEnd ? new Date(st.periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rounded-2xl bg-secondary p-5 text-secondary-foreground">
        <p className="font-heading text-2xl font-bold">⭐ CIVITAS VIP</p>
        <p className="mt-1 text-sm opacity-90">2,99 € par mois · sans engagement · résiliable à tout moment</p>
        <p className="mt-2 text-xs opacity-80">Le VIP ne donne aucun avantage pour gagner : ni argent du jeu, ni énergie, ni votes. Seulement du style et du confort.</p>
      </header>
      <ul className="grid grid-cols-2 gap-3">{PERKS.map((p) => (
        <li key={p.t} className="rounded-xl border border-border bg-card p-3"><span className="text-2xl">{p.e}</span><p className="font-semibold">{p.t}</p><p className="text-xs text-muted-foreground">{p.d}</p></li>))}</ul>

      {!st ? <p className="text-sm text-muted-foreground">Chargement…</p> : active ? (
        <section className="space-y-3 rounded-xl border border-primary bg-card p-4">
          <h1 className="font-heading text-lg font-bold">Mon abonnement</h1>
          <p className="text-sm">{st.cancelAtEnd ? `Résilié : tu restes VIP jusqu'au ${until}, puis rien ne sera plus payé.` : `Actif · prochain paiement de 2,99 € le ${until}.`}</p>
          <Button className="min-h-12 w-full" disabled={busy} onClick={() => act(() => claim(), "Objets exclusifs ajoutés à ta garde-robe")}>Recevoir mes objets exclusifs</Button>
          <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/style">Porter mes tenues et cadres</Link></Button>
          <div><p className="text-sm font-semibold">Thème du téléphone</p><div className="mt-2 grid grid-cols-2 gap-2">{PHONE_THEMES.map((t) => (
            <button key={t.id} type="button" onClick={() => theme.choose(t.id)} className={`min-h-12 rounded-xl border text-sm ${theme.id === t.id ? "border-primary bg-primary/15 font-semibold" : "border-border"}`}>{t.label}</button>))}</div></div>
          {!st.cancelAtEnd && <Button variant="outline" className="min-h-12 w-full" disabled={busy} onClick={() => { if (confirm("Résilier le VIP ? Tu le gardes jusqu'à la fin du mois payé.")) act(() => cancel(), "Abonnement résilié"); }}>Résilier mon abonnement</Button>}
        </section>
      ) : st.status === "attente_parent" ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">📧 Demande envoyée à ton parent. Le VIP s'activera quand il aura accepté et payé. <button type="button" className="underline" onClick={() => refetch()}>Actualiser</button></p>
      ) : (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h1 className="font-heading text-lg font-bold">Devenir VIP</h1>
          {minor && <>
            <p className="text-sm">Tu as moins de 18 ans : un parent doit accepter. Il recevra un email et paiera lui-même.</p>
            <Input type="email" inputMode="email" placeholder="Email de ton parent" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12" />
          </>}
          <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="h-5 w-5" />Je comprends que c'est un abonnement de 2,99 € par mois, payé en vrai argent, résiliable à tout moment.</label>
          <Button className="min-h-12 w-full" disabled={busy || !ok || (minor && !email)} onClick={subscribe}>{busy ? "Traitement…" : minor ? "Demander à mon parent" : "S'abonner pour 2,99 €/mois"}</Button>
          <p className="text-xs text-muted-foreground">Paiement sécurisé par Stripe. Tu peux résilier depuis cette page : le VIP reste actif jusqu'à la fin du mois payé.</p>
        </section>
      )}
    </div>
  );
}
