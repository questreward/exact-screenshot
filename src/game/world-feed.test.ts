import { describe, expect, it } from 'vitest';
import { worldFeed } from './world-feed';
import type { WorldEvent } from './events';

const event: WorldEvent = { id: 'rain', title: 'Fortes pluies', description: null, category: 'Ville', press_category: null, city_id: 'lyon', scope: 'local', location_id: 'place', location_name: 'Place', district_id: 'centre', starts_at: '2026-10-22T10:00:00Z', ends_at: '2026-10-22T13:00:00Z', importance: 70, interactive: false, personal: false, reason: null, duration_kind: null, news_id: 'article', phase: 'en_cours', eligible: false, conflict: null, participation: null, reward: null };
const now = '2026-10-22T11:00:00Z';
describe('événement partagé du monde', () => {
  it('conserve une seule identité et les liens factuels sans générer de conséquences', () => {
    expect(worldFeed([event, event], now, 'lyon')).toEqual([event]);
    expect(worldFeed([event], now, 'lyon')[0]?.news_id).toBe('article');
  });
  it('ne montre pas les événements privés ou ceux d’une autre ville', () => {
    expect(worldFeed([event, { ...event, id: 'private', personal: true }], now, 'paris')).toEqual([]);
    expect(worldFeed([{ ...event, personal: true }], now, 'lyon')).toEqual([]);
  });
  it('partage une annonce nationale dans toutes les villes sans modifier sa portée', () => {
    const national = { ...event, city_id: null, scope: 'national' as const, district_id: null };
    expect(worldFeed([national], now, 'paris')).toEqual([national]);
  });
  it('retire un événement terminé après reconnexion et ne transforme pas une phase à venir', () => {
    expect(worldFeed([event], '2026-10-22T13:00:00Z', 'lyon')).toEqual([]);
    expect(worldFeed([{ ...event, phase: 'a_venir' }], now, 'lyon')).toEqual([]);
    expect(worldFeed([{ ...event, phase: 'termine' }], now, 'lyon')).toEqual([]);
  });
  it('respecte le secteur sélectionné', () => {
    expect(worldFeed([event], now, 'lyon', 'nord')).toEqual([]);
    expect(worldFeed([event], now, 'lyon', 'centre')).toEqual([event]);
  });
});