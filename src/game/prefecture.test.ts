import { expect, it } from 'vitest';
import { titleDelay, titleFee } from './prefecture';
it('prices CNI, loss, passport and whole-euro registration', () => {
  expect(titleFee('identity')).toBe(0); expect(titleFee('identity', true)).toBe(25);
  expect(titleFee('passport')).toBe(86);
  for (const cv of [1, 2, 5, 7, 20]) expect(titleFee('registration', false, cv)).toBe(Math.ceil(13.76 + 46 * cv));
});
it('bounds deterministic processing at 7–21 game days including signed extremes', () => {
  for (const h of [-2147483648, -1, 0, 14, 2147483647, ...Array.from({length: 1000}, (_, i) => i)]) {
    expect(titleDelay(h)).toBeGreaterThanOrEqual(7); expect(titleDelay(h)).toBeLessThanOrEqual(21);
    expect(titleDelay(h)).toBe(titleDelay(h));
  }
  expect(titleDelay(0)).toBe(7); expect(titleDelay(14)).toBe(21);
});
