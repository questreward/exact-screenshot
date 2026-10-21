// Présentation seulement : vraies positions (longitude, latitude) des lieux du jeu.
// Le jeu (déplacements, présence) reste décidé côté serveur.
export type LonLat = [number, number];

export const CITY_CENTER: Record<string, { at: LonLat; zoom: number }> = {
  paris: { at: [2.345, 48.866], zoom: 12.3 },
  lyon: { at: [4.840, 45.763], zoom: 12.8 },
  marseille: { at: [5.375, 43.299], zoom: 13.3 },
  bordeaux: { at: [-0.570, 44.840], zoom: 12.8 },
  lille: { at: [3.063, 50.634], zoom: 13 },
};

export const FRANCE_VIEW = { at: [2.4, 46.6] as LonLat, zoom: 4.8 };

// Clé : ville puis type de lieu (un seul lieu de chaque type par ville).
export const REAL_PLACES: Record<string, Record<string, { at: LonLat; real: string }>> = {
  paris: {
    mairie: { at: [2.3522, 48.8566], real: "Hôtel de Ville de Paris" },
    place: { at: [2.3470, 48.8579], real: "Place du Châtelet" },
    banque: { at: [2.3400, 48.8650], real: "Quartier de la Banque de France" },
    administration: { at: [2.3466, 48.8545], real: "Île de la Cité" },
    gare: { at: [2.3553, 48.8809], real: "Gare du Nord" },
    station: { at: [2.3470, 48.8620], real: "Châtelet-Les Halles" },
    cafe: { at: [2.3205, 48.8855], real: "Rue des Batignolles" },
    commerce: { at: [2.3175, 48.8870], real: "Marché des Batignolles" },
    logement: { at: [2.3225, 48.8880], real: "Batignolles" },
    parc: { at: [2.3150, 48.8890], real: "Parc Clichy-Batignolles" },
    universite: { at: [2.3431, 48.8486], real: "La Sorbonne" },
    entreprise: { at: [2.3455, 48.8460], real: "Quartier latin" },
  },
  lyon: {
    mairie: { at: [4.8357, 45.7676], real: "Hôtel de Ville de Lyon" },
    place: { at: [4.8320, 45.7578], real: "Place Bellecour" },
    banque: { at: [4.8345, 45.7640], real: "Rue de la République" },
    administration: { at: [4.8335, 45.7615], real: "Presqu'île" },
    gare: { at: [4.8597, 45.7606], real: "Gare de Lyon Part-Dieu" },
    station: { at: [4.8565, 45.7612], real: "Métro Part-Dieu" },
    cafe: { at: [4.8320, 45.7745], real: "Plateau de la Croix-Rousse" },
    commerce: { at: [4.8305, 45.7752], real: "Marché de la Croix-Rousse" },
    logement: { at: [4.8285, 45.7765], real: "Croix-Rousse" },
    parc: { at: [4.8240, 45.7712], real: "Jardin des Chartreux" },
    universite: { at: [4.8370, 45.7500], real: "Quais du Rhône (universités)" },
    entreprise: { at: [4.8395, 45.7488], real: "Guillotière" },
  },
  marseille: {
    mairie: { at: [5.3698, 43.2963], real: "Hôtel de Ville de Marseille" },
    place: { at: [5.3740, 43.2952], real: "Vieux-Port" },
    banque: { at: [5.3765, 43.2972], real: "La Canebière" },
    administration: { at: [5.3722, 43.2978], real: "Quartier du Vieux-Port" },
    gare: { at: [5.3800, 43.3027], real: "Gare Saint-Charles" },
    station: { at: [5.3812, 43.3020], real: "Métro Saint-Charles" },
    cafe: { at: [5.3680, 43.2990], real: "Le Panier" },
    commerce: { at: [5.3668, 43.2996], real: "Rues du Panier" },
    logement: { at: [5.3658, 43.3003], real: "Le Panier" },
    parc: { at: [5.3672, 43.2982], real: "Abords de la Vieille Charité" },
    universite: { at: [5.3830, 43.3055], real: "Campus Saint-Charles" },
    entreprise: { at: [5.3852, 43.3062], real: "Belle de Mai" },
  },
  bordeaux: {
    mairie: { at: [-0.5785, 44.8378], real: "Palais Rohan (mairie)" },
    place: { at: [-0.5703, 44.8413], real: "Place de la Bourse" },
    banque: { at: [-0.5750, 44.8400], real: "Cours de l'Intendance" },
    administration: { at: [-0.5770, 44.8388], real: "Centre historique" },
    gare: { at: [-0.5563, 44.8259], real: "Gare Saint-Jean" },
    station: { at: [-0.5572, 44.8266], real: "Tram Gare Saint-Jean" },
    cafe: { at: [-0.5700, 44.8540], real: "Chartrons" },
    commerce: { at: [-0.5680, 44.8546], real: "Marché des Chartrons" },
    logement: { at: [-0.5722, 44.8552], real: "Chartrons" },
    parc: { at: [-0.5770, 44.8490], real: "Jardin public" },
    universite: { at: [-0.5720, 44.8310], real: "Place de la Victoire" },
    entreprise: { at: [-0.5738, 44.8300], real: "Quartier de la Victoire" },
  },
  lille: {
    mairie: { at: [3.0700, 50.6310], real: "Hôtel de Ville de Lille" },
    place: { at: [3.0633, 50.6370], real: "Grand'Place" },
    banque: { at: [3.0620, 50.6382], real: "Vieux-Lille" },
    administration: { at: [3.0645, 50.6392], real: "Vieux-Lille" },
    gare: { at: [3.0703, 50.6365], real: "Gare Lille-Flandres" },
    station: { at: [3.0712, 50.6372], real: "Métro Gare Lille-Flandres" },
    cafe: { at: [3.0480, 50.6330], real: "Vauban" },
    commerce: { at: [3.0468, 50.6320], real: "Vauban" },
    logement: { at: [3.0458, 50.6340], real: "Vauban" },
    parc: { at: [3.0440, 50.6410], real: "Citadelle de Lille" },
    universite: { at: [3.0700, 50.6200], real: "Faculté (Moulins)" },
    entreprise: { at: [3.0722, 50.6190], real: "Moulins" },
  },
};

export function realPlace(cityId: string, kind: string) {
  return REAL_PLACES[cityId]?.[kind] ?? null;
}

// Centre d'un quartier = moyenne de ses lieux réels connus.
export function districtCenter(cityId: string, kinds: string[]): LonLat | null {
  const pts = kinds.map((k) => realPlace(cityId, k)?.at).filter((p): p is LonLat => !!p);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
