// Bloc 11 — Démarches simulées. Les montants faisant foi sont calculés côté serveur
// (réglages en base) ; ces fonctions reproduisent les mêmes règles pour l'affichage et les tests.

export type AdminSettings = {
  tax_free_threshold: number; tax_rate: number; training_credit_rate: number;
  declaration_days: number; payment_days: number; correction_days: number; late_fee: number; adult_age: number;
  aid_income_ceiling: number; aid_rate: number; aid_income_floor: number; aid_income_reduction: number;
  aid_min_amount: number; aid_months: number; aid_response_minutes: number; renewal_notice_days: number;
  student_aid_amount: number; student_aid_ceiling: number;
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  tax_free_threshold: 10000, tax_rate: 10, training_credit_rate: 20,
  declaration_days: 14, payment_days: 14, correction_days: 30, late_fee: 10, adult_age: 18,
  aid_income_ceiling: 1500, aid_rate: 40, aid_income_floor: 600, aid_income_reduction: 25,
  aid_min_amount: 10, aid_months: 3, aid_response_minutes: 60, renewal_notice_days: 7,
  student_aid_amount: 150, student_aid_ceiling: 800,
};

export type ProcedureStatus = 'a_faire' | 'en_cours' | 'a_completer' | 'envoyee' | 'acceptee' | 'refusee' | 'terminee';
export const PROCEDURE_STATUS: Record<ProcedureStatus, string> = {
  a_faire: 'À faire', en_cours: 'En cours', a_completer: 'À compléter', envoyee: 'Envoyée',
  acceptee: 'Acceptée', refusee: 'Refusée', terminee: 'Terminée',
};
export const ADMIN_CATEGORIES = ['Fiscalité', 'Logement', 'Aides', 'Études', 'Travail', 'Situation personnelle'] as const;
export const SITUATION_CHANGES = [
  { id: 'job', label: 'Changement d’emploi' },
  { id: 'housing', label: 'Changement de logement' },
  { id: 'status', label: 'Passage études → vie active' },
  { id: 'city', label: 'Changement de ville' },
] as const;
export const SIMULATION_NOTICE = 'Simulation CIVITAS — règles simplifiées du jeu, sans valeur réelle.';

const div = (a: number, b: number) => Math.trunc(a / b);

export function computeTax(income: number, training: number, useCredit: boolean, s: AdminSettings = DEFAULT_ADMIN_SETTINGS) {
  const taxable = Math.max(0, income - s.tax_free_threshold);
  const tax = div(taxable * s.tax_rate, 100);
  const credit = useCredit ? div(training * s.training_credit_rate, 100) : 0;
  return { taxable, tax, credit, net: tax - credit };
}

export function housingAid(snap: { age: number; housing_type: string | null; housing_monthly: number; monthly_income: number }, s: AdminSettings = DEFAULT_ADMIN_SETTINGS): { eligible: boolean; amount?: number; reason?: string } {
  if (snap.age < s.adult_age) return { eligible: false, reason: `Cette aide simulée est réservée aux joueurs de ${s.adult_age} ans et plus.` };
  if (!snap.housing_type) return { eligible: false, reason: 'Aucun logement enregistré pour votre personnage.' };
  if (snap.monthly_income > s.aid_income_ceiling) return { eligible: false, reason: `Vos revenus simulés dépassent le plafond prévu pour cette aide (${s.aid_income_ceiling} € par mois).` };
  const amount = div(snap.housing_monthly * s.aid_rate, 100) - div(Math.max(0, snap.monthly_income - s.aid_income_floor) * s.aid_income_reduction, 100);
  if (amount < s.aid_min_amount) return { eligible: false, reason: `Le montant calculé est trop faible pour être versé (moins de ${s.aid_min_amount} €).` };
  return { eligible: true, amount };
}

export type AdminDocument = { id: string; type_id: string; issued_at: string; valid_until: string; status: 'valide' | 'perime' | 'remplace'; details: Record<string, unknown> };
export type DocumentType = { id: string; name: string; category: string; origin: string; validity_days: number; explanation: string };
export type ProcedureType = { id: string; category: string; title: string; description: string; why: string; asked: string; next_step: string; required_documents: string[]; min_age: number };
export type TaxDeclaration = { id: string; version: number; income: number; taxable: number; tax: number; training_spent: number; credit: number; net: number; status: 'active' | 'remplacee'; submitted_at: string };
export type Procedure = {
  id: string; type_id: string; category: string; title: string; period: string; status: ProcedureStatus; late: boolean;
  started_at: string; due_at: string | null; closes_at: string | null; response_at: string | null;
  situation: Record<string, unknown> | null; choices: { training_credit?: boolean }; result: Record<string, unknown>;
  renewed_from: string | null; attachments: { type_id: string; document_id: string; valid: boolean }[];
  declarations: TaxDeclaration[]; balance: number | null; renewed: boolean;
};
export type AdminSituation = {
  age: number; path: string; career_active: boolean; city: string; job_id: string | null; job_title: string | null; salary: number;
  housing_type: string | null; housing_name: string | null; housing_monthly: number; studying: boolean;
  monthly_income: number; year_income: number; year_training: number;
};
export type AdminEvent = { id: string; procedure_id: string | null; kind: string; label: string; amount: number | null; occurred_at: string };
export type AdminState = {
  world_now: string; settings: AdminSettings; situation: AdminSituation;
  procedure_types: ProcedureType[]; document_types: DocumentType[];
  documents: AdminDocument[]; procedures: Procedure[]; events: AdminEvent[];
};

export const isOpen = (p: Procedure) => ['a_faire', 'en_cours', 'a_completer'].includes(p.status);

/** Échéances à venir (affichées aussi dans l'Agenda). */
export function upcomingDeadlines(state: Pick<AdminState, 'procedures'>) {
  const out: { id: string; title: string; date: string; label: string }[] = [];
  for (const p of state.procedures) {
    if (p.due_at && (isOpen(p) || (p.status === 'acceptee' && (p.balance ?? 0) > 0)))
      out.push({ id: p.id + ':due', title: p.title, date: p.due_at, label: isOpen(p) ? 'Date limite' : 'Paiement à régler' });
    if (p.status === 'envoyee' && p.response_at) out.push({ id: p.id + ':answer', title: p.title, date: p.response_at, label: 'Réponse attendue' });
    const ends = p.result['ends_at'];
    if (p.type_id === 'housing_aid' && p.status === 'acceptee' && typeof ends === 'string') out.push({ id: p.id + ':end', title: p.title, date: ends, label: 'Fin de l’aide — renouvellement' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
