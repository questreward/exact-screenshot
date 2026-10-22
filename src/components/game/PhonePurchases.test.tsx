import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/services/game', () => ({ shopQuery: queryOptions({ queryKey: ['shop', 'state'], queryFn: async () => ({ orders: [] }) }), formatMoney: (n: number) => `${n} €` }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
import { PhonePurchases } from './PhonePurchases';
afterEach(cleanup);
it('consulte les montants et lieux enregistrés, même si le produit change ou est revendu', () => {
  const q = new QueryClient();
  q.setQueryData(['shop', 'state'], { orders: [{ reference: 'CIV-A', name: 'Lit', brand: 'CIVITAS', price: 37, at: '2026-10-22T09:00:00Z', location_name: 'Magasin de Lyon' }], products: [{ name: 'Lit', price: 200 }], assets: [] });
  render(<QueryClientProvider client={q}><PhonePurchases /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Voir le ticket' }));
  expect(screen.getAllByText('37 €')).toHaveLength(2);
  expect(screen.getByText('Lit · Magasin de Lyon')).toBeDefined();
  expect(screen.queryByText('200 €')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retour aux achats' }));
  expect(q.getQueryData<{ orders: unknown[] }>(['shop', 'state'])?.orders).toHaveLength(1);
});