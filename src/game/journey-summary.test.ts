import { describe, expect, it } from 'vitest';
import { journeySummary } from './journey-summary';

describe('suivi du trajet enregistré', () => {
  const start = '2026-10-22T10:00:00Z', end = '2026-10-22T11:00:00Z';
  it('lit la durée et les prochains tronçons et radars sans changer leur ordre source', () => {
    const segments = [{ from: 50, to: 100, limit: 90, label: 'Route' }, { from: 0, to: 50, limit: 50, label: 'Ville' }];
    const radars = [{ at: 80, limit: 90 }, { at: 30, limit: 50 }];
    expect(journeySummary(start, end, Date.parse('2026-10-22T10:15:00Z'), segments, radars)).toMatchObject({ progress: 25, remainingMinutes: 45, awaitingConfirmation: false, segment: segments[1], nextSegment: segments[0], nextRadar: radars[1] });
    expect(radars.map(r => r.at)).toEqual([80, 30]);
  });
  it('ne confirme jamais une arrivée au seul passage de la date prévue', () => {
    expect(journeySummary(start, end, Date.parse('2026-10-22T11:01:00Z'))).toMatchObject({ progress: 100, remainingMinutes: 0, awaitingConfirmation: true, segment: undefined, nextRadar: undefined });
  });
  it('ne fabrique pas de durée si les dates ne sont pas utilisables', () => {
    expect(journeySummary(start, start, Date.parse(start)).remainingMinutes).toBeNull();
    expect(journeySummary(start, 'inconnue', Date.parse(start)).awaitingConfirmation).toBe(false);
  });
});