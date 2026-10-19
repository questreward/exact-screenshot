// Libellés et aides d'affichage pour « Ma vie dans CIVITAS ». Les valeurs sont calculées par le serveur (life_profile).

export const REPUTATION_LABELS: Record<string, { label: string; hint: string }> = {
  citoyenne: { label: "Réputation citoyenne", hint: "Associations, projets, entraide." },
  politique: { label: "Réputation politique", hint: "Candidatures, mandats, débats." },
  popularite: { label: "Popularité", hint: "Abonnés, victoires, mobilisations." },
  credibilite: { label: "Crédibilité", hint: "Projets réussis, pétitions adoptées. Baisse avec les condamnations et échecs." },
  fiabilite: { label: "Fiabilité", hint: "Travail régulier, engagements tenus. Baisse avec les forfaits et amendes impayées." },
  professionnelle: { label: "Réputation professionnelle", hint: "Emploi, ancienneté, entreprises." },
  influence: { label: "Influence", hint: "Poids social et politique, organisations fondées." },
  numerique: { label: "Réputation numérique", hint: "Abonnés sur Civi, articles publiés." },
};

export const SKILL_LABELS: Record<string, string> = {
  gestion: "Gestion", economie: "Économie", communication: "Communication", negociation: "Négociation",
  prise_de_parole: "Prise de parole", administration: "Administration", politique: "Politique", droit: "Droit",
  organisation: "Organisation", gestion_crise: "Gestion de crise", analyse: "Analyse", entrepreneuriat: "Entrepreneuriat",
};

export const SOURCE_LABELS: Record<string, string> = {
  memberships: "Adhésions", org_events: "Activités d'organisation", orgs_founded: "Organisations fondées", parties_founded: "Partis ou mouvements fondés",
  project_supports: "Projets soutenus", project_donations: "Dons à des projets", projects_authored: "Projets proposés", projects_done: "Projets réalisés",
  projects_failed: "Projets refusés ou échoués", petitions_authored: "Pétitions lancées", petitions_won: "Pétitions adoptées", petition_signatures: "Pétitions signées",
  crisis_help: "Aide pendant une crise", crises_managed: "Crises gérées comme maire", debates_done: "Débats menés", debates_won: "Débats gagnés",
  debates_forfeit: "Débats abandonnés", candidacies: "Candidatures", mandates: "Mandats", followers: "Abonnés", press_articles: "Articles publiés",
  justice_cases: "Procès", justice_guilty: "Condamnations", fines_unpaid: "Amendes impayées", businesses: "Entreprises", business_failed: "Entreprises en faillite",
  work_days: "Journées de travail", study_days: "Cours suivis", employed: "Emploi actuel", unions: "Syndicats", couples: "Vie de couple",
  protests_organized: "Manifestations organisées", protests_success: "Manifestations réussies", social_reputation: "Réputation sociale",
  social_influence: "Influence sociale", political_reputation: "Réputation politique", political_influence: "Influence politique",
};

export const JOURNAL_KINDS: Record<string, string> = {
  naissance: "Début", etudes: "Études", travail: "Travail", engagement: "Engagement", famille: "Famille",
  politique: "Politique", debat: "Débat", citoyen: "Citoyenneté", justice: "Justice", media: "Médias",
};

/** Niveau lisible d'une valeur 0–100. */
export function levelLabel(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  if (v >= 80) return "Excellent";
  if (v >= 60) return "Bon";
  if (v >= 40) return "Moyen";
  if (v >= 20) return "Faible";
  return "Débutant";
}

/** Regroupe le journal par âge, du plus récent au plus ancien. */
export function groupByAge<T extends { age: number }>(entries: T[]): { age: number; items: T[] }[] {
  const out: { age: number; items: T[] }[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.age === e.age) last.items.push(e);
    else out.push({ age: e.age, items: [e] });
  }
  return out;
}
