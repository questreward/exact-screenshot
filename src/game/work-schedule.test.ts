import { describe, expect, it } from 'vitest';
import type { LifeActivity } from './life-state';
import { workSchedule } from './work-schedule';
const shift = (id: string, status: string, start: string, end: string) => ({ id, type: 'work', status, start_time: start, end_time: end }) as LifeActivity;
describe('planning professionnel enregistré', () => {
  it('conserve le service de la veille en attente de confirmation devant une réservation', () => {
    const running = shift('night', 'running', '2026-10-21T22:00:00Z', '2026-10-22T06:00:00Z');
    const planned = shift('next', 'planned', '2026-10-22T08:00:00Z', '2026-10-22T16:00:00Z');
    expect(workSchedule([planned, running]).active.map(a => a.id)).toEqual(['night', 'next']);
    expect(workSchedule([running]).lastCompleted).toBeUndefined();
  });
  it('retient le dernier bilan confirmé, sans compter annulation ni transport', () => {
    const old = shift('old', 'completed', '2026-10-20T08:00:00Z', '2026-10-20T16:00:00Z');
    const latest = shift('latest', 'completed', '2026-10-21T08:00:00Z', '2026-10-21T16:00:00Z');
    expect(workSchedule([old, latest, { ...latest, id: 'bus', type: 'transport' }, { ...latest, id: 'cancel', status: 'cancelled' }]).lastCompleted?.id).toBe('latest');
  });
  it('ne duplique pas un service et conserve les données sources', () => {
    const a = shift('one', 'planned', '2026-10-22T08:00:00Z', '2026-10-22T16:00:00Z');
    const rows = [a, a];
    expect(workSchedule(rows).active).toEqual([a]);
    expect(rows).toHaveLength(2);
  });
});