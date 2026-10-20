// Affichage seulement : les règles (âge, concours, horaires, paie, résultats) sont appliquées par la base.
export type SecurityServiceId = "police" | "pompier_pro" | "pompier_vol" | "protection_civile";

export const TEAMS: Record<SecurityServiceId, { id: string; label: string; hours: string }[]> = {
  police: [
    { id: "matin", label: "Brigade du matin", hours: "5h – 13h" },
    { id: "apres_midi", label: "Brigade d'après-midi", hours: "13h – 21h" },
    { id: "nuit", label: "Brigade de nuit", hours: "21h – 5h" },
  ],
  pompier_pro: [
    { id: "garde12", label: "Garde de 12 h", hours: "7h – 19h, puis 24 h de repos" },
    { id: "garde24", label: "Garde de 24 h", hours: "7h – 7h, puis 48 h de repos" },
  ],
  pompier_vol: [{ id: "disponible", label: "Disponibilités", hours: "Soirs après 18h, nuits et week-ends (4 h)" }],
  protection_civile: [{ id: "libre", label: "Créneaux libres", hours: "Quand tu veux (4 h)" }],
};

export const SERVICE_INTRO: Record<SecurityServiceId, string> = {
  police: "Concours de gardien de la paix, école de police de 4 semaines, cycle de 4 jours de travail puis 2 jours de repos.",
  pompier_pro: "Concours avec épreuve sportive, 2 semaines de formation, gardes de 12 h ou 24 h.",
  pompier_vol: "Sans concours, dès 16 ans, 3 jours de formation. Compatible avec tes études ou ton travail. Payé à l'heure.",
  protection_civile: "Bénévole, dès 16 ans, une journée de formation aux premiers secours. Pas de salaire, mais de l'engagement citoyen.",
};

export const OUTCOME_LABELS: Record<string, string> = {
  reussite: "Mission réussie",
  felicitations: "Félicitations de la hiérarchie",
  blessure: "Blessé : arrêt de quelques jours",
  plainte: "Une plainte a été déposée",
  echec: "Mission difficile, sans conséquence grave",
  equipe: "Mission gérée par l'équipe",
};

/** Traitement hebdomadaire affiché, même formule que la base : mensuel × 12 / 52, arrondi. */
export const weeklyPay = (monthly: number) => Math.round((monthly * 12) / 52);

/** Prochain grade : titre et missions réussies restantes, ou null au grade maximal. */
export function nextRank(titles: string[], needed: number[], rank: number, missionsOk: number) {
  if (rank + 1 >= titles.length) return null;
  return { title: titles[rank + 1], remaining: Math.max(0, needed[rank + 1] - missionsOk) };
}
