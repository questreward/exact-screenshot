/** Bilan des promotions : compare la période de promo avec la même durée juste avant. Affichage seul. */
export type PromoRow = { percent: number; starts_at: string; ends_at: string };
export type OrderRow = { amount: number; created_at: string };
export type ReviewRow = { stars: number; created_at: string };
export type Window = { clients: number; revenue: number; stars: number | null };
export type PromoResult = PromoRow & { during: Window; before: Window; clientsChange: number | null };

function windowOf(orders: OrderRow[], reviews: ReviewRow[], from: number, to: number): Window {
  const inside = (d: string) => { const t = new Date(d).getTime(); return t >= from && t < to; };
  const o = orders.filter((x) => inside(x.created_at));
  const r = reviews.filter((x) => inside(x.created_at));
  return { clients: o.length, revenue: o.reduce((s, x) => s + x.amount, 0), stars: r.length ? Math.round((r.reduce((s, x) => s + x.stars, 0) / r.length) * 10) / 10 : null };
}

export function promoResults(promos: PromoRow[], orders: OrderRow[], reviews: ReviewRow[]): PromoResult[] {
  return promos.map((p) => {
    const start = new Date(p.starts_at).getTime(), end = new Date(p.ends_at).getTime();
    const during = windowOf(orders, reviews, start, end);
    const before = windowOf(orders, reviews, start - (end - start), start);
    const clientsChange = before.clients ? Math.round(((during.clients - before.clients) / before.clients) * 100) : null;
    return { ...p, during, before, clientsChange };
  });
}
