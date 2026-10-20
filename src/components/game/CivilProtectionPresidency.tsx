import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { cpAction, cpPresidencyQuery, securityQuery } from '@/services/game';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function CivilProtectionPresidency() {
 const { data: s } = useSuspenseQuery(cpPresidencyQuery);
 const qc = useQueryClient();
 const [city, setCity] = useState('');
 const [target, setTarget] = useState('');
 const [body, setBody] = useState('');
 const act = useMutation({ mutationFn: cpAction, onSuccess: data => {
  qc.setQueryData(cpPresidencyQuery.queryKey, data);
  void qc.invalidateQueries({ queryKey: securityQuery.queryKey });
  void qc.invalidateQueries({ queryKey: ['character'] });
  toast.success('Action enregistrée.');
 }, onError: (e: Error) => toast.error(e.message) });
 const e = s.elections.find(e => !e.settled && new Date(e.opens_at)<=new Date(s.now));
 const nomination = s.nominees.filter(n => n.city_id===city);
 return <section aria-label="Présidence Protection civile" className="space-y-4 rounded-xl border border-border bg-card p-4">
  <h2 className="font-heading text-xl font-bold">Présidence</h2>
  <p className="text-sm text-muted-foreground">Présidence nationale des cinq antennes · mandat d’un an · indemnité de {s.settings.indemnity} €/mois, selon les fonds disponibles.</p>
  <p className="break-all text-sm">Présidence actuelle : {s.president ?? 'Vacante'}</p>
  {e && <div className="space-y-2"><h3 className="font-semibold">Élection nationale</h3>
   <p className="text-sm">Vote du {new Date(e.vote_at).toLocaleString('fr-FR')} au {new Date(e.closes_at).toLocaleString('fr-FR')}. Vote secret, unique et définitif.</p>
   <Button className="min-h-12" disabled={act.isPending || !s.eligible || new Date(s.now)>=new Date(e.vote_at) || s.candidates.some(c=>c.election_id===e.id && c.character_id===s.actor)} onClick={()=>act.mutate({_action:'candidate',_election:e.id})}>Présenter ma candidature</Button>
   {s.candidates.filter(c=>c.election_id===e.id).map(c=><div key={c.character_id} className="space-y-1"><p className="break-all text-sm">{c.character_id}</p><Button className="min-h-12" variant="outline" disabled={act.isPending || !s.eligible || s.voted.includes(e.id) || new Date(s.now)<new Date(e.vote_at)} onClick={()=>{if(window.confirm('Confirmer ce vote secret et définitif ?')) act.mutate({_action:'vote',_election:e.id,_target:c.character_id});}}>Voter pour cette candidature</Button></div>)}
   {s.voted.includes(e.id) && <p>Ton vote secret a été enregistré.</p>}
  </div>}
  {s.is_president && <div className="space-y-3"><h3 className="font-semibold">Tableau de bord national</h3><p>Trésorerie nationale : {s.balance} €</p>
   {s.dashboard.map(b=><div key={b.city_id} className="rounded-lg bg-muted p-3 text-sm"><strong>{b.label}</strong><p>{b.volunteers} bénévoles en service · {b.completed} services clôturés · {b.operation_services} participations aux opérations</p></div>)}
   <label className="block text-sm">Antenne<select className="mt-1 min-h-12 w-full rounded border border-border bg-background p-2" value={city} onChange={e=>{setCity(e.target.value);setTarget('');}}><option value="">Toutes les antennes (messages)</option>{s.branches.map(b=><option key={b.city_id} value={b.city_id}>{b.label}</option>)}</select></label>
   <label className="block text-sm">Responsable d’antenne<select className="mt-1 min-h-12 w-full rounded border border-border bg-background p-2" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Révoquer le responsable</option>{nomination.map(n=><option key={n.character_id} value={n.character_id}>{n.character_id}</option>)}</select></label>
   {s.heads.filter(h=>h.city_id===city).map(h=><p key={h.city_id} className="break-all text-sm">Responsable : {h.character_id}</p>)}
   <Button className="min-h-12" disabled={!city || act.isPending} onClick={()=>act.mutate({_action:'head',_city:city,_target:target || null})}>Enregistrer la nomination / révocation</Button>
   <p className="text-sm text-muted-foreground">Une opération par semaine ISO : les bénévoles présents dans la ville peuvent rejoindre les services supplémentaires, avec les règles habituelles d’énergie, de repos et de mission.</p>
   <Button className="min-h-12" disabled={!city || act.isPending || s.operations.length>0} onClick={()=>act.mutate({_action:'operation',_city:city})}>Lancer une opération dans cette ville</Button>
   <label className="block text-sm">Message aux bénévoles<textarea className="mt-1 min-h-24 w-full rounded border border-border bg-background p-2" value={body} maxLength={s.settings.message_limit} onChange={e=>setBody(e.target.value)}/></label>
   <Button className="min-h-12" disabled={!body.trim() || act.isPending} onClick={()=>act.mutate({_action:'message',_city:city || null,_body:body,_request:crypto.randomUUID()})}>Envoyer le message</Button>
  </div>}
  <h3 className="font-semibold">Opérations disponibles</h3>
  {s.operations.length===0 && <p className="text-sm text-muted-foreground">Aucune opération en cours.</p>}
  {s.operations.map(o=><div key={o.id} className="space-y-2"><p>{s.branches.find(b=>b.city_id===o.city_id)?.label} · {o.slots} places au lancement</p><Button className="min-h-12" disabled={!s.eligible || act.isPending} onClick={()=>act.mutate({_action:'join',_target:o.id,_request:crypto.randomUUID()})}>Rejoindre un service sur place</Button></div>)}
  <h3 className="font-semibold">Messages de la présidence</h3>
  {s.messages.length===0 && <p className="text-sm text-muted-foreground">Aucun message.</p>}
  {s.messages.map(m=><article key={m.id} className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm"><time>{new Date(m.created_at).toLocaleString('fr-FR')}</time><p>{m.body}</p></article>)}
 </section>;
}
