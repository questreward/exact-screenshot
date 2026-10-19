import { useQuery } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { businessTaxQuery, formatMoney } from "@/services/game";

export function BusinessTaxes() {
  const { data: t } = useQuery(businessTaxQuery);
  if (!t) return null;
  return <div className="space-y-1 rounded-md border border-border p-3">
    <p className="flex items-center gap-2 font-semibold"><Landmark className="h-5 w-5 text-primary" /> Impôts de l'entreprise</p>
    <p className="text-xs text-muted-foreground">{t.settings.profit_rate} % du bénéfice de chaque semaine + taxe locale de {formatMoney(t.settings.local_weekly)} par semaine, versés au budget de la ville. Votre salaire compte dans votre déclaration de revenus.</p>
    {t.debt > 0 && <p className="text-sm text-destructive">Impôts restant à payer : {formatMoney(t.debt)} (prélevés dès que la caisse le permet).</p>}
    {t.weeks.length === 0 ? <p className="text-sm text-muted-foreground">Premier calcul après le premier bilan.</p> :
      t.weeks.map(w => <p key={w.week} className="text-sm">Semaine {w.week % 52 + 1} · bénéfice {formatMoney(w.profit)} · impôts {formatMoney(w.profit_tax + w.local_tax)}{w.paid < w.profit_tax + w.local_tax ? ` (payé ${formatMoney(w.paid)})` : ""}</p>)}
    <p className="text-xs text-muted-foreground">Total versé à la ville : {formatMoney(t.total_paid)}</p>
  </div>;
}
