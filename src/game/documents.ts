// Aides d'affichage du coffre-fort « Mes documents ». Le serveur reste seul juge (validation, contenu des documents).
import type { FormField, VaultDoc } from "@/services/game";

export const DOC_CATEGORIES: [string, string, string][] = [
  ["identite", "Identité", "🪪"], ["logement", "Logement", "🏠"], ["travail", "Travail", "💼"], ["impots", "Impôts", "🧾"],
  ["caf", "CAF", "🤝"], ["banque", "Banque", "🏦"], ["assurance", "Assurance", "🛡️"], ["sante", "Santé", "🩺"], ["citoyen", "Vie citoyenne", "🏛️"],
];
export const categoryLabel = (c: string) => DOC_CATEGORIES.find(x => x[0] === c)?.[1] ?? c;

export const STATUS_LABELS: Record<string, string> = {
  valide: "Valide", expire: "Expiré", perime: "Périmé", remplace: "Remplacé", en_cours: "En cours", termine: "Terminé",
  regle: "Réglé", a_payer: "À régler", saisi: "Saisi", suspendu: "Suspendu", resilie: "Résilié", acceptee: "Acceptée",
  refusee: "Refusée", envoyee: "Envoyée", a_faire: "À faire", a_completer: "À compléter", terminee: "Terminée",
  validated: "Validée", completed: "Terminée", submitted: "Déposée",
};

/** Document expirant dans les `days` prochains jours (et pas encore expiré). */
export function expiresSoon(doc: VaultDoc, now: Date, days = 30): boolean {
  if (!doc.expires_at || doc.status === "expire" || doc.status === "perime") return false;
  const t = new Date(doc.expires_at).getTime();
  return t >= now.getTime() && t - now.getTime() <= days * 86_400_000;
}

export function unseen(docs: VaultDoc[], seen: string[]): VaultDoc[] {
  const s = new Set(seen);
  return docs.filter(d => !s.has(d.key));
}

/** Part des champs à remplir (hors champs pré-remplis par le serveur) déjà complétés. */
export function formProgress(fields: FormField[], data: Record<string, unknown>): number {
  const own = fields.filter(f => !f.prefill);
  if (own.length === 0) return 100;
  const done = own.filter(f => { const v = data[f.key]; return f.type === "checkbox" ? v === true : v !== undefined && v !== null && v !== ""; }).length;
  return Math.round((done / own.length) * 100);
}

/** Champs obligatoires encore manquants (vérification avant envoi ; le serveur revérifie). */
export function missingRequired(fields: FormField[], data: Record<string, unknown>): string[] {
  return fields.filter(f => f.required && !f.prefill).filter(f => {
    const v = data[f.key];
    return f.type === "checkbox" ? v !== true : v === undefined || v === null || v === "";
  }).map(f => f.label);
}

const FIRSTS: Record<string, string> = {
  carte: "Première carte CIVITAS", contrat: "Premier contrat de travail", paie: "Première fiche de paie", bail: "Premier logement",
  quittance: "Première quittance de loyer", avis: "Première déclaration fiscale", decision: "Première demande d'aide",
  echeancier: "Premier crédit", assurance: "Première assurance", mandat: "Premier mandat", candidature: "Première candidature",
  consultation: "Première consultation médicale", formulaire: "Premier formulaire validé",
};

/** Historique administratif : la première fois de chaque type de document, puis les changements d'emploi. */
export function adminTimeline(docs: VaultDoc[]): { at: string; title: string }[] {
  const sorted = docs.filter(d => d.at).slice().sort((a, b) => a.at!.localeCompare(b.at!));
  const seenKinds = new Set<string>();
  const out: { at: string; title: string }[] = [];
  for (const d of sorted) {
    if (!seenKinds.has(d.kind)) { seenKinds.add(d.kind); const f = FIRSTS[d.kind]; if (f) out.push({ at: d.at!, title: f }); }
    else if (d.kind === "contrat") out.push({ at: d.at!, title: "Changement d'emploi" });
  }
  return out;
}

export const euro = (n: unknown) => `${Number(n ?? 0).toLocaleString("fr-FR")} €`;
