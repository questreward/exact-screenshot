// Presentation only: favourites / recent places kept on this device, and an indicative crowd level.
export type SavedPlace = { id: string; name: string; districtId: string; cityId: string };
const FAV = "civitas-fav-places", REC = "civitas-recent-places";
const read = (k: string): SavedPlace[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
export const favorites = () => read(FAV);
export const recents = () => read(REC);
export function toggleFavorite(p: SavedPlace) {
  const list = favorites(); const has = list.some((x) => x.id === p.id);
  const next = has ? list.filter((x) => x.id !== p.id) : [p, ...list].slice(0, favoriteLimit());
  localStorage.setItem(FAV, JSON.stringify(next)); return !has;
}
export function pushRecent(p: SavedPlace) {
  localStorage.setItem(REC, JSON.stringify([p, ...recents().filter((x) => x.id !== p.id)].slice(0, 6)));
}
/** Indicative crowd by kind and hour (no stored data). */
export function crowdLevel(kind: string, hour: number, open: boolean | undefined) {
  if (open === false) return { emoji: "⚫", label: "Fermé, personne" };
  const peaks: Record<string, number[]> = { magasin: [12, 17, 18], restaurant: [12, 13, 19, 20], bar: [19, 20, 21, 22], gare: [7, 8, 17, 18], parc: [14, 15, 16], mairie: [10, 11, 14] };
  const p = peaks[kind] ?? [11, 12, 17];
  if (p.includes(hour)) return { emoji: "🔴", label: "Très fréquenté en ce moment" };
  if (p.some((h) => Math.abs(h - hour) === 1)) return { emoji: "🟠", label: "Assez fréquenté" };
  return hour < 7 || hour > 22 ? { emoji: "🟢", label: "Très calme" } : { emoji: "🟢", label: "Calme" };
}
/** VIP : 24 favoris au lieu de 12 (confort seulement, mémorisé sur cet appareil après lecture du statut VIP). */
export const VIP_FLAG = "civitas-vip-perks";
export function favoriteLimit() { try { return localStorage.getItem(VIP_FLAG) === "1" ? 24 : 12; } catch { return 12; } }
