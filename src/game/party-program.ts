// Presentation only: sorts an organization's own priorities and values into readable themes. Nothing is invented.
export const PROGRAM_THEMES = [
  { id: "economie", emoji: "💶", label: "Économie et emploi", test: /économ|emploi|entrepr|commerce|impôt|fiscal|salaire|travail|pouvoir d'achat/i },
  { id: "sante", emoji: "🩺", label: "Santé et solidarité", test: /santé|soin|hôpital|solidar|social|aide|retraite/i },
  { id: "education", emoji: "🎓", label: "Éducation et culture", test: /éduc|école|étud|jeunesse|culture|sport/i },
  { id: "securite", emoji: "🛡️", label: "Sécurité et justice", test: /sécurité|police|justice|ordre|prévention/i },
  { id: "environnement", emoji: "🌿", label: "Environnement et cadre de vie", test: /environ|écolog|climat|vert|parc|transport|logement|urban|propreté/i },
] as const;

export function programByTheme(items: string[]) {
  const groups = PROGRAM_THEMES.map(t => ({ ...t, items: [] as string[] }));
  const other: string[] = [];
  for (const it of items) { const g = groups.find(t => t.test.test(it)); if (g) g.items.push(it); else other.push(it); }
  return { themes: groups.filter(g => g.items.length), other };
}
