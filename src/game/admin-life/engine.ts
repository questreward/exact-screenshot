import { CATEGORIES, DEADLINES, MISSIONS, type CategoryId, type Choice } from "./data";

export type MissionProgress = { best: number; done: boolean; attempts: number }; // best = 0..100
export type AdminLifeProgress = Record<string, MissionProgress>;

export const LEVELS = ["Débutant", "Autonome", "Autonome +", "Expert"] as const;

/** Score of a quiz answer: 1 if exactly the correct choices are selected. */
export function quizCorrect(choices: Choice[], selected: number[]): boolean {
  const good = choices.map((c, i) => (c.correct ? i : -1)).filter(i => i >= 0);
  return good.length === selected.length && good.every(i => selected.includes(i));
}

export function categoryScore(p: AdminLifeProgress, cat: CategoryId): number {
  const ms = MISSIONS.filter(m => m.category === cat);
  if (!ms.length) return 0;
  return Math.round(ms.reduce((s, m) => s + (p[m.id]?.best ?? 0), 0) / ms.length);
}

export function globalScore(p: AdminLifeProgress): number {
  if (!MISSIONS.length) return 0;
  return Math.round(MISSIONS.reduce((s, m) => s + (p[m.id]?.best ?? 0), 0) / MISSIONS.length);
}

/** Level 1..4 from the global score. */
export function level(p: AdminLifeProgress): number {
  const g = globalScore(p);
  return g >= 90 ? 4 : g >= 60 ? 3 : g >= 30 ? 2 : 1;
}

export function categoryUnlocked(p: AdminLifeProgress, cat: CategoryId): boolean {
  return level(p) >= (CATEGORIES.find(c => c.id === cat)?.unlockLevel ?? 1);
}

/** Knowledge sentences unlocked: one per third of mastery. */
export function knowledgeFor(score: number, list: string[]): string[] {
  const n = score >= 100 ? list.length : Math.floor((score / 100) * list.length);
  return list.slice(0, n);
}

/** Fictional APL estimate (game simulation, not the real CAF formula). */
export function simulateApl(input: { rent: number; monthlyIncome: number; people: number; student: boolean }): number {
  const base = Math.min(input.rent, 400 + 80 * (input.people - 1)) * 0.6;
  const reduction = Math.max(0, input.monthlyIncome - 600) * 0.35;
  const bonus = input.student ? 20 : 0;
  const v = Math.round(base - reduction + bonus);
  return v < 15 ? 0 : v;
}

/** Fictional simplified income tax (game simulation). */
export function simulateTax(annual: number, parts: number): number {
  const perPart = annual / parts;
  const brackets: [number, number][] = [[11000, 0], [28000, 0.11], [80000, 0.3], [Infinity, 0.41]];
  let prev = 0, tax = 0;
  for (const [limit, rate] of brackets) {
    if (perPart > prev) tax += (Math.min(perPart, limit) - prev) * rate;
    prev = limit;
  }
  return Math.round(tax * parts);
}

/** Upcoming deadlines from a given date. month 0 = every month. */
export function upcomingDeadlines(now: Date, count = 4) {
  const items = DEADLINES.map(d => {
    let date: Date;
    if (d.month === 0) {
      date = new Date(now.getFullYear(), now.getMonth(), d.day);
      if (date < now) date = new Date(now.getFullYear(), now.getMonth() + 1, d.day);
    } else {
      date = new Date(now.getFullYear(), d.month - 1, d.day);
      if (date < now) date = new Date(now.getFullYear() + 1, d.month - 1, d.day);
    }
    return { ...d, date, days: Math.ceil((date.getTime() - now.getTime()) / 86400000) };
  });
  return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count);
}
