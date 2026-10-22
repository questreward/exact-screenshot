import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ShopProduct } from '@/services/game';
vi.mock('./ProductPhoto', () => ({ ProductPhoto: () => null }));
vi.mock('@/game/sfx', () => ({ play: () => { throw new Error('audio indisponible'); } }));
import { CheckoutScanner } from './CheckoutScanner';
afterEach(cleanup);
const products = ['Téléphone', 'Lampe'].map((name, i): ShopProduct => ({ id: String(i), name, price: 10 + i, kind: 'item', brand: 'CIVITAS', section: 'tech', desc: '', dep: 0, owned: false, sales: 0, details: {} }));
it('scanne chaque article sans déclencher le paiement, même sans audio', () => {
  const complete = vi.fn();
  render(<CheckoutScanner items={products} price={p => p.price} onComplete={complete} onBack={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Vérifier le total' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Scanner Téléphone' }));
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Scanner Lampe' }));
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Vérifier le total' }));
  expect(complete).toHaveBeenCalledTimes(1);
});