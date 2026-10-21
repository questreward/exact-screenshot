// Recherche universelle du téléphone : mots du joueur → pages qui existent déjà (aucune donnée inventée).
export type SearchHit = { label: string; emoji: string; to: string; hint: string };

const ENTRIES: (SearchHit & { words: string[] })[] = [
  { label: "Permis de conduire", emoji: "🚗", to: "/permis", hint: "Code, examen, permis", words: ["permis", "code", "examen", "auto-ecole"] },
  { label: "Ma voiture", emoji: "🚙", to: "/conduite", hint: "Conduire, essence, entretien", words: ["voiture", "vehicule", "conduire", "essence", "garage", "panne", "controle technique", "permis"] },
  { label: "Mes documents", emoji: "📁", to: "/mes-documents", hint: "Contrats, quittances, papiers", words: ["document", "papier", "contrat", "quittance", "attestation", "permis", "carte d'identite", "passeport"] },
  { label: "Titres d'identité", emoji: "🪪", to: "/titres", hint: "Carte d'identité, passeport", words: ["identite", "cni", "passeport", "titre"] },
  { label: "Chez moi", emoji: "🏠", to: "/chez-moi", hint: "Mon logement, mes meubles", words: ["maison", "logement", "chez moi", "appartement", "meuble"] },
  { label: "Trouver un logement", emoji: "🔑", to: "/logement", hint: "Louer, acheter, déménager", words: ["maison", "logement", "louer", "loyer", "acheter", "appartement", "demenager"] },
  { label: "Banque", emoji: "💶", to: "/banque", hint: "Compte, virements, prêts", words: ["banque", "argent", "salaire", "compte", "virement", "pret", "credit", "epargne"] },
  { label: "Mon travail", emoji: "💼", to: "/carriere", hint: "Métier, salaire, journée", words: ["travail", "salaire", "metier", "job", "boulot", "carriere"] },
  { label: "Trouver un emploi", emoji: "🔎", to: "/espace-emploi", hint: "Offres et candidatures", words: ["emploi", "offre", "chomage", "candidature", "travail", "france travail"] },
  { label: "Impôts", emoji: "🧾", to: "/impots", hint: "Déclaration, prélèvement", words: ["impot", "taxe", "declaration", "salaire"] },
  { label: "Boutique", emoji: "🛒", to: "/boutique", hint: "Faire ses courses", words: ["acheter", "boutique", "magasin", "courses", "shopping", "commande"] },
  { label: "Transports", emoji: "🚌", to: "/transports", hint: "Bus, train, abonnement", words: ["bus", "train", "transport", "ticket", "abonnement", "gare", "car"] },
  { label: "Carte", emoji: "🗺️", to: "/carte", hint: "Où veux-tu aller ?", words: ["carte", "aller", "ou", "lieu", "adresse", "plan", "maps"] },
  { label: "Agenda", emoji: "📅", to: "/agenda", hint: "Ma journée, mes rendez-vous", words: ["agenda", "rendez-vous", "journee", "planning", "heure"] },
  { label: "Santé", emoji: "🩺", to: "/sante", hint: "Médecin, ameli", words: ["sante", "medecin", "malade", "ameli", "hopital", "docteur"] },
  { label: "Études", emoji: "🎓", to: "/etudes", hint: "Cours, examens, bourse", words: ["etude", "ecole", "universite", "cours", "bourse", "diplome", "examen"] },
  { label: "Ma Ville", emoji: "🏛️", to: "/ma-ville", hint: "Mairie, projets, signalements", words: ["mairie", "ville", "maire", "signalement", "quartier"] },
  { label: "Élections", emoji: "🗳️", to: "/elections", hint: "Voter, se présenter", words: ["election", "vote", "voter", "candidat", "scrutin", "campagne"] },
  { label: "Politique", emoji: "🎤", to: "/politique", hint: "Partis et mouvements", words: ["politique", "parti", "mouvement", "depute"] },
  { label: "La Poste", emoji: "📮", to: "/la-poste", hint: "Courriers et colis", words: ["poste", "courrier", "colis", "lettre", "recommande"] },
  { label: "Assurances", emoji: "🛡️", to: "/assurances", hint: "Voiture, logement", words: ["assurance", "sinistre", "voiture", "logement"] },
  { label: "Secours", emoji: "🚒", to: "/secours", hint: "Pompiers, police, SAMU", words: ["pompier", "police", "samu", "gendarme", "secours", "intervention"] },
  { label: "Actualités", emoji: "📰", to: "/actualites", hint: "Les nouvelles", words: ["actualite", "news", "journal", "info"] },
  { label: "Famille", emoji: "👨‍👩‍👧", to: "/famille", hint: "Couple, enfants", words: ["famille", "couple", "mariage", "enfant", "pacs"] },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function phoneSearch(query: string, max = 6): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored = ENTRIES.map(e => {
    const label = norm(e.label);
    const score = label.startsWith(q) ? 3 : e.words.some(w => w.startsWith(q) || q.startsWith(w)) ? 2 : label.includes(q) || e.words.some(w => w.includes(q)) ? 1 : 0;
    return { e, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(({ e }) => ({ label: e.label, emoji: e.emoji, to: e.to, hint: e.hint }));
}
