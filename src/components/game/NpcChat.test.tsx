import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { chat } = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => chat }));
vi.mock('@/lib/npc-chat.functions', () => ({ chatWithNpc: vi.fn() }));
import { NpcChat } from './NpcChat';

beforeEach(() => { chat.mockReset(); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
function openChat() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><NpcChat npcId="11111111-1111-1111-1111-111111111111" name="Léa" here /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Discuter' }));
}
describe('conversation locale', () => {
  it('réessaie la même demande après échec, sans doubler le message', async () => {
    chat.mockRejectedValueOnce(new Error('Indisponible')).mockResolvedValueOnce({ reply: 'Bonjour !' });
    openChat();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Salut' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer le même message' }));
    await screen.findByText('Bonjour !');
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1]?.[0]).toEqual(chat.mock.calls[0]?.[0]);
    expect(screen.getAllByText('Salut')).toHaveLength(1);
  });
  it('reprend puis efface seulement la conversation de cette page', async () => {
    chat.mockResolvedValue({ reply: 'Bonjour !' }); openChat();
    fireEvent.click(screen.getByRole('button', { name: 'Comment ça va ?' }));
    await screen.findByText('Bonjour !');
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la conversation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la conversation' }));
    expect(screen.getByText('Bonjour !')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer la conversation' }));
    await waitFor(() => expect(screen.queryByText('Bonjour !')).not.toBeInTheDocument());
  });
});