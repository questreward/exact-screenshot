import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { municipalPropertyTaxQuery, setMunicipalPropertyTaxRate } from '@/services/game';
import { clampPropertyTaxRate, municipalPropertyTaxAmount } from '@/game/municipal-property-tax';
import { euros } from '@/game/income-tax';

export function MunicipalPropertyTaxCard() {
  const { data: s, error } = useQuery(municipalPropertyTaxQuery);
  const [rate, setRate] = useState(100);
  const qc = useQueryClient();
  const vote = useMutation({ mutationFn: setMunicipalPropertyTaxRate,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: municipalPropertyTaxQuery.queryKey }); toast.success('Taux adopté pour l’année prochaine.'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="text-lg font-semibold">Budget municipal · Taxe foncière</h2>
    {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
    {!s && !error && <p>Chargement du budget…</p>}
    {s && <>
      <p className="text-sm">Commune : {s.city_name}</p>
      <p className="flex justify-between gap-3"><span>Taxe foncière reçue</span><strong>{euros(s.received)}</strong></p>
      <p className="text-xs text-muted-foreground">Cumul des règlements reçus depuis la réforme. Ces fonds alimentent la trésorerie disponible pour les projets ; les sommes déjà versées à l’État y restent.</p>
      <p className="text-sm">Taux {s.year} : <b>{s.current_rate} %</b> · Taux {s.year + 1} : <b>{s.next_rate} %</b> {s.next_voted ? '(voté)' : '(par défaut)'}</p>
      {s.is_mayor && !s.next_voted && <form className="space-y-3" onSubmit={e => { e.preventDefault(); vote.mutate({ city: s.city_id, rate }); }}>
        <label className="block text-sm" htmlFor="municipal-property-rate">Taux à soumettre au conseil pour {s.year + 1} (80–120 %)</label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="min-h-12 min-w-12" aria-label="Diminuer le taux" disabled={rate <= 80} onClick={() => setRate(clampPropertyTaxRate(rate - 1))}>−</Button>
          <input id="municipal-property-rate" className="min-h-12 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-center" type="number" min={80} max={120} step={1} required value={rate} onChange={e => setRate(clampPropertyTaxRate(e.target.valueAsNumber))} />
          <Button type="button" variant="outline" className="min-h-12 min-w-12" aria-label="Augmenter le taux" disabled={rate >= 120} onClick={() => setRate(clampPropertyTaxRate(rate + 1))}>+</Button>
        </div>
        <p className="text-xs text-muted-foreground">Exemple : base de 1 000 € → {euros(municipalPropertyTaxAmount(1000, rate))}. Un seul taux adopté par année, sans modification des avis déjà émis. Le conseil simulé doit donner sa majorité.</p>
        <Button className="min-h-12 w-full" disabled={vote.isPending}>Soumettre au vote du conseil · {rate} %</Button>
      </form>}
    </>}
  </section>;
}
