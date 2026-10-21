import type { AdminState, Procedure } from './admin';

/** Presentation helpers for the « Caisse des aides » space (CAF-like). Amounts come from the server. */
export const AID_TYPES = ['housing_aid', 'student_aid'] as const;
export const AID_LABEL: Record<string, string> = { housing_aid: 'Aide au logement', student_aid: 'Aide étudiante' };

export type AidRight = { id: string; label: string; amount: number | null; status: 'en_cours' | 'ouvert' | 'termine' | 'refuse'; until: string | null };

export function aidRights(state: Pick<AdminState, 'procedures'>, now: string): AidRight[] {
  return state.procedures.filter(p => (AID_TYPES as readonly string[]).includes(p.type_id)).map(p => {
    const amount = typeof p.result['amount'] === 'number' ? (p.result['amount'] as number) : null;
    const until = typeof p.result['ends_at'] === 'string' ? (p.result['ends_at'] as string) : p.closes_at;
    return { id: p.id, label: AID_LABEL[p.type_id] ?? p.title, amount, until, status: rightStatus(p, until, now) };
  });
}

function rightStatus(p: Procedure, until: string | null, now: string): AidRight['status'] {
  if (p.status === 'refusee') return 'refuse';
  if (['acceptee', 'terminee'].includes(p.status)) return until && Date.parse(until) < Date.parse(now) ? 'termine' : 'ouvert';
  return 'en_cours';
}

/** Payments are the server-recorded positive administrative events. */
export function aidPayments(state: Pick<AdminState, 'events'>) {
  return state.events.filter(e => typeof e.amount === 'number' && e.amount > 0)
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
}

/** Étapes du suivi d'une demande d'aide : Remplie → Envoyée → Étudiée → Réponse. */
export function aidRequestSteps(status: string) {
  const level = ({ a_faire: 0, a_completer: 0, en_cours: 1, envoyee: 2, acceptee: 4, refusee: 4, terminee: 4 } as Record<string, number>)[status] ?? 0;
  return ['Remplie', 'Envoyée', 'Étudiée', 'Réponse'].map((label, i) => ({ label, done: i < level }));
}
