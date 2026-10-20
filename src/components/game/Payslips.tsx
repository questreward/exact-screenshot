import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { payslipsQuery } from "@/services/game";
import { payslip } from "@/game/france-calendar";

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Bulletins mensuels : net réellement versé par le jeu, brut et cotisations affichés pour comprendre. */
export function Payslips() {
  const { data } = useQuery(payslipsQuery);
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return null;
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold"><FileText className="h-5 w-5 text-primary" />Mes bulletins de paie</h2>
    {data.months.length === 0 ? <p className="text-sm text-muted-foreground">Aucun salaire versé pour le moment.</p>
      : <ul className="space-y-2">{data.months.map(m => {
        const key = `${m.month}-${m.employer}`, p = payslip(m.net);
        return <li key={key} className="rounded-lg border border-border">
          <button type="button" onClick={() => setOpen(open === key ? null : key)} className="flex min-h-12 w-full items-center justify-between gap-2 p-3 text-left text-sm">
            <span><b className="capitalize">{monthLabel(m.month)}</b> · {m.employer}</span><span className="font-semibold">{eur(m.net)} net</span></button>
          {open === key && <div className="border-t border-border p-3 text-sm">
            <p className="mb-2 text-xs text-muted-foreground">Bulletin de paie · FICTIF · {m.shifts} {m.shifts > 1 ? "paiements" : "paiement"}{m.holidays > 0 && ` · ${m.holidays} jour(s) férié(s) payé(s) double`}</p>
            <div className="flex justify-between font-semibold"><span>Salaire brut</span><span>{eur(p.gross)}</span></div>
            {p.lines.map(l => <div key={l.label} className="flex justify-between text-muted-foreground"><span>− {l.label}</span><span>{eur(l.amount)}</span></div>)}
            <div className="mt-1 flex justify-between border-t border-border pt-1"><span>Net avant impôt</span><span>{eur(p.net)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Impôt prélevé à la source (taux du jeu : 0 %)</span><span>0 €</span></div>
            <div className="mt-1 flex justify-between font-heading text-base font-bold text-primary"><span>Net versé</span><span>{eur(p.net)}</span></div>
            <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => window.print()}>Imprimer</Button>
          </div>}
        </li>;
      })}</ul>}
  </section>;
}
