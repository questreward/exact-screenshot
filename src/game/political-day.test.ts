import { describe, expect, it } from 'vitest';
import { politicalAppointments, localPoliticalEvents } from './political-day';
import type { PoliticalState } from './politics';
import type { ElectionState } from './elections';

const p = { city_id: 'paris', organizations: [], activities: [] } as unknown as PoliticalState;
const a = { id: 'activity-1', title: 'Terrain', start_time: '2026-10-22T10:00:00Z', end_time: '2026-10-22T11:00:00Z', status: 'running', organization_event_id: 'event-1', organization_id: 'party-1' };
describe('politique dans le monde enregistré', () => {
  it('une proposition d’activité ne devient pas un rendez-vous réservé', () => {
    const politics = { ...p, organizations: [{ id: 'party-1', status: 'active', city_id: 'paris', events: [{ id: 'event-1', location: { id: 'place-1', city_id: 'paris' } }] }] } as unknown as PoliticalState;
    expect(localPoliticalEvents(politics)).toHaveLength(1);
    expect(politicalAppointments(politics)).toEqual([]);
  });
  it('le temps écoulé ne transforme pas une activité en réussite', () => {
    const appointments = politicalAppointments({ ...p, activities: [a, { ...a, id: 'cancelled', status: 'cancelled' }, { ...a, id: 'done', status: 'completed' }] });
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({ id: 'activity-1', status: 'running', location: undefined });
  });
  it('réunit les deux sources sans doublon et exclut la campagne d’un autre joueur', () => {
    const elections = { elections: [{ id: 'election-1', candidates: [{ id: 'me', mine: true }, { id: 'other', mine: false }] }], actions: [{ candidacy_id: 'me', activity: a }, { candidacy_id: 'other', activity: { ...a, id: 'private-other' } }] } as unknown as ElectionState;
    expect(politicalAppointments({ ...p, activities: [a] }, elections).map(row => row.id)).toEqual(['activity-1']);
  });
  it('une campagne sans activité enregistrée ne crée pas de lieu ni de trajet', () => {
    const elections = { elections: [{ id: 'election-1', candidates: [{ id: 'me', mine: true }] }], actions: [{ candidacy_id: 'me', activity: null }] } as unknown as ElectionState;
    expect(politicalAppointments(p, elections)).toEqual([]);
  });
});