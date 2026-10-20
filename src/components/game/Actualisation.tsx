import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, Check } from 'lucide-react';
import { declareUnemployment, formatMoney, unemploymentQuery } from '@/services/game';
import { missedPeriods, periodLabel } from '@/game/unemployment';

export function Actualisation() {
  const { data: s, isLoading } = useQuery(unemploymentQuery);
  const qc = useQueryClient();
  const [searching, setSearching] = useState<boolean | null>(null);
  const [worked, setWorked] = useState<boolean | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const send = useMutation({
    mutationFn: () => declareUnemployment({ requestId, stillSearching: !!searching, worked: !!worked }),
    onSuccess: async p => { await Promise.all([qc.invalidateQueries({ queryKey: ['unemployment'] }), qc.invalidateQueries({ queryKey: ['bank'] })]); toast.success(`Actualisation de ${periodLabel(p)} enregistrée`); },
    onError: (e: Error) => toast.error(e.message),
  });
  const intro = <p className="text-sm">Chaque mois, déclarez si vous avez travaillé et si vous cherchez toujours un emploi. L’allocation de chaque mois n’est versée qu’après l’actualisation. Sans actualisation, vous êtes radié pour ce mois.</p>;
  if (isLoading) return <Box>{intro}<p className="text-sm text-muted-foreground">Chargement…</p></Box>;
  if (!s) return <Box>{intro}<p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Actualisation mensuelle : Disponible dans une prochaine étape</p></Box>;
  if (s.employed) return <Box>{intro}<p className="rounded-lg bg-muted p-3 text-sm">Vous avez un emploi : vous n’avez pas besoin de vous actualiser.</p></Box>;
  if (!s.registered) return <Box>{intro}<p className="rounded-lg bg-muted p-3 text-sm">Vous n’êtes pas indemnisé. L’allocation chômage concerne les personnes qui ont perdu leur emploi.</p></Box>;
  const declared = s.declarations.map(d => d.period);
  const done = s.open_period ? declared.includes(s.open_period) : false;
  const from = s.layoff && Date.parse(s.layoff.at) > Date.parse(s.installed_at) ? s.layoff.at : s.installed_at;
  const missed = missedPeriods(declared, from, s.now, s.close_day);
  return <Box>
    {intro}
    {s.layoff && <p className="text-sm text-muted-foreground">Ancien emploi : {s.layoff.job} · allocation de 57 % du salaire, 26 semaines maximum.</p>}
    {!s.open_period ? <p className="rounded-lg bg-muted p-3 text-sm">L’actualisation est fermée. Elle ouvre le {s.open_day} de chaque mois et se termine le {s.close_day} du mois suivant.</p>
      : done ? <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm"><Check className="h-4 w-4 text-primary" />Vous êtes actualisé pour {periodLabel(s.open_period)}.</p>
      : <div className="space-y-3 rounded-lg border border-primary p-3">
        <p className="font-semibold">Actualisation de {periodLabel(s.open_period)}</p>
        <YesNo q="Avez-vous travaillé ce mois-ci ?" v={worked} set={setWorked} />
        <YesNo q="Êtes-vous toujours à la recherche d’un emploi ?" v={searching} set={setSearching} />
        <button type="button" disabled={searching === null || worked === null || send.isPending} onClick={() => send.mutate()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50"><CalendarCheck className="h-4 w-4" />Valider mon actualisation</button>
      </div>}
    {missed.length > 0 && <p className="rounded-lg bg-muted p-3 text-sm">Radiation pour : {missed.map(periodLabel).join(', ')}. Pas d’allocation pour ces mois. Vous restez inscrit : actualisez-vous le mois prochain.</p>}
    <div><h2 className="mb-1 text-sm font-semibold">Mes paiements d’allocation</h2>
      {s.payments.length ? <ul>{s.payments.slice(0, 12).map(p => <li key={p.week} className="flex min-h-11 items-center justify-between border-t border-border text-sm"><span>Semaine {p.week}</span><strong className="text-primary">+{formatMoney(p.amount)}</strong></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>}
    </div>
  </Box>;
}

function Box({ children }: { children: React.ReactNode }) { return <section className="space-y-3 rounded-xl border border-border bg-card p-4"><h1 className="font-heading text-xl font-bold">M’actualiser</h1>{children}</section>; }
function YesNo({ q, v, set }: { q: string; v: boolean | null; set: (b: boolean) => void }) {
  return <fieldset><legend className="mb-2 text-sm">{q}</legend><div className="grid grid-cols-2 gap-2">
    {[true, false].map(b => <button key={String(b)} type="button" aria-pressed={v === b} onClick={() => set(b)} className={`min-h-12 rounded-md border text-sm font-semibold ${v === b ? 'border-primary bg-primary/15' : 'border-border'}`}>{b ? 'Oui' : 'Non'}</button>)}
  </div></fieldset>;
}
