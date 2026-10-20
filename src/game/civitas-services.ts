// Presentation-only catalogue: orients players toward existing pages, no rules or prices.
export type CivitasService = { id: string; path: string; label: string; real: string; keywords: string[] };
export type ServiceGroup = { id: string; label: string; services: CivitasService[] };

export const CIVITAS_SERVICE_GROUPS: ServiceGroup[] = [
  { id: "loger", label: "Se loger", services: [
    { id: "logement", path: "/logement", label: "Logement", real: "Trouver une location, signer un bail, emménager.", keywords: ["louer", "location", "bail", "appartement", "maison", "demenager"] },
    { id: "chez-moi", path: "/chez-moi", label: "Chez moi", real: "Aménager les pièces de son logement avec ses meubles.", keywords: ["meuble", "amenager", "decorer", "piece"] },
    { id: "agence", path: "/agence", label: "Agence immobilière", real: "Louer chez un particulier, confier ou acheter un bien.", keywords: ["agence", "immobilier", "acheter", "louer", "mandat"] },
    { id: "construction", path: "/construction", label: "Construction", real: "Rénover ou agrandir un logement.", keywords: ["travaux", "renover", "agrandir", "artisan"] },
    { id: "boutique", path: "/boutique", label: "Acheter un bien", real: "Visiter et acheter un logement (rubrique Immobilier).", keywords: ["acheter", "maison", "appartement", "credit", "immobilier"] },
  ] },
  { id: "travailler", label: "Travailler", services: [
    { id: "carriere", path: "/carriere", label: "Ma carrière", real: "Entretiens, promotions, chômage et salaire.", keywords: ["emploi", "travail", "salaire", "chomage", "entretien"] },
    { id: "recrutement", path: "/recrutement", label: "Recrutement", real: "Trouver un emploi ou des candidats avec une agence.", keywords: ["emploi", "embauche", "candidat", "agence", "travail"] },
    { id: "vie", path: "/vie", label: "Études et travail", real: "S'inscrire en études, travailler au quotidien.", keywords: ["etudes", "ecole", "travail", "formation"] },
    { id: "mon-parcours", path: "/mon-parcours", label: "Mon parcours", real: "Ton CV : études, emplois, engagements.", keywords: ["cv", "parcours", "diplome"] },
  ] },
  { id: "demarches", label: "Démarches et aides", services: [
    { id: "demarches", path: "/demarches", label: "Mes démarches", real: "Déclarations, aides et impôts simulés.", keywords: ["impots", "caf", "aide", "declaration", "administration"] },
    { id: "vie-administrative", path: "/vie-administrative", label: "Vie administrative", real: "Apprendre les démarches en missions.", keywords: ["apprendre", "caf", "impots", "mission", "papiers"] },
    { id: "mes-documents", path: "/mes-documents", label: "Mes documents", real: "Coffre-fort : contrats, quittances, formulaires.", keywords: ["papiers", "contrat", "quittance", "document"] },
  ] },
  { id: "argent", label: "Argent et protection", services: [
    { id: "patrimoine", path: "/patrimoine", label: "Patrimoine", real: "Épargne, biens et projets de vie.", keywords: ["argent", "epargne", "banque", "biens"] },
    { id: "assurances", path: "/assurances", label: "Assurances", real: "Choisir une assurance ou gérer sa compagnie.", keywords: ["assurer", "assurance", "protection", "sinistre"] },
    { id: "concession", path: "/concession", label: "Concessionnaire", real: "Voitures neuves, reprises et occasions.", keywords: ["voiture", "auto", "acheter", "occasion"] },
  ] },
  { id: "droits", label: "Santé, justice, droits", services: [
    { id: "sante", path: "/sante", label: "Santé", real: "Moral, sport et médecin.", keywords: ["medecin", "malade", "sport", "moral"] },
    { id: "justice", path: "/justice", label: "Justice", real: "Porter plainte, se défendre, jugements.", keywords: ["plainte", "avocat", "tribunal", "droit"] },
    { id: "syndicats", path: "/syndicats", label: "Syndicats", real: "Se syndiquer, revendiquer, faire grève.", keywords: ["greve", "syndicat", "droits", "travail"] },
  ] },
  { id: "entreprises", label: "Entreprises de services", services: [
    { id: "services", path: "/services", label: "Garages et déménageurs", real: "Réparer sa voiture, déménager.", keywords: ["garage", "reparer", "demenager", "voiture", "entreprise"] },
  ] },
];

export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function searchServices(query: string): ServiceGroup[] {
  const q = normalize(query);
  if (!q) return CIVITAS_SERVICE_GROUPS;
  const words = q.split(/\s+/);
  return CIVITAS_SERVICE_GROUPS
    .map(g => ({ ...g, services: g.services.filter(s => {
      const hay = normalize([s.label, s.real, g.label, ...s.keywords].join(" "));
      return words.every(w => hay.includes(w));
    }) }))
    .filter(g => g.services.length > 0);
}
