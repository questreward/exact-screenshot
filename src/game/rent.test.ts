import { describe, expect, it } from 'vitest';
import { isRentPaid } from './rent';
describe('paiement du loyer', () => {
  const date = '2026-10-18';
  const failure = { operation_key: `rent:${date}`, status: 'failed' };
  it('un échec ne constitue pas un paiement', () => { expect(isRentPaid(date, null, [failure])).toBe(false); });
  it('une ancienne date erronée ne bloque pas la nouvelle tentative', () => { expect(isRentPaid(date, date, [failure])).toBe(false); });
  it('une réussite distincte constitue un paiement avec l’échec conservé', () => { expect(isRentPaid(date, null, [failure, { operation_key: `rent:${date}:retry`, status: 'done' }])).toBe(true); });
  it('un ancien paiement confirmé reste payé', () => { expect(isRentPaid(date, date, [])).toBe(true); });
  it('un autre jour ne paie pas le loyer du jour', () => { expect(isRentPaid(date, '2026-10-17', [{ operation_key: 'rent:2026-10-17:retry', status: 'done' }])).toBe(false); });
});