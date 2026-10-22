import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PoliticalState } from '@/game/politics';
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, params, children }: { to: string; search?: Record<string, string>; params?: { id: string }; children: React.ReactNode }) => <a href={to.replace('$id', params?.id ?? '') + (search ? '?' + new URLSearchParams(search).toString() : '')}>{children}</a> }));
import { PoliticalDay } from './PoliticalDay';
afterEach(cleanup);
describe('destination des rendez-vous politiques', () => {
  it('ouvre le lieu enregistré et le parti associé, sans attribuer une présence au joueur', () => {
    const politics = { city_id: 'paris', organizations: [{ id: 'party-1', name: 'Parti fictif', status: 'active', city_id: 'paris', events: [{ id: 'event-1', title: 'Réunion', location: { id: 'place-1', name: 'Salle du centre', city_id: 'paris', district_id: 'centre' }, start_hour: 9, duration_minutes: 60, energy_cost: 10 }] }], activities: [{ id: 'activity-1', title: 'Réunion réservée', start_time: '2026-10-22T09:00:00Z', end_time: '2026-10-22T10:00:00Z', status: 'planned', organization_id: 'party-1', organization_event_id: 'event-1' }] } as unknown as PoliticalState;
    render(<PoliticalDay politics={politics} />);
    expect(screen.getByRole('link', { name: 'Voir le lieu' }).getAttribute('href')).toBe('/carte?city=paris&district=centre&location=place-1');
    expect(screen.getByRole('link', { name: 'L’activité du parti' }).getAttribute('href')).toBe('/politique/party-1');
    expect(politics.activities[0]?.status).toBe('planned');
  });
});