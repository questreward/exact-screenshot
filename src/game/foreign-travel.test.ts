import { describe, expect, it } from 'vitest';
import { documentRequirement, leaveUsage, travelPrice } from './foreign-travel';
describe('foreign travel presentation', () => {
 it('prices round trips and every night prospectively', () => {
  expect(travelPrice(60, 2, 'auberge')).toEqual({ transport: 60, accommodation: 60, total: 120 });
  expect(travelPrice(900, 14, 'hôtel', 1.1).total).toBe(2376);
  expect(travelPrice(61, 3, 'location', 1.01)).toEqual({ transport: 62, accommodation: 182, total: 244 });
 });
 it('requires the configured document, including non-EU Switzerland', () => { expect(documentRequirement(true)).toBe('CNI'); expect(documentRequirement(false)).toBe('Passeport'); });
 it('caps annual leave without penalizing unemployed characters', () => {
  expect(leaveUsage(14, 20, true)).toEqual({ balance: 5, paid: 5, absence: 9 });
  expect(leaveUsage(2, 25, true).absence).toBe(2);
  expect(leaveUsage(14, 0, false).absence).toBe(0);
 });
});
