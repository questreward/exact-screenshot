import { ClipboardList, FileText, ShieldCheck } from 'lucide-react';
import type { SecurityMission, SecurityState } from '@/services/game';
import { OUTCOME_LABELS } from '@/game/security-careers';
import { volunteerReports } from '@/game/volunteer-report';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const date = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'UTC' });
export function VolunteerDossier({ state, missions }: { state: SecurityState; missions: SecurityMission[] }) {
  const career = state.career;
  if (!career || career.service !== 'protection_civile') return null;
  const service = state.services.find(s => s.id === career.service);
  return <section className="space-y-4 border-y border-border py-5" aria-label="Dossier bénévole Protection civile">
    <header className="flex min-w-0 items-center gap-3"><ShieldCheck className="h-7 w-7 shrink-0 text-primary"/><div className="min-w-0"><h2 className="font-heading text-xl font-bold break-words">Mon dossier bénévole</h2><p className="text-xs text-muted-foreground">DOCUMENT FICTIF — CIVITAS</p></div></header>
    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
      <div><dt className="text-muted-foreground">Engagement enregistré</dt><dd>{date(career.joined_at)}</dd></div>
      <div><dt className="text-muted-foreground">Statut</dt><dd>{career.status === 'formation' ? 'Formation en cours' : career.status === 'quitte' ? 'Engagement terminé' : 'Bénévole en service'}</dd></div>
      <div><dt className="text-muted-foreground">Formation du jeu</dt><dd>{career.status === 'formation' ? `Fin prévue : ${date(career.trained_at)}` : `Date enregistrée : ${date(career.trained_at)}`}</dd></div>
      <div><dt className="text-muted-foreground">Fonction enregistrée</dt><dd>{service?.rank_titles[career.rank] ?? 'Non renseignée'}</dd></div>
    </dl>
    <p className="text-xs text-muted-foreground">Qualifications CIVITAS uniquement · aucune certification réelle de secourisme.</p>
    <h3 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-5 w-5"/>Comptes rendus de service</h3>
    {!state.shifts.some(s => s.service === 'protection_civile') && <p className="text-sm text-muted-foreground">Aucun service enregistré.</p>}
    <ul className="divide-y divide-border">{volunteerReports(state.shifts).map(shift => {
      const mission = missions.find(m => m.id === shift.mission_id);
      return <li key={shift.id} className="py-3"><Dialog><DialogTrigger asChild><Button variant="outline" className="h-auto min-h-14 w-full min-w-0 justify-start whitespace-normal text-left"><FileText className="shrink-0"/><span className="min-w-0 break-words">{mission?.title ?? 'Service Protection civile'}<span className="block text-xs text-muted-foreground">{date(shift.starts_at)} · {shift.settled ? 'Clôturé' : 'Bilan en attente'}</span></span></Button></DialogTrigger>
        <DialogContent><DialogHeader><DialogTitle className="pr-8">Compte rendu de service</DialogTitle><DialogDescription>DOCUMENT FICTIF — CIVITAS · aucune valeur officielle</DialogDescription></DialogHeader>
          <article className="space-y-3 break-words text-sm"><h3 className="font-heading text-lg font-semibold">{mission?.title ?? 'Service Protection civile'}</h3><p>Référence : {shift.id}</p><p>Service du {date(shift.starts_at)} au {date(shift.ends_at)} · {shift.hours} h</p>{mission && <p>{mission.situation}</p>}<p>Décision enregistrée : {mission?.choices.find(c => c.id === shift.choice)?.label ?? 'Aucune décision enregistrée'}</p><p>Bilan : {shift.settled ? OUTCOME_LABELS[shift.outcome ?? 'equipe'] ?? 'Non renseigné' : 'En attente de clôture'}</p></article>
        </DialogContent></Dialog></li>;
    })}</ul>
  </section>;
}