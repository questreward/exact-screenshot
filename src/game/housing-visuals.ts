import type { ShopProduct } from "@/services/game";

// Decorative categories only; not actual layouts or equipment.
export function housingIllustrationKind(p: ShopProduct): "studio" | "apartment" | "house" {
  if (/^maison\b/i.test(p.name)) return "house";
  return p.details.rooms === 1 ? "studio" : "apartment";
}
export function filterHousing<T extends ShopProduct>(items: T[], city: string, rooms: string): T[] {
  return items.filter(p => (!city || (p.details.realestate && p.details.city === city)) &&
    (!rooms || (p.details.realestate && p.details.rooms === Number(rooms))));
}
export function housingFacts(p: ShopProduct): { label: string; value: string }[] {
  const d = p.details;
  const facts: { label: string; value: string }[] = [];
  if (d.city) facts.push({ label: "Ville", value: d.city.charAt(0).toUpperCase() + d.city.slice(1) });
  if (d.district) facts.push({ label: "Quartier", value: d.district });
  if (d.surface != null) facts.push({ label: "Surface", value: `${d.surface} m²` });
  if (d.rooms != null) facts.push({ label: "Pièces", value: String(d.rooms) });
  if (d.dpe) facts.push({ label: "DPE", value: d.dpe });
  if (d.charges_monthly != null) facts.push({ label: "Charges mensuelles", value: `${d.charges_monthly.toLocaleString("fr-FR")} €` });
  if (d.tax_yearly != null) facts.push({ label: "Taxe foncière annuelle", value: `${d.tax_yearly.toLocaleString("fr-FR")} €` });
  return facts;
}
