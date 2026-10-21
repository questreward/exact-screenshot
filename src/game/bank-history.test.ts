import { describe, expect, it } from 'vitest';
import { bankDay, filterBankHistory } from './bank-history';
const rows = [
  { at: '2026-10-21T22:30:00Z', amount: -50, category: 'especes', label: 'Retrait' },
  { at: '2026-10-22T10:00:00Z', amount: 10, category: 'especes', label: 'Dépôt' },
  { at: '2026-10-20T10:00:00Z', amount: -20, category: 'achat', label: 'Courses' },
];
describe('Historique bancaire', () => {
  it('filtre les dates inclusives du jeu en heure française', () => {
    expect(bankDay(rows[0].at)).toBe('2026-10-22');
    expect(filterBankHistory(rows, '2026-10-22', '2026-10-22', 'all').map(r => r.amount)).toEqual([10, -50]);
  });
  it('distingue les retraits des dépôts', () => {
    expect(filterBankHistory(rows, '', '', 'withdraw').map(r => r.amount)).toEqual([-50]);
    expect(filterBankHistory(rows, '', '', 'deposit').map(r => r.amount)).toEqual([10]);
  });
  it('filtre les autres types sans inclure les espèces', () => {
    expect(filterBankHistory(rows, '', '', 'achat').map(r => r.amount)).toEqual([-20]);
  });
  it('ne retourne rien pour une période inversée', () => {
    expect(filterBankHistory(rows, '2026-10-23', '2026-10-21', 'all')).toEqual([]);
  });
});