import { expect, it } from 'vitest';
import { dateMilestones } from './financial-dates';
it('propose des dates futures à partir du jour du jeu, même en fin d’année', () => {
  expect(dateMilestones(new Date('2026-12-28T23:00:00Z')).map(x => x.value)).toEqual(['2027-01-04', '2027-01-27', '2027-03-28', '2027-06-26']);
});