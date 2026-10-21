/** Centre administratif : annuaire des services publics fictifs et recherche de démarches. */
export type PublicService = { id: string; emoji: string; name: string; role: string; to: string; tasks: { label: string; words: string[] }[] };

export const PUBLIC_SERVICES: PublicService[] = [
  { id: "aides", emoji: "👨‍👩‍👧", name: "Caisse des aides", role: "Aides au logement, famille, paiements", to: "/caisse-des-aides", tasks: [{ label: "Demander une aide au logement", words: ["logement", "apl", "loyer", "aide", "caf"] }, { label: "Voir mes paiements d'aides", words: ["paiement", "allocation", "caf"] }] },
  { id: "emploi", emoji: "💼", name: "Espace emploi", role: "Offres, candidatures, actualisation", to: "/espace-emploi", tasks: [{ label: "Chercher un emploi", words: ["emploi", "travail", "chomage", "france travail", "offre"] }, { label: "Postuler à une offre", words: ["candidature", "postuler", "cv"] }] },
  { id: "sante", emoji: "🩺", name: "Espace santé", role: "Remboursements, médecin, carte", to: "/espace-sante", tasks: [{ label: "Suivre mes remboursements", words: ["sante", "remboursement", "ameli", "medecin", "vitale"] }] },
  { id: "impots", emoji: "🧾", name: "Impôts", role: "Déclaration, avis, prélèvements", to: "/impots", tasks: [{ label: "Faire ma déclaration de revenus", words: ["impot", "impots", "declaration", "revenus", "taxe"] }, { label: "Voir mon avis d'impôt", words: ["avis", "prelevement"] }] },
  { id: "retraite", emoji: "👴", name: "Retraite", role: "Trimestres, estimation, départ", to: "/retraite", tasks: [{ label: "Estimer ma retraite", words: ["retraite", "trimestre", "pension"] }] },
  { id: "logement", emoji: "🏠", name: "Logement", role: "Louer, acheter, bail", to: "/logement", tasks: [{ label: "Trouver un logement", words: ["logement", "louer", "appartement", "maison", "bail"] }] },
  { id: "mairie", emoji: "🏛️", name: "Mairie", role: "Ma ville, état civil, décisions", to: "/ma-ville", tasks: [{ label: "Déclarer une naissance, se marier, se pacser", words: ["naissance", "mariage", "pacs", "etat civil", "mairie"] }] },
  { id: "titres", emoji: "🪪", name: "Préfecture et titres", role: "Carte d'identité, passeport, permis", to: "/titres", tasks: [{ label: "Demander une carte d'identité ou un passeport", words: ["identite", "cni", "passeport", "prefecture", "titre"] }, { label: "Passer le permis de conduire", words: ["permis", "conduire"] }] },
  { id: "justice", emoji: "⚖️", name: "Justice", role: "Plaintes, affaires, décisions", to: "/justice", tasks: [{ label: "Porter plainte ou suivre une affaire", words: ["justice", "plainte", "tribunal", "police", "gendarmerie"] }] },
  { id: "entreprises", emoji: "🏢", name: "Entreprises", role: "Créer et gérer son entreprise", to: "/civitas-services", tasks: [{ label: "Créer mon entreprise", words: ["entreprise", "societe", "urssaf", "creer"] }] },
  { id: "documents", emoji: "📁", name: "Mes documents", role: "Tous mes papiers officiels", to: "/mes-documents", tasks: [{ label: "Retrouver un document", words: ["document", "attestation", "papier", "justificatif"] }] },
  { id: "courrier", emoji: "✉️", name: "La Poste", role: "Courriers et recommandés", to: "/la-poste", tasks: [{ label: "Récupérer un courrier", words: ["courrier", "lettre", "poste", "recommande"] }] },
  { id: "demarches", emoji: "📋", name: "Mes démarches", role: "Suivi de toutes mes démarches", to: "/demarches", tasks: [{ label: "Suivre mes démarches en cours", words: ["demarche", "suivi", "dossier"] }] },
  { id: "elections", emoji: "🗳️", name: "Élections", role: "Voter, se présenter, résultats", to: "/elections", tasks: [{ label: "Voter ou me présenter", words: ["vote", "voter", "election", "candidat", "bureau"] }] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function searchServices(q: string) {
  const n = norm(q);
  if (!n) return [];
  return PUBLIC_SERVICES.flatMap((s) => s.tasks.filter((t) => t.words.some((w) => w.includes(n) || n.includes(w)) || norm(t.label).includes(n)).map((t) => ({ label: t.label, service: s.name, to: s.to })));
}
