import type { Tables } from '@/integrations/supabase/types';
import type { LifeLocation } from './life-state';
export type CatalogEntry = Tables<'economy_catalog'> & { config: Record<string, string | number> };
export type EconomyState = {
  world_now: string; available: number; saved: number; asset_value: number; cash_on_hand?: number;
  settings: Tables<'economy_settings'>;
  goals: (Tables<'economy_goals'> & { current: number })[];
  assets: (Tables<'personal_assets'> & { catalog: CatalogEntry })[];
  catalog: CatalogEntry[]; locations: (LifeLocation & { district_name: string })[];
  budget: Tables<'personal_budgets'> & { planned: Record<string, number> };
  skills: Record<string, unknown>; history: Tables<'career_history'>[];
  operations: Tables<'economy_operations'>[]; month_transactions: Tables<'transactions'>[];
};
export const BUDGET_CATEGORIES = { logement: 'Logement', alimentation: 'Alimentation', transport: 'Transport', loisirs: 'Loisirs', formation: 'Formation', equipement: 'Équipement', services: 'Services', autres: 'Autres' };
export const PROJECT_METRICS = { cash: 'Liquidités', assets: 'Valeur des biens', vehicle: 'Véhicules possédés', training: 'Formations terminées', move: 'Déménagements', job: 'Emploi', studies: 'Progression académique', social: 'Réputation sociale', politics: 'Réputation politique' };
export function netWorth(available: number, saved: number, assets: number, cashOnHand = 0) { return available + saved + assets + cashOnHand; }
export function goalProgress(current: number, target: number) { return target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0; }
export function monthlyTotals(transactions: Pick<Tables<'transactions'>, 'amount' | 'category'>[]) {
  return transactions.filter(t => !['epargne','especes'].includes(t.category)).reduce((a, t) => ({ income: a.income + Math.max(0, t.amount), expenses: a.expenses + Math.max(0, -t.amount) }), { income: 0, expenses: 0 });
}
export function spentByCategory(transactions: Pick<Tables<'transactions'>, 'amount' | 'category'>[], category: string) { return transactions.filter(t => t.amount < 0 && t.category === category).reduce((sum, t) => sum - t.amount, 0); }