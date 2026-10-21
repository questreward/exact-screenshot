// Sélections pour l'espace « Vie sociale » du téléphone (lecture seule, données existantes).
type Ev = { id: string; city_id: string | null; scope: string; personal: boolean; phase: string; importance: number; starts_at: string };
/** Événements publics de ma ville (ou nationaux), en cours d'abord, puis à venir ; jamais les événements personnels. */
export function eventsAroundMe<T extends Ev>(events: T[], cityId: string | null | undefined, max = 4): T[] {
  return events.filter(e => !e.personal && e.phase !== "termine" && (e.city_id === cityId || e.scope === "national"))
    .sort((a, b) => (a.phase === "en_cours" ? 0 : 1) - (b.phase === "en_cours" ? 0 : 1) || b.importance - a.importance || Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, max);
}
type Act = { id: string; type: string; status: string; start_time: string; end_time: string };
/** Rendez-vous sociaux à venir ou en cours, du plus proche au plus lointain. */
export function socialPlans<T extends Act>(acts: T[], now: Date): T[] {
  const t = now.getTime();
  return acts.filter(a => /social|political|civic|campaign|event/.test(a.type) && a.status !== "cancelled" && a.status !== "completed" && Date.parse(a.end_time) > t)
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
}
