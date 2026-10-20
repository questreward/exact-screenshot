/** Presentation only: deterministic look of animated "bonshommes". No gameplay effect. */
export type PersonMood = 'walk' | 'idle' | 'wave' | 'talk' | 'cheer' | 'tired';
export type PersonLook = { skin: string; hair: string; top: string; legs: string; hairStyle: 'short' | 'long' | 'bun' | 'none'; flip: boolean };

const SKINS = ['#f3d2b3', '#e0ac85', '#c68863', '#8d5a3b', '#5c3a24'];
const HAIRS = ['#2b2118', '#5a3a22', '#a8652d', '#d9b46a', '#7a7a7a'];
const TOPS = ['var(--primary)', 'var(--secondary-foreground)', '#3d6b8c', '#5f8a5a', '#c9a227', '#8a4f7d'];
const LEGS = ['#2f3b4c', '#4a4a4a', '#6b5440', '#1f2a36'];
const STYLES: PersonLook['hairStyle'][] = ['short', 'long', 'bun', 'none'];

export function seedHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function personLook(seed: string): PersonLook {
  const h = seedHash(seed);
  const pick = <T,>(arr: T[], shift: number) => arr[(h >>> shift) % arr.length]!;
  return { skin: pick(SKINS, 0), hair: pick(HAIRS, 3), top: pick(TOPS, 6), legs: pick(LEGS, 9), hairStyle: pick(STYLES, 12), flip: ((h >>> 15) & 1) === 1 };
}

/** How many passers-by to draw in a place, by time of day. */
export function crowdSize(phase: string, max = 6): number {
  const base = phase === 'nuit' ? 1 : phase === 'matin' || phase === 'soir' ? 4 : 6;
  return Math.max(0, Math.min(max, base));
}
