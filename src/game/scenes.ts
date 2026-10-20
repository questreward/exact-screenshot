/** Presentation only: preserve the existing 0–100 importance and all gameplay rules. */
export type SceneKind = 'public-life' | 'elections' | 'crisis' | 'city';
export type EventScene = { event_id: string; title: string; category: string; importance: number; location_name: string | null; starts_at: string; scope: string };
export function importanceLevel(value: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(value) || value < 25) return 1;
  if (value < 50) return 2;
  if (value < 65) return 3;
  return value < 85 ? 4 : 5;
}
export const IMPORTANCE_LABEL = { 1: 'Quotidien', 2: 'Vie locale', 3: 'À suivre', 4: 'Événement majeur', 5: 'Grand moment' } as const;
/** Exact official categories, never guess an event from a headline. */
export function sceneKind(category: string): SceneKind {
  switch (category.toLocaleLowerCase('fr-FR')) {
    case 'manifestation': case 'manifestations': return 'public-life';
    case 'élection': case 'élections': case 'élections municipales': case 'élections législatives': return 'elections';
    case 'crise': case 'crises': case 'urgence': return 'crisis';
    default: return 'city';
  }
}