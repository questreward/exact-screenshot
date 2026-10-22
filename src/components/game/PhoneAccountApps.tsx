import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { bankQuery, characterQuery, economyQuery, formatMoney } from "@/services/game";
import { useMyUniform } from "@/hooks/use-my-uniform";
import { CharacterAvatar } from "./CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import { CivicSummary } from "./CivicSummary";
import { MoneyAlerts, PersonalVsBusiness } from "./MoneyAlerts";
import { BankLoans } from "./BankLoans";
import { InsuranceCard } from "./InsuranceCard";
import { MoneyMonth } from "./MoneyMonth";
import { WealthCard } from "./WealthCard";
import { EconomyBankLinks } from "./EconomyPage";
import { opKind, opTitle } from "@/game/money-labels";
import { cn } from "@/lib/utils";

export function ProfileApp() {
  const { data: c } = useSuspenseQuery(characterQuery);
  const uniform = useMyUniform();
  if (!c) return null;
  return (
    <div className="text-center">
      <div className="mx-auto h-32 w-28 overflow-hidden rounded-3xl border border-border"><CharacterAvatar appearance={normalizeAppearance(c.appearance)} uniform={uniform} /></div>
      <p className="mt-3 text-xl font-bold">{c.first_name} {c.last_name}</p>
      <p className="text-sm text-muted-foreground">{c.age} ans · {c.city?.name}</p>
      <p className="mt-4 rounded-2xl bg-accent/60 p-3 text-sm">{c.path?.name} — {c.situation}</p>
      <div className="mt-4 text-left"><CivicSummary profile/></div>
    </div>
  );
}

export function BankApp() {
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: eco } = useQuery(economyQuery);
  if (!bank) return <p className="text-sm text-muted-foreground">Aucun compte.</p>;
  return (
    <div className="space-y-5">
      <div className="border-b-2 border-success py-5">
        <p className="text-sm opacity-80">Mon compte · solde disponible</p>
        <p className="mt-1 break-words font-display text-3xl font-bold tabular-nums">{formatMoney(bank.balance)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-2 py-3 text-center"><Link to="/banque">Virements et relevés</Link></Button><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-2 py-3 text-center"><Link to="/patrimoine">Mon patrimoine</Link></Button></div>
      <MoneyAlerts />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">🏦 Mes comptes</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="border-b border-border py-3"><p className="text-xs text-muted-foreground">💶 Compte courant</p><p className="font-bold">{formatMoney(bank.balance)}</p></div>
          <Link to="/patrimoine" className="border-b border-border py-3 active:scale-95"><p className="text-xs text-muted-foreground">🐷 Épargne</p><p className="font-bold">{eco ? formatMoney(eco.saved) : "—"}</p></Link>
        </div>
      </section>
      <section className="space-y-2"><h2 className="text-sm font-semibold">💳 Mes crédits</h2><BankLoans compact /></section>
      <PersonalVsBusiness />
      <MoneyMonth />
      <WealthCard />
      <EconomyBankLinks/>
      <InsuranceCard compact />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">🧾 Dernières opérations</h2>
        {bank.transactions.length === 0 && <p className="rounded-xl bg-card p-3 text-sm text-muted-foreground">Aucune opération pour l'instant.</p>}
        <ul className="space-y-2">
          {bank.transactions.map((t) => { const k = opKind(t.label, t.amount); return (
            <li key={t.id} className="flex min-h-14 items-center gap-3 border-b border-border py-3">
              <span className="text-2xl" aria-hidden>{k.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{opTitle(t.label)}</p>
                <p className="text-xs text-muted-foreground">{k.place} · {new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className={cn("shrink-0 text-sm font-semibold tabular-nums", t.amount >= 0 ? "text-success" : "text-destructive")}>
                {t.amount >= 0 ? "+" : ""}{formatMoney(t.amount)}
              </span>
            </li>); })}
        </ul>
      </section>
    </div>
  );
}
