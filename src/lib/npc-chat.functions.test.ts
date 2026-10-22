import { afterEach, describe, expect, it, vi } from 'vitest';
const captured = vi.hoisted(() => ({ handler: undefined as undefined | ((args: any) => Promise<{ reply: string }>) }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: typeof captured.handler) => { captured.handler = fn; return fn; } };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
import './npc-chat.functions';
const id = '11111111-1111-1111-1111-111111111111';
function context(at = 'market') {
  const npc = { id, first_name: 'Léa', last_name: 'Martin', age: 34, profession: 'Boulangère', description: 'Souriante', traits: ['curieuse'], location_id: 'market', city_id: 'lyon', location: { name: 'Marché de Lyon' } };
  const sb = { rpc: vi.fn((name: string) => Promise.resolve({ data: name === 'social_state' ? { nearby: [npc], relations: [], world_now: '2026-10-22T09:00:00Z' } : { position: { location_id: at, city_id: 'lyon' } } })), from: () => chain };
  const chain: any = { select: () => chain, is: () => chain, eq: () => chain, lte: () => chain, gte: () => chain, limit: () => Promise.resolve({ data: [] }) };
  return { supabase: sb };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('personnage et lieu validés avant notre IA', () => {
  it('utilise le portrait et le lieu du serveur et non un contexte fourni par le joueur', async () => {
    vi.stubEnv('OLLAMA_URL', 'http://local-ai.invalid');
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'Bonjour au marché !' } }) });
    vi.stubGlobal('fetch', fetcher);
    const result = await captured.handler?.({ data: { npcId: id, history: [{ role: 'user', content: 'Bonjour' }] }, context: context() });
    expect(result).toEqual({ reply: 'Bonjour au marché !' });
    const messages = JSON.parse(fetcher.mock.calls[0]?.[1].body).messages;
    for (const fact of ['Léa Martin', 'Boulangère', 'Souriante', 'curieuse', 'Marché de Lyon']) expect(messages[0].content).toContain(fact);
    expect(messages[1]).toEqual({ role: 'user', content: 'Bonjour' });
  });
  it('ne contacte pas le modèle si le joueur n’est pas au lieu rencontré', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(captured.handler?.({ data: { npcId: id, history: [{ role: 'user', content: 'Bonjour' }] }, context: context('park') })).rejects.toThrow('Marché de Lyon');
    expect(fetcher).not.toHaveBeenCalled();
  });
});