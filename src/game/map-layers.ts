// Couches de la carte : regroupe les lieux existants par catégorie (présentation seule).
export type MapLayer = "vie" | "travail" | "commerces" | "transport" | "politique" | "loisirs" | "evenements";

export const MAP_LAYERS: { id: MapLayer; label: string; emoji: string }[] = [
  { id: "vie", label: "Vie", emoji: "🏠" },
  { id: "travail", label: "Travail", emoji: "💼" },
  { id: "commerces", label: "Commerces", emoji: "🛒" },
  { id: "transport", label: "Transport", emoji: "🚗" },
  { id: "politique", label: "Politique", emoji: "🏛️" },
  { id: "loisirs", label: "Loisirs", emoji: "☕" },
  { id: "evenements", label: "Événements", emoji: "🎉" },
];

const BY_KIND: Record<string, { layer: MapLayer; emoji: string; important?: boolean }> = {
  logement: { layer: "vie", emoji: "🏠", important: true },
  universite: { layer: "vie", emoji: "🎓", important: true },
  banque: { layer: "vie", emoji: "🏦" },
  distributeur: { layer: "vie", emoji: "🏧" },
  entreprise: { layer: "travail", emoji: "💼" },
  administration: { layer: "travail", emoji: "🏢" },
  commerce: { layer: "commerces", emoji: "🏪" },
  magasin: { layer: "commerces", emoji: "🛒", important: true },
  station_service: { layer: "transport", emoji: "⛽" },
  gare: { layer: "transport", emoji: "🚆", important: true },
  station: { layer: "transport", emoji: "🚌" },
  mairie: { layer: "politique", emoji: "🏛️", important: true },
  place: { layer: "politique", emoji: "📢" },
  cafe: { layer: "loisirs", emoji: "☕" },
  parc: { layer: "loisirs", emoji: "🌳" },
};

export const placeLayer = (kind: string) => BY_KIND[kind] ?? { layer: "loisirs" as MapLayer, emoji: "📍", important: false };

/** Un lieu est montré si sa couche est active, ou si c'est la position du joueur (toujours visible). */
export const showPlace = (kind: string, active: ReadonlySet<MapLayer>, isPlayerHere: boolean) => isPlayerHere || active.has(placeLayer(kind).layer);

/** Pictogramme d'un événement existant d'après son titre (présentation seule). */
export function eventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/travaux|chantier/.test(t)) return "🚧";
  if (/manif|grève|greve|rassemblement/.test(t)) return "📢";
  if (/accident|incendie|intervention|panne/.test(t)) return "🚨";
  if (/élection|election|scrutin|vote|campagne/.test(t)) return "🗳️";
  if (/fête|fete|festival|concert|marché|marche/.test(t)) return "🎉";
  return "❗";
}
