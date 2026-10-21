import { describe, expect, it } from 'vitest';
import { validateFinancialQuestion, financialPrompt } from './financial-adviser';
describe('Questions financières privées', () => {
  it('refuse les questions hors limites', () => {
    expect(() => validateFinancialQuestion({ question: 'ab' })).toThrow();
    expect(() => validateFinancialQuestion({ question: 'a'.repeat(601) })).toThrow();
    expect(validateFinancialQuestion({ question: '  Mon budget ?  ' }).question).toBe('Mon budget ?');
  });
  it('transmet les montants et échéances enregistrés sans les recalculer', () => {
    const snapshot = { banque: { solde_euros: 100, mensualites: [{ date: '2026-11-01', montant_euros: 50 }] } };
    expect(financialPrompt(snapshot)).toContain(JSON.stringify(snapshot));
  });
});