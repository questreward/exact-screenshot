// Présentation seulement : vraies positions (longitude, latitude) des lieux du jeu.
// Le jeu (déplacements, présence) reste décidé côté serveur.
export type LonLat = [number, number];
import { BANK_BRANCHES } from './bank-branches';

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

// Magasins (0120) : le nom du lieu donne le rayon de la Boutique et la rue commerçante réelle.
export const SHOP_SECTION: Record<string, string> = {
  "Magasin high-tech": "tech", "Boutique de vêtements": "mode", "Magasin de meubles et déco": "maison",
  "Magasin d'électroménager": "electromenager", "Magasin de sport et loisirs": "loisirs", "Concession automobile": "auto",
};

export const REAL_SHOPS: Record<string, Record<string, { at: LonLat; real: string }>> = {
  paris: { tech: { at: [2.3412, 48.8718], real: "Boulevard Haussmann" }, mode: { at: [2.3330, 48.8737], real: "Quartier des grands magasins" }, maison: { at: [2.3555, 48.8570], real: "Rue de Rivoli" }, electromenager: { at: [2.3790, 48.8590], real: "Bastille" }, loisirs: { at: [2.3482, 48.8625], real: "Les Halles" }, auto: { at: [2.2950, 48.8738], real: "Avenue de la Grande-Armée" } },
  lyon: { tech: { at: [4.8560, 45.7610], real: "Part-Dieu" }, mode: { at: [4.8355, 45.7605], real: "Rue de la République" }, maison: { at: [4.8330, 45.7560], real: "Rue Victor-Hugo" }, electromenager: { at: [4.8580, 45.7600], real: "Part-Dieu" }, loisirs: { at: [4.8345, 45.7630], real: "Presqu'île" }, auto: { at: [4.8700, 45.7480], real: "Avenue Berthelot" } },
  marseille: { tech: { at: [5.3790, 43.2960], real: "Centre Bourse" }, mode: { at: [5.3775, 43.2945], real: "Rue Saint-Ferréol" }, maison: { at: [5.3800, 43.2940], real: "Rue de Rome" }, electromenager: { at: [5.3815, 43.2965], real: "Belsunce" }, loisirs: { at: [5.3760, 43.2985], real: "La Canebière" }, auto: { at: [5.3950, 43.2900], real: "Boulevard Baille" } },
  bordeaux: { tech: { at: [-0.5735, 44.8395], real: "Rue Sainte-Catherine" }, mode: { at: [-0.5730, 44.8380], real: "Rue Sainte-Catherine" }, maison: { at: [-0.5720, 44.8360], real: "Cours Victor-Hugo" }, electromenager: { at: [-0.5850, 44.8380], real: "Mériadeck" }, loisirs: { at: [-0.5710, 44.8410], real: "Porte Dijeaux" }, auto: { at: [-0.5550, 44.8600], real: "Bassins à flot" } },
  lille: { tech: { at: [3.0750, 50.6365], real: "Euralille" }, mode: { at: [3.0630, 50.6355], real: "Rue Neuve" }, maison: { at: [3.0600, 50.6345], real: "Rue Nationale" }, electromenager: { at: [3.0760, 50.6375], real: "Euralille" }, loisirs: { at: [3.0640, 50.6340], real: "Rue de Béthune" }, auto: { at: [3.0900, 50.6250], real: "Fives" } },
};

// Stations-service (0125) : vraies grandes avenues de chaque ville.
export const REAL_STATIONS: Record<string, Record<string, { at: LonLat; real: string }>> = {
  paris: { "Station-service du centre": { at: [2.3590, 48.8640], real: "Boulevard de Sébastopol" }, "Station-service de la rocade": { at: [2.3900, 48.8330], real: "Quai de Bercy" } },
  lyon: { "Station-service du centre": { at: [4.8420, 45.7520], real: "Avenue Berthelot" }, "Station-service de la rocade": { at: [4.8700, 45.7650], real: "Boulevard des Belges" } },
  marseille: { "Station-service du centre": { at: [5.3880, 43.2900], real: "Boulevard Baille" }, "Station-service de la rocade": { at: [5.3950, 43.3050], real: "Boulevard National" } },
  bordeaux: { "Station-service du centre": { at: [-0.5800, 44.8300], real: "Cours de la Marne" }, "Station-service de la rocade": { at: [-0.5600, 44.8550], real: "Quai de Bacalan" } },
  lille: { "Station-service du centre": { at: [3.0700, 50.6280], real: "Boulevard de la Liberté" }, "Station-service de la rocade": { at: [3.0850, 50.6400], real: "Avenue Willy-Brandt" } },
};

export function realPlace(cityId: string, kind: string, name?: string) {
  const bank = BANK_BRANCHES[cityId];
  if (bank && (name === bank.name || name === `Distributeur CIVITAS · ${bank.name}`)) return { at: bank.at, real: bank.address };
  if (kind === "station_service") return name ? REAL_STATIONS[cityId]?.[name] ?? null : null;
  if (kind === "magasin") { const sec = name ? SHOP_SECTION[name] : undefined; return sec ? REAL_SHOPS[cityId]?.[sec] ?? null : null; }
  return REAL_PLACES[cityId]?.[kind] ?? null;
}

// Centre d'un quartier = moyenne de ses lieux réels connus.
export function districtCenter(cityId: string, kinds: string[]): LonLat | null {
  const pts = kinds.map((k) => realPlace(cityId, k)?.at).filter((p): p is LonLat => !!p);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
