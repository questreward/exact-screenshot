import { describe, expect, it } from 'vitest';
import { BASE_SMIC, boundPriceIndex, previewRent, previewFuel } from './economy-presentation';
describe('economic presentation rules', () => {
 it('starts with a monthly net SMIC of €1400', () => expect(BASE_SMIC).toBe(1400));
 it('bounds every city index to 80–130', () => { expect(boundPriceIndex(1)).toBe(80); expect(boundPriceIndex(200)).toBe(130); expect(boundPriceIndex(100)).toBe(100); });
 it('caps monthly population-driven rent growth at 3%', () => { expect(previewRent(100, .8)).toBe(103); expect(previewRent(100, .01)).toBe(101); expect(previewRent(100, -.5)).toBe(100); expect(previewRent(129, .1)).toBe(130); });
 it('limits a fuel shock to 5–15%, still respecting the city ceiling', () => { expect(previewFuel(100, 0)).toBe(105); expect(previewFuel(100, .1)).toBeCloseTo(110); expect(previewFuel(100, 1)).toBeCloseTo(115); expect(previewFuel(130, .15)).toBe(130); });
});
