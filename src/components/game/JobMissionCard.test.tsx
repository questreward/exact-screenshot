import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
const { choose } = vi.hoisted(() => ({ choose: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/services/game', () => ({ chooseJobMission: choose, jobMissionsQuery: queryOptions({ queryKey: ['job-missions', 'daily'], queryFn: async () => null, staleTime: Infinity }) }));
import { JobMissionCard } from './JobMissionCard';
afterEach(cleanup);
describe('intervention existante', () => {
  it('ouvrir puis quitter le véhicule ne lance aucune action de mission', () => {
    choose.mockClear();
    const client = new QueryClient();
    client.setQueryData(['job-missions', 'daily'], { mission: { day: '2026-10-20', title: 'Poste de secours', job: 'protection_civile', status: 'active', step_index: 0, step_count: 2, step: { text: 'Accueil', choices: [{ label: 'Accueillir' }] }, reputation_delta: null, energy_cost: null }, progress: { successes: 0 } });
    render(<QueryClientProvider client={client}><JobMissionCard /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Scène et matériel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrer dans le véhicule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revenir à l’intervention' }));
    expect(choose).not.toHaveBeenCalled();
    expect(client.getQueryData(['job-missions', 'daily'])).toMatchObject({ mission: { step_index: 0, status: 'active', reputation_delta: null } });
  });
  it('transmet le jour et l’étape enregistrés, puis affiche le résultat renvoyé', async () => {
    const mission = { day: '2026-10-20', title: 'Feu d’appartement', job: 'pompier_pro', city_id: 'lyon', status: 'active', step_index: 2, step_count: 3, step: { text: 'Rapport', choices: [{ label: 'Rédiger le rapport' }] }, reputation_delta: null, energy_cost: null };
    const client = new QueryClient(); client.setQueryData(['job-missions', 'daily'], { mission, progress: { successes: 0 } });
    choose.mockResolvedValue({ mission: { ...mission, status: 'success', step: null, reputation_delta: 2, energy_cost: 7 }, progress: { successes: 1 } });
    render(<QueryClientProvider client={client}><JobMissionCard /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Dossier de mission' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Rédiger le rapport' }));
    await screen.findByText('Intervention réussie');
    expect(choose).toHaveBeenCalledExactlyOnceWith('2026-10-20', 2, 0);
    expect(client.getQueryData(['job-missions', 'daily'])).toMatchObject({ mission: { reputation_delta: 2, energy_cost: 7 } });
  });
  it('ne double pas une décision et conserve le dossier après une erreur réseau', async () => {
    choose.mockClear();
    const mission = { day: '2026-10-22', title: 'Service', job: 'police', city_id: null, status: 'active', step_index: 1, step_count: 3, step: { text: 'Observer', choices: [{ label: 'Demander du renfort' }] }, reputation_delta: null, energy_cost: null };
    const client = new QueryClient(); client.setQueryData(['job-missions', 'daily'], { mission });
    let fail: ((error: Error) => void) | undefined;
    choose.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    render(<QueryClientProvider client={client}><JobMissionCard /></QueryClientProvider>);
    const button = screen.getByRole('button', { name: 'Demander du renfort' });
    fireEvent.click(button); fireEvent.click(button);
    expect(choose).toHaveBeenCalledExactlyOnceWith('2026-10-22', 1, 0);
    fail?.(new Error('Connexion interrompue'));
    await screen.findByText('Décision non confirmée');
    expect(client.getQueryData(['job-missions', 'daily'])).toMatchObject({ mission: { step_index: 1, status: 'active', reputation_delta: null } });
  });
});