import { useState } from 'react';
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { volunteerAction, volunteerDossierQuery } from '@/services/game';
const date = (s: string) => new Date(s).toLocaleString('fr-FR', { timeZone: 'UTC' });
export function VolunteerBranchPanel({ active }: { active: boolean }) {
  const { data } = useSuspenseQuery(volunteerDossierQuery);
  const [city, setCity] = useState('');
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => volunteerAction('volunteer_attach', { _city: city, _request: crypto.randomUUID() }),
    onSuccess: d => { qc.setQueryData(volunteerDossierQuery.queryKey, d); toast.success('Rattachement enregistré.'); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return <p className="text-sm text-muted-foreground">Disponible dans une prochaine étape.</p>;
  return <div className="space-y-3">
    <h3 className="font-semibold">Mon antenne fictive CIVITAS</h3>
    <p className="text-sm">{data.branches.find(b => b.city_id === data.attachments[0]?.city_id)?.label ?? 'Aucun rattachement enregistré'}</p>
    {active && <div className="grid gap-2"><label htmlFor="volunteer-city" className="text-sm">Choisir une antenne</label><select id="volunteer-city" className="min-h-12 w-full min-w-0 rounded-md border border-input bg-background px-3 text-foreground" value={city} onChange={e => setCity(e.target.value)}><option value="">Choisir une ville</option>{data.branches.map(b => <option key={b.city_id} value={b.city_id}>{b.label}</option>)}</select><Button disabled={!city || mutation.isPending} className="min-h-12" onClick={() => mutation.mutate()}>Enregistrer mon rattachement</Button></div>}
    <ul className="space-y-1 text-xs text-muted-foreground">{data.attachments.map(a => <li key={a.id}>{date(a.attached_at)} · {data.branches.find(b => b.city_id === a.city_id)?.label ?? a.city_id}</li>)}</ul>
  </div>;
}
