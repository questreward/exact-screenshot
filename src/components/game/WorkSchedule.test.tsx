import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LifeActivity } from '@/game/life-state';
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children }: { to: string; search?: object; children: React.ReactNode }) => <a href={to} onClick={e => { e.preventDefault(); navigate(to, search); }}>{children}</a> }));
vi.mock('./WorldClock', () => ({ useWorldClock: () => ({ time: new Date('2026-10-22T08:00:00Z') }) }));
import { WorkSchedule } from './WorkSchedule';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('accès au service enregistré', () => {
  it('ouvre exclusivement le lieu du service, pas une destination professionnelle supposée', () => {
    const activity = { id: 'night', type: 'work', status: 'running', title: 'Service', start_time: '2026-10-21T22:00:00Z', end_time: '2026-10-22T06:00:00Z', location: { id: 'depot', city_id: 'lyon', district_id: 'centre', name: 'Dépôt' } } as LifeActivity;
    render(<WorkSchedule activities={[activity]} />);
    fireEvent.click(screen.getByRole('link', { name: 'Voir le lieu du service' }));
    expect(navigate).toHaveBeenCalledWith('/carte', { city: 'lyon', district: 'centre', location: 'depot' });
    fireEvent.click(screen.getByRole('link', { name: 'Reprendre mon service' }));
    expect(navigate).toHaveBeenLastCalledWith('/carriere', undefined);
    expect(activity.status).toBe('running');
  });
});