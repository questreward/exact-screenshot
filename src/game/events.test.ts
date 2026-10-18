import { describe, expect, it } from 'vitest';
import { canAct, filterEvents, rewardSummary, type WorldEvent } from './events';

const base: WorldEvent = { id: '1', title: 'Forum', description: null, category: 'Études', press_category: null, city_id: 'lyon', scope: 'local', location_id: null,
  location_name: null, district_id: null, starts_at: '2026-10-18T14:00:00Z', ends_at: '2026-10-18T17:00:00Z', importance: 50, interactive: true, personal: false,
  reason: null, duration_kind: 'temporaire', news_id: null, phase: 'a_venir', eligible: true, conflict: null, participation: null, reward: null };

describe('événements (présentation)', () => {
  it('participation possible jusqu’à 30 minutes après le début', () => {
    expect(canAct(base, '2026-10-18T14:30:00Z')).toBe(true);
    expect(canAct(base, '2026-10-18T14:31:00Z')).toBe(false);
  });
  it('aucun second choix après une participation', () => {
    expect(canAct({ ...base, participation: { choice: 'ignorer', status: 'ignore', outcome: null, activity_id: null } }, '2026-10-18T10:00:00Z')).toBe(false);
  });
  it('les événements terminés vont dans Récents', () => {
    const done = { ...base, id: '2', phase: 'termine' as const };
    expect(filterEvents([base, done], 'recents', '2026-10-18T18:00:00Z', 'lyon').map(e => e.id)).toEqual(['2']);
  });
  it('un événement personnel apparaît dans Pour vous, pas dans Ma ville', () => {
    const mine = { ...base, id: '3', personal: true, interactive: false };
    expect(filterEvents([mine], 'pour_vous', base.starts_at, 'lyon')).toHaveLength(1);
    expect(filterEvents([mine], 'ma_ville', base.starts_at, 'lyon')).toHaveLength(0);
  });
  it('résumé des gains affiché', () => {
    expect(rewardSummary({ money: 40, skill: null, skill_amount: 0, relation: 0, reputation: 2, civic: 0, political: 0, energy: 10, success_rate: 100 })).toEqual(['+40 €', '+2 réputation']);
  });
});
