import { describe, expect, it } from 'vitest';
import { propertyTax, taxInstalments, taxReplyDue } from './tax-space';
describe('fictional tax space hints', () => {
  it('splits exactly into ten whole-euro instalments', () => {
    for (const amount of [0, 3, 100, 1003]) {
      const parts = taxInstalments(amount);
      expect(parts).toHaveLength(10);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(amount);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
  it('answers after two game days', () => expect(taxReplyDue('2026-01-31T12:00:00Z')).toBe('2026-02-02T12:00:00.000Z'));
  it('assesses approximately one month of theoretical rent', () => {
    expect(propertyTax(240000)).toBe(1000);
    expect(propertyTax(240000, 25)).toBe(750);
  });
});
