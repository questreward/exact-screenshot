import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '@/integrations/supabase/types';
const { enter, leave } = vi.hoisted(() => ({ enter: vi.fn(), leave: vi.fn() }));
vi.mock('@/services/game', () => ({ enterLocationSpace: enter, leaveLocationSpace: leave }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { BuildingSpaces } from './BuildingSpaces';
const room: Tables<'location_spaces'> = { id: 'hall', location_id: 'townhall', parent_id: null, kind: 'room', name: 'Accueil', accessible: true };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount(here = true, currentSpace: string | null = null, closed = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><BuildingSpaces spaces={[room]} here={here} currentSpace={currentSpace} closed={closed} /></QueryClientProvider>);
  return client;
}
describe('entrées sécurisées existantes', () => {
  it('empêche une entrée quand le lieu est fermé', () => {
    mount(true, null, true);
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));
    expect(enter).not.toHaveBeenCalled();
  });
  it('permet de sortir de sa pièce même après la fermeture', async () => {
    leave.mockResolvedValue(null);
    mount(true, 'hall', true);
    fireEvent.click(screen.getByRole('button', { name: 'Sortir' }));
    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
  });
  it('ne lance aucune entrée depuis un lieu simplement consulté', () => {
    mount(false);
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));
    expect(enter).not.toHaveBeenCalled();
  });
  it('envoie exactement la pièce enregistrée et actualise la position', async () => {
    enter.mockResolvedValue(null);
    const client = mount();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['position'], refetchType: 'all' }, { throwOnError: true }));
    expect(enter).toHaveBeenCalledWith('hall');
    expect(leave).not.toHaveBeenCalled();
  });
  it('bloque les décisions après une réponse incertaine jusqu’à une lecture réussie', async () => {
    enter.mockRejectedValue(new Error('Réponse inconnue'));
    const client = mount();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockRejectedValueOnce(new Error('Lecture indisponible')).mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Entrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier ma position' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Vérifier ma position' }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole('button', { name: 'Entrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier ma position' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(enter).toHaveBeenCalledTimes(1);
  });
  it('sort exclusivement de la pièce courante enregistrée', async () => {
    leave.mockResolvedValue(null);
    mount(true, 'hall');
    fireEvent.click(screen.getByRole('button', { name: 'Sortir' }));
    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
    expect(enter).not.toHaveBeenCalled();
  });
});