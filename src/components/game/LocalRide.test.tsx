import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LifeActivity } from '@/game/life-state';
vi.mock('@/services/game', () => ({ locationPlaceQuery: (id: string) => ({ queryKey: ['place', id], queryFn: async () => null, staleTime: Infinity }) }));
vi.mock('./WorldClock', () => ({ useWorldClock: () => ({ time: new Date('2026-10-22T12:00:00Z') }) }));
vi.mock('./RealMapBox', () => ({ useRealMapReady: () => false, RealMapBox: () => null }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
import { LocalRide } from './LocalRide';
afterEach(cleanup);
describe('arrivée locale confirmée', () => {
  const activity = { id: 'bus', type: 'transport', status: 'running', start_time: '2026-10-22T10:00:00Z', end_time: '2026-10-22T11:00:00Z', location_id: 'station', target_location_id: 'shop' } as LifeActivity;
  it('ne propose pas de quitter le trajet au seul dépassement de la date prévue', () => {
    const q = new QueryClient();
    render(<QueryClientProvider client={q}><LocalRide activity={activity} /></QueryClientProvider>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(activity.status).toBe('running');
  });
  it('permet de quitter un trajet seulement après la confirmation enregistrée', () => {
    const q = new QueryClient();
    render(<QueryClientProvider client={q}><LocalRide activity={{ ...activity, status: 'completed' }} /></QueryClientProvider>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/carte');
  });
});