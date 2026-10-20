import { describe, expect, it } from 'vitest';
import { publicPlaceEvents, isCurrentPlace, recordedImpacts } from './living-city';
import type { WorldEvent } from './events';

const event: WorldEvent = { id: 'public', title: 'Rencontre', description: null, category: 'Ville', press_category: 'Ville', city_id: 'lyon', scope: 'local', location_id: 'place', location_name: 'Place', district_id: 'centre', starts_at: '2026-10-20T08:00:00Z', ends_at: '2026-10-20T18:00:00Z', importance: 65, interactive: false, personal: false, reason: null, duration_kind: null, news_id: null, phase: 'en_cours', eligible: false, conflict: null, participation: null, reward: null };
const now = '2026-10-20T12:00:00Z';
describe('ville vivante — faits publics', () => {
  it('exclut les événements personnels', () => {
    expect(publicPlaceEvents([event, { ...event, id: 'private', personal: true }], 'lyon', 'place', now).map(e => e.id)).toEqual(['public']);
  });
  it('ne transporte pas un événement vers un autre lieu ou une autre ville', () => {
    expect(publicPlaceEvents([event], 'paris', 'place', now)).toEqual([]);
    expect(publicPlaceEvents([event], 'lyon', 'gare', now)).toEqual([]);
    expect(publicPlaceEvents([{ ...event, location_id: null }], 'lyon', 'gare', now)[0]?.location_id).toBeNull();
  });
  it('ne montre ni événement futur ni ancien comme actif', () => {
    expect(publicPlaceEvents([{ ...event, phase: 'a_venir' }, { ...event, starts_at: '2026-10-21T08:00:00Z' }, { ...event, ends_at: null, starts_at: '2026-10-19T08:00:00Z' }, { ...event, phase: 'termine' }], 'lyon', 'place', now)).toEqual([]);
  });
  it('retire les données personnelles de la projection', () => {
    const result = publicPlaceEvents([event], 'lyon', 'place', now)[0];
    expect(result).not.toHaveProperty('participation');
    expect(result).not.toHaveProperty('reward');
  });
  it('distingue le lieu consulté de la position réelle', () => {
    expect(isCurrentPlace('gare', 'place')).toBe(false);
    expect(isCurrentPlace('place', 'place')).toBe(true);
    expect(isCurrentPlace(null, 'place')).toBe(false);
  });
  it('n’invente pas d’effet réalisé à partir d’un effet attendu', () => {
    expect(recordedImpacts(null)).toEqual({});
    expect(recordedImpacts({ transport: 3, culture: 'prévu' })).toEqual({ transport: 3 });
  });
});