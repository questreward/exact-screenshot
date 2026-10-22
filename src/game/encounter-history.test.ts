import { describe, expect, it } from 'vitest';
import { encounterHistory } from './encounter-history';
import type { SocialState } from './social';

const event = (id: string, npc: string, occurred: string) => ({ id, npc_id: npc, occurred_at: occurred, character_id: 'me', action_id: 'discuss', relation_gain: 2 });
describe('faits sociaux enregistrés', () => {
  it('isole la bonne identité et classe les rencontres sans modifier la source', () => {
    const history: SocialState['history'] = [event('old', 'lea', '2026-10-21T10:00:00Z'), event('other', 'paul', '2026-10-22T12:00:00Z'), event('new', 'lea', '2026-10-22T10:00:00Z')];
    expect(encounterHistory(history, 'lea').map(item => item.id)).toEqual(['new', 'old']);
    expect(history.map(item => item.id)).toEqual(['old', 'other', 'new']);
  });
  it('ne compte pas deux fois le même fait et n’invente aucun souvenir', () => {
    const saved = event('same', 'lea', '2026-10-22T10:00:00Z');
    expect(encounterHistory([saved, saved], 'lea')).toEqual([saved]);
    expect(encounterHistory([saved], 'paul')).toEqual([]);
  });
});