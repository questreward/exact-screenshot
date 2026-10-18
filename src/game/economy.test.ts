import { describe, it, expect } from 'vitest';
import { netWorth, goalProgress, monthlyTotals, spentByCategory } from './economy';
describe('Économie personnelle', () => {
  it('100 € épargnés ne créent pas d’argent', () => { expect(netWorth(900, 100, 0)).toBe(1000); expect(netWorth(1000, 0, 0)).toBe(1000); });
  it('650 € sur 1 000 € = 65 %', () => { expect(goalProgress(650, 1000)).toBe(65); });
  it('patrimoine = disponible + épargne + biens sans plus-value', () => { expect(netWorth(2140, 620, 650)).toBe(3410); });
  it('transferts d’épargne ne sont ni revenus ni dépenses', () => { expect(monthlyTotals([{ amount: 1850, category: 'salaire' }, { amount: -1230, category: 'logement' }, { amount: -100, category: 'epargne' }, { amount: 50, category: 'epargne' }])).toEqual({ income: 1850, expenses: 1230 }); });
  it('budget réel provient des dépenses enregistrées', () => { expect(spentByCategory([{ amount: -20, category: 'logement' }, { amount: -8, category: 'alimentation' }, { amount: -20, category: 'logement' }], 'logement')).toBe(40); });
});