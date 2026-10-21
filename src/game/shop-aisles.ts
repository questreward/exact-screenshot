// Présentation seulement : rayons visibles dans l'intérieur de chaque magasin (mènent à la Boutique filtrée).
export type Aisle = { label: string; q: string; x: number; y: number };

export const AISLES: Record<string, Aisle[]> = {
  tech: [{ label: "Tablettes", q: "Tablette", x: 14, y: 52 }, { label: "Ordinateurs portables", q: "Ordinateur portable", x: 76, y: 60 }, { label: "Téléviseurs", q: "Téléviseur", x: 86, y: 25 }, { label: "Enceintes", q: "Enceinte", x: 45, y: 40 }],
  mode: [{ label: "Pulls et gilets", q: "Pull", x: 12, y: 55 }, { label: "Robes", q: "Robe", x: 40, y: 50 }, { label: "Vestes et manteaux", q: "Veste", x: 70, y: 32 }, { label: "Pantalons", q: "Pantalon", x: 30, y: 30 }],
  maison: [{ label: "Canapés", q: "Canapé", x: 22, y: 50 }, { label: "Lits", q: "Lit", x: 18, y: 25 }, { label: "Tables", q: "Table", x: 45, y: 38 }, { label: "Armoires et commodes", q: "Armoire", x: 60, y: 22 }],
  electromenager: [{ label: "Réfrigérateurs", q: "Réfrigérateur", x: 8, y: 40 }, { label: "Lave-linge", q: "Lave-linge", x: 47, y: 50 }, { label: "Fours", q: "Four", x: 82, y: 62 }, { label: "Petit électroménager", q: "Bouilloire", x: 85, y: 25 }],
  loisirs: [{ label: "Sport et musculation", q: "Haltère", x: 35, y: 35 }, { label: "Randonnée", q: "Sac de randonnée", x: 55, y: 18 }, { label: "Tapis et yoga", q: "Tapis de sport", x: 15, y: 50 }, { label: "Sacs de sport", q: "Sac de sport", x: 70, y: 40 }],
  auto: [{ label: "Voitures en exposition", q: "", x: 55, y: 45 }, { label: "Bureau des ventes", q: "", x: 22, y: 45 }],
};
