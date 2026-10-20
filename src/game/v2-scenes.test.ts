import { describe, expect, it } from 'vitest';
import { cabForJob, crowdDots, CAB_HOTSPOTS } from './v2-scenes';
describe('scènes V2', () => {
  it('choisit le bon véhicule par métier', () => {
    expect(cabForJob('pompier_vol')).toBe('pompiers');
    expect(cabForJob('samu_infirmier')).toBe('samu');
    expect(cabForJob('protection_civile')).toBe('protection_civile');
    expect(cabForJob('boulanger')).toBeNull();
  });
  it('foule proportionnelle et plafonnée à 60', () => { expect(crowdDots(0)).toBe(0); expect(crowdDots(8)).toBe(24); expect(crowdDots(100)).toBe(60); });
  it('points tactiles dans l’image', () => { for (const l of Object.values(CAB_HOTSPOTS)) for (const h of l) { expect(h.x).toBeGreaterThan(0); expect(h.x).toBeLessThan(100); } });
});
