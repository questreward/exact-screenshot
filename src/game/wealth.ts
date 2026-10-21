// Patrimoine par rubrique, à partir des vraies données (biens possédés, épargne, solde, prêt). Présentation seule.
type Asset = { purchase_price: number; catalog: { category: string } };
export type Wealth = { home: number; vehicles: number; goods: number; saved: number; cash: number; debt: number; total: number };

/** Répartit la valeur des biens calculée par le serveur au prorata des prix d'achat de chaque rubrique. */
export function wealthBreakdown(i: { assets: Asset[]; assetValue: number; saved: number; cash: number; debt: number }): Wealth {
  const sum = (c: string) => i.assets.filter(a => a.catalog.category === c).reduce((s, a) => s + a.purchase_price, 0);
  const raw = { home: sum("logement"), vehicles: sum("transport"), goods: i.assets.filter(a => !["logement", "transport"].includes(a.catalog.category)).reduce((s, a) => s + a.purchase_price, 0) };
  const all = raw.home + raw.vehicles + raw.goods;
  const k = all > 0 ? i.assetValue / all : 0;
  const home = Math.round(raw.home * k), vehicles = Math.round(raw.vehicles * k), goods = i.assetValue - home - vehicles;
  return { home, vehicles, goods, saved: i.saved, cash: i.cash, debt: i.debt, total: i.assetValue + i.saved + i.cash - i.debt };
}
