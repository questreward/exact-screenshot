import { describe, expect, it } from 'vitest';
import { clampPropertyTaxRate, municipalPropertyTaxAmount } from './municipal-property-tax';
describe('municipal property tax presentation', () => {
  it('clamps the annual rate to 80–120%', () => {
    expect(clampPropertyTaxRate(40)).toBe(80);
    expect(clampPropertyTaxRate(150)).toBe(120);
    expect(clampPropertyTaxRate(100)).toBe(100);
    expect(clampPropertyTaxRate(NaN)).toBe(100);
  });
  it('applies the rate to the unchanged base, rounding whole euros', () => {
    expect(municipalPropertyTaxAmount(1000, 80)).toBe(800);
    expect(municipalPropertyTaxAmount(1000, 100)).toBe(1000);
    expect(municipalPropertyTaxAmount(1000, 120)).toBe(1200);
    expect(municipalPropertyTaxAmount(101, 110)).toBe(111);
    expect(municipalPropertyTaxAmount(-10, 100)).toBe(0);
  });
});
