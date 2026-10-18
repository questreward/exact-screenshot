import { describe, it, expect } from 'vitest';
import { computeTax, housingAid, upcomingDeadlines } from './admin';

describe('Démarches simulées — règles', () => {
  it('aucun impôt jusqu’à 10 000 €', () => { expect(computeTax(10000, 0, false).net).toBe(0); });
  it('10 % au-delà de 10 000 € : 12 000 € → 200 €', () => { expect(computeTax(12000, 0, false)).toEqual({ taxable: 2000, tax: 200, credit: 0, net: 200 }); });
  it('crédit formation 20 % seulement si demandé, peut donner un remboursement', () => {
    expect(computeTax(1000, 300, true).net).toBe(-60);
    expect(computeTax(1000, 300, false).net).toBe(0);
  });
  it('aide au logement : 40 % de 900 € sans revenus = 360 €', () => { expect(housingAid({ age: 20, housing_type: 'flat', housing_monthly: 900, monthly_income: 0 })).toEqual({ eligible: true, amount: 360 }); });
  it('aide au logement réduite de 25 % des revenus au-delà de 600 € : 1 000 € → 260 €', () => { expect(housingAid({ age: 20, housing_type: 'flat', housing_monthly: 900, monthly_income: 1000 }).amount).toBe(260); });
  it('refus au-delà du plafond de 1 500 €', () => { expect(housingAid({ age: 20, housing_type: 'flat', housing_monthly: 900, monthly_income: 1501 }).eligible).toBe(false); });
  it('refus avant 18 ans', () => { expect(housingAid({ age: 17, housing_type: 'flat', housing_monthly: 900, monthly_income: 0 }).eligible).toBe(false); });
  it('échéance payée n’apparaît plus', () => {
    const base = { id: 'p', type_id: 'tax_declaration', title: 'Déclaration', status: 'acceptee', due_at: '2027-10-01T00:00:00Z', response_at: null, result: {} };
    expect(upcomingDeadlines({ procedures: [{ ...base, balance: 50 } as never] })).toHaveLength(1);
    expect(upcomingDeadlines({ procedures: [{ ...base, balance: 0 } as never] })).toHaveLength(0);
  });
});
