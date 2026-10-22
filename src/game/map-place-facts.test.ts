import { describe, expect, it } from 'vitest';
import type { LifeState } from './life-state';
import { recordedPlaceFacts, placeAvailability } from './map-place-facts';
const activity = (id: string, location: string, status: string, type: string, npc: string | null = null) => ({ id, location_id: location, status, type, social_npc_id: npc, start_time: '2026-10-22T12:00:00Z' }) as LifeState['activities'][number];
describe('repères issus des faits enregistrés', () => {
  it('ne transforme pas une réservation ni un trajet en visite confirmée', () => {
    const facts = recordedPlaceFacts([activity('1', 'mairie', 'planned', 'social', 'lea'), activity('2', 'gare', 'completed', 'travel'), activity('3', 'atelier', 'completed', 'work')], 'parc');
    expect([...facts.visited]).toEqual(['parc', 'atelier']);
  });
  it('dédoublonne uniquement les rencontres réservées avec habitant et lieu enregistrés', () => {
    const reserved = activity('1', 'mairie', 'planned', 'social', 'lea');
    const facts = recordedPlaceFacts([reserved, reserved, activity('2', 'parc', 'completed', 'social', 'lea'), activity('3', 'cafe', 'planned', 'social')]);
    expect([...facts.meetings.keys()]).toEqual(['mairie']);
    expect(facts.meetings.get('mairie')?.map(a => a.id)).toEqual(['1']);
  });
  it('n’annonce pas ouvert quand les horaires sont inconnus', () => {
    expect(placeAvailability(null, true, new Date('2026-10-22T12:00:00Z'))).toBe('horaires non précisés');
    expect(placeAvailability('24 h / 24', false, new Date('2026-10-22T12:00:00Z'))).toBe('indisponible');
  });
});