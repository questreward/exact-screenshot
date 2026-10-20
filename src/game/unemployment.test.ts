import { describe, expect, it } from 'vitest';
import { missedPeriods, periodLabel } from './unemployment';

describe('unemployment helpers', () => {
  it('labels a period in French', () => { expect(periodLabel('2026-11')).toBe('novembre 2026'); });
  it('a month is missed only after the 15th of the next month', () => {
    expect(missedPeriods([], '2026-10-20T00:00:00Z', '2026-11-15T12:00:00Z', 15)).toEqual([]);
    expect(missedPeriods([], '2026-10-20T00:00:00Z', '2026-11-16T00:00:00Z', 15)).toEqual(['2026-10']);
  });
  it('declared months are not missed', () => {
    expect(missedPeriods(['2026-10'], '2026-10-20T00:00:00Z', '2027-01-16T00:00:00Z', 15)).toEqual(['2026-11', '2026-12']);
  });
});
