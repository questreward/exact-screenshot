import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { refreshShopPossessions } from './shop-sync';

describe('achats et possessions partagés', () => {
  it('actualise portefeuille, objets et domicile sans fabriquer un nouveau solde', async () => {
    const q = new QueryClient();
    q.setQueryData(['bank'], { balance: 100 });
    q.setQueryData(['shop', 'state'], { assets: [] });
    q.setQueryData(['furnishing', 'state'], { inventory: [] });
    const spy = vi.spyOn(q, 'invalidateQueries');
    await refreshShopPossessions(q);
    for (const key of ['bank', 'shop', 'economy', 'daily-life', 'furnishing']) {
      expect(spy).toHaveBeenCalledWith({ queryKey: [key] });
    }
    expect(q.getQueryData(['bank'])).toEqual({ balance: 100 });
    expect(q.getQueryState(['shop', 'state'])?.isInvalidated).toBe(true);
    expect(q.getQueryState(['furnishing', 'state'])?.isInvalidated).toBe(true);
  });
});