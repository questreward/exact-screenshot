import {describe,it,expect} from 'vitest';
import {prioritiesValid,projectProgress,GOVERNANCE_INITIAL_SETTINGS,GOVERNANCE_INDICATORS} from './governance';
describe('Mandat : règles de présentation',()=>{
 it('limite les priorités actives à trois',()=>{expect(GOVERNANCE_INITIAL_SETTINGS.max_priorities).toBe(3);expect(prioritiesValid(['housing','transport','employment'],3)).toBe(true);expect(prioritiesValid(['housing','transport','employment','culture'],3)).toBe(false);});
 it('interdit des priorités répétées ou inconnues',()=>{expect(prioritiesValid(['transport','transport'],3)).toBe(false);expect(prioritiesValid(['unknown'],3)).toBe(false);});
 it('conserve neuf dimensions sans score unique',()=>{expect(Object.keys(GOVERNANCE_INDICATORS)).toHaveLength(9);expect(Object.keys(GOVERNANCE_INDICATORS)).not.toContain('score');});
 it('calcule la progression sur le temps du monde sans terminer côté navigateur',()=>{const p={workflow:'running',funded_at:'2027-09-01T08:00:00Z',ends_at:'2027-09-15T08:00:00Z'};expect(projectProgress(p,'2027-09-08T08:00:00Z')).toBe(50);expect(projectProgress(p,'2027-10-01T08:00:00Z')).toBe(99);expect(projectProgress({...p,workflow:'completed'},'2027-10-01T08:00:00Z')).toBe(100);});
});