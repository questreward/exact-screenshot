// Vie visible d'un habitant fictif, dérivée de l'heure du jeu (déterministe, aucune donnée stockée).
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const MOODS = [{ emoji: "😊", label: "de bonne humeur" }, { emoji: "😐", label: "plutôt calme" }, { emoji: "😴", label: "un peu fatigué(e)" }, { emoji: "😄", label: "très en forme" }, { emoji: "🤔", label: "pensif(ve)" }];

export function personMood(id: string, now: Date) {
  return MOODS[hash(`${id}:${now.toISOString().slice(0, 10)}`) % MOODS.length]!;
}

/** Ce que fait l'habitant à cette heure, selon son métier. Formulé sans lieu précis (pas de localisation privée). */
export function personNow(profession: string | null | undefined, now: Date): { emoji: string; text: string } {
  const h = now.getUTCHours(), day = now.getUTCDay(), weekend = day === 0 || day === 6;
  const p = (profession ?? "").toLowerCase();
  const night = /infirm|pompier|police|gendarm|samu|médecin|medecin/.test(p);
  if (h < 6 || h >= 23) return night && h < 6 ? { emoji: "🌙", text: "est de garde cette nuit" } : { emoji: "😴", text: "dort" };
  if (h < 8) return { emoji: "☕", text: "prend son petit-déjeuner" };
  if (h >= 12 && h < 14) return { emoji: "🍽️", text: "déjeune" };
  if (h >= 19) return { emoji: "🏠", text: "est rentré(e) chez soi" };
  if (weekend && !night) return { emoji: "🛍️", text: "profite de son week-end" };
  if (/étudiant|etudiant|lycéen|lyceen/.test(p)) return { emoji: "📚", text: "est en cours" };
  if (/retrait/.test(p)) return { emoji: "🌳", text: "se promène" };
  if (/sans emploi|chômage|chomage/.test(p)) return { emoji: "🔎", text: "cherche du travail" };
  return { emoji: "💼", text: profession ? `travaille (${profession})` : "travaille" };
}
