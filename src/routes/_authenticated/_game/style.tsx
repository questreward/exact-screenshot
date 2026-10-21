import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Check, Mail, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { gameMeta } from "@/game/metadata";
import { characterQuery, cosmeticShopQuery, type CosmeticItem } from "@/services/game";
import { startCosmeticOrder } from "@/lib/cosmetics.functions";
import { useStyleLook, STYLE_SLOT } from "@/game/style-look";
import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";

export const Route = createFileRoute("/_authenticated/_game/style")({
  head: () => ({ meta: gameMeta("Objets de style", "Tenues, cadres et fonds pour personnaliser ton personnage, sans aucun avantage dans le jeu.") }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(cosmeticShopQuery), context.queryClient.ensureQueryData(characterQuery)]),
  errorComponent: () => <p className="m-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Objets de style : Disponible dans une prochaine étape.</p>,
  component: StylePage,
});

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

function StylePage() {
  const { data } = useSuspenseQuery(cosmeticShopQuery);
  const { data: ch } = useSuspenseQuery(characterQuery);
  const minor = (ch?.age ?? 18) < 18;
  const [pick, setPick] = useState<CosmeticItem | null>(null);
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useServerFn(startCosmeticOrder);
  const qc = useQueryClient();
  const { look, wear } = useStyleLook();

  async function buy() {
    if (!pick) return;
    setBusy(true);
    try {
      const r = await start({ data: { itemId: pick.id, ...(minor ? { parentEmail: email } : {}) } });
      if (r.kind === "pay") { window.location.href = r.url; return; }
      toast.success("Demande envoyée à ton parent par email.");
      setPick(null); setEmail(""); setOk(false);
      qc.invalidateQueries({ queryKey: ["cosmetics"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><Sparkles className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Objets de style</h1>
        <p className="text-sm text-muted-foreground">Change seulement l'apparence. Aucun avantage dans le jeu.</p></div></header>
    <div className="mx-auto aspect-[6/7] w-40 overflow-hidden rounded-3xl border border-border">{ch && <CharacterAvatar appearance={normalizeAppearance(ch.appearance as never)} look={look} />}</div>
    {minor && <p className="rounded-xl border border-border bg-card p-3 text-sm">Tu as moins de 18 ans : chaque achat demande l'accord d'un parent. Il reçoit un email, accepte et paie lui-même.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {data.items.map((it) => {
        const owned = data.owned.has(it.id); const waiting = data.waiting.has(it.id);
        return <div key={it.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          {ch && <div role="img" aria-label={`Aperçu de ${it.name}`} className="mx-auto aspect-[6/7] w-40 overflow-hidden rounded-lg product-turn"><CharacterAvatar appearance={normalizeAppearance(ch.appearance as never)} look={{ ...look, ...(STYLE_SLOT[it.id] ? { [STYLE_SLOT[it.id]]: it.id } : {}) }} /></div>}
          <span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{it.kind}</span>
          <p className="font-heading font-semibold">{it.name}</p>
          <p className="flex-1 text-sm text-muted-foreground">{it.description}</p>
          {owned ? (() => { const slot = STYLE_SLOT[it.id]; const on = !!slot && look[slot] === it.id; return <Button variant={on ? "secondary" : "outline"} className="min-h-12" onClick={() => wear(it.id, !on)}>{on ? <><Check className="mr-2 h-5 w-5" />Porté — retirer</> : "Porter"}</Button>; })()
            : waiting ? <p className="flex min-h-12 items-center gap-2 text-sm text-muted-foreground"><Mail className="h-5 w-5" />En attente de l'accord parental</p>
            : <Button className="min-h-12" onClick={() => { setPick(it); setOk(false); }}>Acheter {eur(it.price_cents)}</Button>}
        </div>;
      })}
    </div>
    <Dialog open={!!pick} onOpenChange={(o) => !o && setPick(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{pick?.name}</DialogTitle>
          <DialogDescription>Prix : {pick && eur(pick.price_cents)}, payé une seule fois en argent réel. Aucun abonnement.</DialogDescription></DialogHeader>
        {pick && ch && <div role="img" aria-label={`Aperçu de ${pick.name}`} className="mx-auto aspect-[6/7] w-36 product-turn"><CharacterAvatar appearance={normalizeAppearance(ch.appearance as never)} look={{ ...look, ...(STYLE_SLOT[pick.id] ? { [STYLE_SLOT[pick.id]]: pick.id } : {}) }} /></div>}
        {minor ? <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="pe">Email de ton parent</label>
          <Input id="pe" type="email" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@exemple.fr" />
          <p className="text-xs text-muted-foreground">Ton parent reçoit un email. Rien n'est payé sans son accord.</p>
        </div> : <label className="flex min-h-12 items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          J'ai compris que c'est un vrai paiement, sans avantage dans le jeu.</label>}
        <Button className="min-h-12 w-full" disabled={busy || (minor ? !email.includes("@") : !ok)} onClick={buy}>
          {busy && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{minor ? "Demander l'accord" : "Payer en sécurité"}</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
