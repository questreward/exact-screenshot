import type { QueryClient } from '@tanstack/react-query';

/** Read back secured state, including after uncertainty; never subtract locally. */
export async function refreshShopPossessions(q: QueryClient) {
  await Promise.all(['shop', 'bank', 'economy', 'character', 'daily-life', 'housing', 'furnishing', 'online-bank', 'unified-economy', 'notifications'].map(key => q.invalidateQueries({ queryKey: [key] })));
}
