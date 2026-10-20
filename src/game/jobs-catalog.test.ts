import { describe, it, expect } from 'vitest';
import { JOBS_CATALOG, jobDetails, jobRequirements, groupJobOffers } from './jobs-catalog';
describe('expanded job hints', () => {
 it('preserves validated net monthly salaries', () => {
  expect(jobDetails('Médecin')?.salary).toBe(4500);
  expect(jobDetails('Facteur')?.salary).toBe(1600);
  expect(jobDetails('Caissier')?.salary).toBe(1450);
 });
 it('shows diploma, long studies, exam and licence gates', () => {
  expect(jobRequirements('Médecin').join()).toContain('Diplôme de médecin');
  expect(jobRequirements('Avocat').join()).toContain('examen');
  expect(jobRequirements('Chauffeur de bus')).toContain('Permis de conduire');
  expect(jobRequirements('Caissier')).toEqual(['18 ans minimum']);
 });
 it('groups all roles and keeps missions narrative', () => {
  expect(JOBS_CATALOG).toHaveLength(27);
  expect(JOBS_CATALOG.every(j => j.missions.length >= 2)).toBe(true);
  expect(groupJobOffers([...JOBS_CATALOG])).toHaveLength(7);
  expect(groupJobOffers([{title:'Vendeur'}])[0]?.category).toBe('Autres métiers');
 });
});
