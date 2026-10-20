import { describe, expect, it } from 'vitest';
import { missionResult, missionStepLabel, nextMissionThreshold } from './job-missions';
describe('job missions presentation', () => {
  it('uses promotion milestones 10/25/50', () => {
    expect([0,9,10,24,25,49,50].map(nextMissionThreshold)).toEqual([10,10,25,25,50,50,null]);
  });
  it('bounds step labels', () => {
    expect(missionStepLabel(0,6)).toBe('Étape 1 sur 6');
    expect(missionStepLabel(9,6)).toBe('Étape 6 sur 6');
    expect(missionStepLabel(-2,0)).toBe('Étape 1 sur 1');
  });
  it('makes expiry explicitly penalty-free', () => {
    expect(missionResult('expired')).toContain('sans pénalité');
    expect(missionResult('success')).toContain('réussie');
    expect(missionResult('failure')).toContain('difficile');
  });
});
