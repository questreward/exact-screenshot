import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./WorldClock', () => ({ useWorldClock: () => ({ time: new Date('2026-10-22T10:00:00Z') }) }));
vi.mock('@/services/game', () => ({ notificationsQuery: queryOptions({ queryKey: ['notices'], queryFn: async () => [], staleTime: Infinity }) }));
import { PhoneFrame } from './PhoneFrame';
afterEach(cleanup);

describe('commandes du téléphone', () => {
  it('distingue le retour, l’accueil et la fermeture sans effectuer une action du jeu', () => {
    const back = vi.fn(), home = vi.fn(), close = vi.fn();
    const q = new QueryClient(); q.setQueryData(['notices'], []);
    render(<QueryClientProvider client={q}><PhoneFrame app="messages" title="Messages" onBack={back} onHome={home} onClose={close} onNotifications={() => {}}>Conversation</PhoneFrame></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Revenir à l’écran précédent' }));
    expect(back).toHaveBeenCalledOnce(); expect(home).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Écran d’accueil du téléphone' }));
    expect(home).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le téléphone' }));
    expect(close).toHaveBeenCalledOnce();
  });
  it('réessaie une lecture échouée sans supprimer les données des autres applications', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('Connexion interrompue')).mockResolvedValue('Données enregistrées');
    function App() { const { data } = useSuspenseQuery({ queryKey: ['test-app'], queryFn: read }); return <p>{data}</p>; }
    const q = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    q.setQueryData(['notices'], []); q.setQueryData(['retained'], { conversation: '42' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<QueryClientProvider client={q}><PhoneFrame app="messages" title="Messages" onHome={() => {}} onClose={() => {}} onNotifications={() => {}}><App /></PhoneFrame></QueryClientProvider>);
      fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
      await screen.findByText('Données enregistrées');
      await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
      expect(q.getQueryData(['retained'])).toEqual({ conversation: '42' });
    } finally { consoleSpy.mockRestore(); }
  });
});