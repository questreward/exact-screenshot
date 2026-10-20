/** Presentation helpers for the monthly actualisation; the server decides what is open and paid. */
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** Months whose window has closed without a declaration (radiation for that month). */
export function missedPeriods(declared: string[], from: string, now: string, closeDay: number): string[] {
  const out: string[] = []; const n = new Date(now); const d = new Date(from);
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  for (;;) {
    const closes = Date.UTC(m === 11 ? y + 1 : y, (m + 1) % 12, closeDay + 1);
    if (closes > n.getTime()) break;
    const p = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (!declared.includes(p)) out.push(p);
    m += 1; if (m === 12) { m = 0; y += 1; }
  }
  return out;
}
