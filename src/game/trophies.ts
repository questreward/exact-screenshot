// Trophées et objectifs : calculés à partir de ce que le joueur a déjà fait.
// Pure présentation — aucune récompense n'est donnée par le téléphone.

export type Facts = {
  activities: number; studies: number; jobs: number; balance: number; business: boolean;
  interactions: number; memberships: number; contacts: number; followers: number;
  newsRead: number; reports: number; consultations: number; articles: number;
  opinions: number; politicalMember: boolean; reputation: number; influence: number;
  votes: number; candidacies: number; legislativeCandidate: boolean;
};

export type Category = "vie" | "social" | "citoyen" | "politique" | "media";
export const CATEGORY_LABEL: Record<Category, string> = { vie: "Vie quotidienne", social: "Vie sociale", citoyen: "Citoyenneté", politique: "Politique", media: "Médias" };

type Def = { id: string; category: Category; title: string; hint: string; to: string; goal: number; value: (f: Facts) => number };

const DEFS: Def[] = [
  { id: "first-steps", category: "vie", title: "Premiers pas", hint: "Faites une première activité dans votre agenda.", to: "/agenda", goal: 1, value: f => f.activities },
  { id: "busy", category: "vie", title: "Agenda bien rempli", hint: "Terminez 25 activités.", to: "/agenda", goal: 25, value: f => f.activities },
  { id: "student", category: "vie", title: "Retour en classe", hint: "Inscrivez-vous à des études.", to: "/vie", goal: 1, value: f => f.studies },
  { id: "worker", category: "vie", title: "Premier emploi", hint: "Décrochez un travail.", to: "/vie", goal: 1, value: f => f.jobs },
  { id: "saver", category: "vie", title: "Bas de laine", hint: "Ayez 1 000 crédits sur votre compte.", to: "/patrimoine", goal: 1000, value: f => f.balance },
  { id: "boss", category: "vie", title: "Chef d'entreprise", hint: "Créez votre entreprise.", to: "/patrimoine", goal: 1, value: f => (f.business ? 1 : 0) },
  { id: "hello", category: "social", title: "Bonjour voisin", hint: "Parlez à 5 habitants.", to: "/carte", goal: 5, value: f => f.interactions },
  { id: "member", category: "social", title: "Esprit d'équipe", hint: "Rejoignez une organisation.", to: "/organisations", goal: 1, value: f => f.memberships },
  { id: "network", category: "social", title: "Carnet d'adresses", hint: "Ayez 3 contacts joueurs.", to: "/reseau", goal: 3, value: f => f.contacts },
  { id: "followed", category: "social", title: "On vous suit", hint: "Obtenez 10 abonnés.", to: "/reseau", goal: 10, value: f => f.followers },
  { id: "reader", category: "citoyen", title: "Bien informé", hint: "Lisez 10 articles d'actualité.", to: "/actualites", goal: 10, value: f => f.newsRead },
  { id: "reporter", category: "citoyen", title: "Œil du quartier", hint: "Faites un signalement dans Ma Ville.", to: "/ma-ville", goal: 1, value: f => f.reports },
  { id: "consulted", category: "citoyen", title: "Ma voix compte", hint: "Participez à 3 consultations.", to: "/ma-ville", goal: 3, value: f => f.consultations },
  { id: "voter", category: "citoyen", title: "A voté", hint: "Votez à une élection.", to: "/elections", goal: 1, value: f => f.votes },
  { id: "opinions", category: "politique", title: "Des idées", hint: "Donnez votre avis sur 5 sujets.", to: "/politique", goal: 5, value: f => f.opinions },
  { id: "activist", category: "politique", title: "Militant", hint: "Adhérez à un parti ou un mouvement.", to: "/politique", goal: 1, value: f => (f.politicalMember ? 1 : 0) },
  { id: "known", category: "politique", title: "Visage connu", hint: "Atteignez 30 de réputation politique.", to: "/politique", goal: 30, value: f => f.reputation },
  { id: "candidate", category: "politique", title: "Candidat", hint: "Présentez-vous à une élection municipale.", to: "/elections", goal: 1, value: f => f.candidacies },
  { id: "deputy-race", category: "politique", title: "En route pour l'Assemblée", hint: "Présentez-vous aux législatives.", to: "/france", goal: 1, value: f => (f.legislativeCandidate ? 1 : 0) },
  { id: "influencer", category: "politique", title: "Faiseur d'opinion", hint: "Atteignez 50 d'influence.", to: "/politique", goal: 50, value: f => f.influence },
  { id: "press", category: "media", title: "Plume", hint: "Publiez un article dans la Presse.", to: "/presse", goal: 1, value: f => f.articles },
  { id: "columnist", category: "media", title: "Chroniqueur", hint: "Publiez 10 articles.", to: "/presse", goal: 10, value: f => f.articles },
];

export type Trophy = { id: string; category: Category; title: string; hint: string; to: string; goal: number; progress: number; done: boolean };

export function computeTrophies(f: Facts): Trophy[] {
  return DEFS.map(d => { const v = Math.max(0, Math.floor(d.value(f))); return { id: d.id, category: d.category, title: d.title, hint: d.hint, to: d.to, goal: d.goal, progress: Math.min(v, d.goal), done: v >= d.goal }; });
}

/** Les 3 prochains objectifs : ceux non obtenus les plus avancés, puis dans l'ordre de la liste. */
export function nextObjectives(t: Trophy[], n = 3): Trophy[] {
  return t.filter(x => !x.done).map((x, i) => ({ x, i })).sort((a, b) => b.x.progress / b.x.goal - a.x.progress / a.x.goal || a.i - b.i).slice(0, n).map(({ x }) => x);
}

export function rankTitle(done: number): string {
  if (done >= 20) return "Figure nationale";
  if (done >= 14) return "Personnalité locale";
  if (done >= 8) return "Citoyen engagé";
  if (done >= 3) return "Habitant actif";
  return "Nouvel arrivant";
}
