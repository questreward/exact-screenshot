// Presentation only: fictional showroom visitors. They never buy: real sales stay with secured dealer RPCs.
export type Visitor = { at: string; name: string; emoji: string; need: string; quote: string; budget: number };

const PROFILES: Omit<Visitor, "at" | "name">[] = [
  { emoji: "👨‍👩‍👧", need: "Famille", quote: "Je cherche une voiture familiale, avec de la place pour les enfants.", budget: 32000 },
  { emoji: "🎓", need: "Première voiture", quote: "C'est ma première voiture, je veux quelque chose de simple.", budget: 15000 },
  { emoji: "💶", need: "Budget limité", quote: "Je n'ai pas un gros budget, qu'est-ce que vous avez de raisonnable ?", budget: 12000 },
  { emoji: "🧰", need: "Véhicule professionnel", quote: "Il me faut un véhicule pour mon travail.", budget: 30000 },
  { emoji: "😎", need: "Voiture plaisir", quote: "Je veux me faire plaisir, montrez-moi votre plus belle voiture.", budget: 60000 },
  { emoji: "🌱", need: "Économies", quote: "Je veux une voiture qui consomme peu.", budget: 25000 },
];
const NAMES = ["Mme Martin", "M. Petit", "Léa", "M. Durand", "Mme Bernard", "Hugo", "Mme Robert", "M. Moreau"];
const TIMES = ["09:30", "10:15", "11:40", "14:10", "15:30", "16:45"];

/** Four visitors of the day, deterministic from the date. */
export function visitorsOf(day: string): Visitor[] {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [0, 1, 2, 3].map(i => ({ ...PROFILES[(h + i * 5) % PROFILES.length]!, name: NAMES[(h + i * 3) % NAMES.length]!, at: TIMES[(h + i) % 3 + i]! }));
}

/** Cars of the stock within the visitor budget (cheapest first), or the cheapest one otherwise. */
export function suggestCars<T extends { price: number; quantity: number }>(stock: T[], budget: number): T[] {
  const ok = stock.filter(c => c.quantity > 0).sort((a, b) => a.price - b.price);
  const fit = ok.filter(c => c.price <= budget);
  return fit.length ? fit : ok.slice(0, 1);
}
