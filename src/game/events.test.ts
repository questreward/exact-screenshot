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
  it('une annonce sans date de fin d’un jour passé va dans Récents', () => {
    const old = { ...base, id: '4', ends_at: null, phase: 'en_cours' as const, starts_at: '2026-10-15T06:00:00Z' };
    expect(filterEvents([old], 'aujourdhui', '2026-10-18T10:00:00Z', 'lyon')).toHaveLength(0);
    expect(filterEvents([old], 'recents', '2026-10-18T10:00:00Z', 'lyon')).toHaveLength(1);
  });
  it('résumé des gains affiché', () => {
    expect(rewardSummary({ money: 40, skill: null, skill_amount: 0, relation: 0, reputation: 2, civic: 0, political: 0, energy: 10, success_rate: 100 })).toEqual(['+40 €', '+2 réputation']);
  });
});

import { travelDelay, cityEffectLevel, markersByLocation } from './events';
describe('Bloc 14', () => {
  it('cumule les travaux avec un plafond de 40 minutes', () => { expect(travelDelay([])).toBe(0); expect(travelDelay([20])).toBe(20); expect(travelDelay([20, 20])).toBe(40); expect(travelDelay([20, 20, 20])).toBe(40); });
  it('niveau national selon la satisfaction 70/50/30', () => { expect(cityEffectLevel(70)).toBe('none'); expect(cityEffectLevel(60)).toBe('low'); expect(cityEffectLevel(49)).toBe('medium'); expect(cityEffectLevel(29)).toBe('strong'); expect(cityEffectLevel(null)).toBe('none'); });
  it('un seul marqueur par lieu, jamais pour un événement personnel', () => {
    const e = (id: string, loc: string, personal = false, marker = true): WorldEvent => ({ ...base, id, location_id: loc, personal, marker, phase: 'en_cours' });
    const m = markersByLocation([e('a', 'L1'), e('b', 'L1'), e('a', 'L1'), e('c', 'L2', true), e('d', 'L3', false, false)]);
    expect(m.size).toBe(1); expect(m.get('L1')?.length).toBe(2);
  });
});
