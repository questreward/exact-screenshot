import { describe, expect, it } from 'vitest';
import { aidPayments, aidRights } from './aid-portal';

const base = { id: 'p', type_id: 'housing_aid', title: 'Aide', status: 'acceptee', result: { amount: 120, ends_at: '2026-12-01T00:00:00Z' }, closes_at: null } as never;

describe('aid portal', () => {
  it('an accepted housing aid is an open right with its server amount', () => {
    expect(aidRights({ procedures: [base] }, '2026-10-20T00:00:00Z')[0]).toMatchObject({ status: 'ouvert', amount: 120, label: 'Aide au logement' });
  });
  it('an expired aid is shown as ended', () => {
    expect(aidRights({ procedures: [base] }, '2027-01-01T00:00:00Z')[0]!.status).toBe('termine');
  });
  it('tax procedures are not aid rights', () => {
    expect(aidRights({ procedures: [{ ...(base as object), type_id: 'tax' } as never] }, '2026-10-20T00:00:00Z')).toHaveLength(0);
  });
  it('payments keep only positive amounts, newest first', () => {
    const events = [
      { id: 'a', amount: 50, occurred_at: '2026-09-01' }, { id: 'b', amount: -10, occurred_at: '2026-10-01' },
      { id: 'c', amount: null, occurred_at: '2026-10-02' }, { id: 'd', amount: 80, occurred_at: '2026-10-05' },
    ] as never;
    expect(aidPayments({ events }).map(e => e.id)).toEqual(['d', 'a']);
  });
});

import { aidRequestSteps } from './aid-portal';
describe('aidRequestSteps', () => {
  it('demande envoyée = 2 étapes faites', () => expect(aidRequestSteps('envoyee').filter(s => s.done).length).toBe(2));
  it('réponse reçue = toutes les étapes', () => expect(aidRequestSteps('acceptee').every(s => s.done)).toBe(true));
});
