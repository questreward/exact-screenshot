// Rend une opération bancaire lisible : emoji + rubrique, à partir de son libellé existant. Présentation seule.
export type OpKind = { emoji: string; place: string };
const RULES: [RegExp, OpKind][] = [
  [/salaire|paie|shift|journée de travail|mission/i, { emoji: "💶", place: "Salaire" }],
  [/capital de départ|bourse|aide|caf|allocation/i, { emoji: "🎁", place: "Aide / revenu" }],
  [/loyer|logement|bail|agence/i, { emoji: "🏠", place: "Logement" }],
  [/essence|carburant|plein|station/i, { emoji: "⛽", place: "Carburant" }],
  [/manger|repas|courses|restaurant|café|aliment/i, { emoji: "🛒", place: "Alimentation" }],
  [/ticket|abonnement|train|bus|car |transport|amende/i, { emoji: "🚌", place: "Transport" }],
  [/voiture|véhicule|garage|contrôle technique|réparation/i, { emoji: "🚗", place: "Véhicule" }],
  [/meuble|canapé|lit|table|armoire/i, { emoji: "🛋️", place: "Boutique" }],
  [/achat|boutique|magasin|produit/i, { emoji: "🛍️", place: "Boutique" }],
  [/prêt|crédit|échéance|remboursement/i, { emoji: "💳", place: "Crédit" }],
  [/impôt|taxe|prélèvement/i, { emoji: "🧾", place: "Impôts" }],
  [/assurance/i, { emoji: "🛡️", place: "Assurance" }],
  [/virement/i, { emoji: "🔁", place: "Virement" }],
  [/épargne|mettre de côté/i, { emoji: "🐷", place: "Épargne" }],
  [/frais/i, { emoji: "🏦", place: "Banque" }],
];

export function opKind(label: string, amount: number): OpKind {
  for (const [re, k] of RULES) if (re.test(label)) return k;
  return amount >= 0 ? { emoji: "➕", place: "Entrée d'argent" } : { emoji: "➖", place: "Dépense" };
}

/** Retire le suffixe de date technique (« Logement — 2027-09-02 » → « Logement »). */
export const opTitle = (label: string) => label.replace(/\s*—\s*\d{4}-\d{2}(-\d{2})?$/, "").trim() || label;
