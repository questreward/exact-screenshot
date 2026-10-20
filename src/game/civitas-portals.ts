// Presentation-only portals: fictional names, link to existing screens, no new rules.
export type PortalLink = { path: string; label: string };
export type Portal = { id: string; name: string; real: string; about: string; inGame: string[]; links: PortalLink[]; keywords: string[] };

export const PORTALS: Portal[] = [
  { id: "aides", name: "Caisse des aides", real: "CAF", about: "Dans la vraie vie, la CAF verse des aides au logement, des aides familiales et le RSA selon tes revenus.",
    inGame: ["Déclarer un changement de situation", "Comprendre les aides au logement en missions"],
    links: [{ path: "/caisse-des-aides", label: "Ouvrir Mon Compte allocataire" }, { path: "/demarches", label: "Mes démarches" }, { path: "/vie-administrative", label: "Apprendre les aides" }, { path: "/logement", label: "Mon logement" }, { path: "/famille", label: "Ma famille" }],
    keywords: ["caf", "aide", "apl", "rsa", "logement", "famille", "allocation"] },
  { id: "impots", name: "Espace impôts", real: "impots.gouv", about: "Dans la vraie vie, on déclare ses revenus chaque printemps et on reçoit un avis d'impôt.",
    inGame: ["Déclaration et avis simulés", "Retrouver ses avis dans le coffre-fort"],
    links: [{ path: "/demarches", label: "Déclarer mes revenus" }, { path: "/mes-documents", label: "Mes avis et documents" }, { path: "/vie-administrative", label: "Comprendre les impôts" }],
    keywords: ["impot", "impots", "declaration", "revenus", "taxe", "avis"] },
  { id: "emploi", name: "Emploi CIVITAS", real: "France Travail", about: "Dans la vraie vie, France Travail aide à chercher un emploi et verse l'allocation chômage.",
    inGame: ["Postuler et passer des entretiens", "Trouver un emploi via une agence de recrutement", "Suivre son chômage et son salaire"],
    links: [{ path: "/espace-emploi", label: "Ouvrir mon espace candidat" }, { path: "/carriere", label: "Ma carrière" }, { path: "/recrutement", label: "Agences de recrutement" }, { path: "/mon-parcours", label: "Mon CV" }],
    keywords: ["emploi", "chomage", "travail", "france travail", "pole emploi", "cv", "entretien"] },
  { id: "sante", name: "Santé CIVITAS", real: "Ameli", about: "Dans la vraie vie, l'Assurance maladie rembourse une partie des soins ; une mutuelle complète.",
    inGame: ["Voir le médecin, suivre son moral et sa forme", "Choisir une assurance"],
    links: [{ path: "/espace-sante", label: "Ouvrir mon compte assuré" }, { path: "/sante", label: "Ma santé" }, { path: "/assurances", label: "Assurances" }],
    keywords: ["sante", "ameli", "medecin", "mutuelle", "maladie", "soins"] },
  { id: "titres", name: "Titres et papiers", real: "ANTS / préfecture", about: "Dans la vraie vie, on demande sa carte d'identité, son passeport ou son permis en ligne.",
    inGame: ["Carte d'identité fictive avec photo", "Coffre-fort de documents"],
    links: [{ path: "/mon-profil", label: "Ma carte d'identité" }, { path: "/mes-documents", label: "Mes documents" }],
    keywords: ["ants", "prefecture", "carte", "identite", "papiers", "passeport", "permis"] },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const portalById = (id: string) => PORTALS.find(p => p.id === id);
export function searchPortals(q: string): Portal[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return PORTALS;
  return PORTALS.filter(p => { const hay = norm([p.name, p.real, p.about, ...p.keywords].join(" ")); return words.every(w => hay.includes(w)); });
}
