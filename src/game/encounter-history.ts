import type { SocialState } from './social';

/** Faits sociaux conservés, jamais des conversations temporaires ou des routines déduites. */
export function encounterHistory(history: SocialState['history'], npcId: string) {
  const unique = new Map<string, SocialState['history'][number]>();
  for (const item of history) {
    if (item.npc_id === npcId && !unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}