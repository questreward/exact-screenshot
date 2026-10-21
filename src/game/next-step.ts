// Presentation-only: picks the single most relevant pointer to an existing page.
export type NextStep = { emoji: string; title: string; detail: string; to: string; cta: string; endOfDay?: boolean };

type Act = { title: string; start_time: string; end_time: string; status: string };
type Notif = { title: string; body: string; read: boolean; news_id: string | null };
type Input = {
  now: Date;
  activities: Act[];
  notifications: Notif[];
  hasHousing: boolean;
  studying: boolean;
  working: boolean;
  age: number;
};

const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export function notificationTarget(n: { title: string; body: string; news_id: string | null }): string {
  if (n.news_id) return "/actualites";
  const t = `${n.title} ${n.body}`.toLowerCase();
  if (/salaire|virement|paiement|banque|compte/.test(t)) return "/banque";
  if (/vote|scrutin|élection|election|candidat/.test(t)) return "/elections";
  if (/courrier|recommandé|lettre|colis/.test(t)) return "/la-poste";
  if (/visite|logement|loyer|bail/.test(t)) return "/logement";
  if (/agenda|commence|rendez-vous|cours|service/.test(t)) return "/agenda";
  if (/impôt|impot/.test(t)) return "/impots";
  return "/evenements";
}

export function nextStep(i: Input): NextStep {
  const live = i.activities.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const nowMs = i.now.getTime();
  const current = live.find((a) => Date.parse(a.start_time) <= nowMs && Date.parse(a.end_time) > nowMs);
  if (current) return { emoji: "⏳", title: `En cours : ${current.title}`, detail: `Fin prévue à ${hm(new Date(current.end_time))}.`, to: "/agenda", cta: "Voir mon agenda" };
  const justEnded = i.activities.filter((a) => a.status !== "cancelled").filter((a) => { const e = Date.parse(a.end_time); return e <= nowMs && nowMs - e < 60 * 60000; }).sort((a, b) => Date.parse(b.end_time) - Date.parse(a.end_time))[0];
  const upcoming = live.filter((a) => Date.parse(a.start_time) > nowMs).sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))[0];
  if (upcoming) {
    const mins = Math.round((Date.parse(upcoming.start_time) - nowMs) / 60000);
    const when = mins < 60 ? `dans ${mins} min` : `à ${hm(new Date(upcoming.start_time))}`;
    return { emoji: "📅", title: `${upcoming.title} ${when}`, detail: "C'est ta prochaine activité prévue.", to: "/agenda", cta: "Voir mon agenda" };
  }
  if (justEnded) return { emoji: "✅", title: `Fin : ${justEnded.title} — ${hm(new Date(justEnded.end_time))}`, detail: "Journée terminée. Tes gains et ton énergie sont à jour.", to: "/agenda", cta: "Mon agenda", endOfDay: true };
  const unread = i.notifications.find((n) => !n.read);
  if (unread) return { emoji: "🔔", title: unread.title, detail: unread.body, to: notificationTarget(unread), cta: "Voir" };
  if (!i.hasHousing) return { emoji: "🏠", title: "Trouver un logement", detail: "Tu n'as pas encore de chez-toi.", to: "/logement", cta: "Chercher" };
  if (i.studying) return { emoji: "🎓", title: "Aller en cours", detail: "Tes études t'attendent.", to: "/vie", cta: "Y aller" };
  if (i.working) return { emoji: "💼", title: "Aller travailler", detail: "Une journée de travail rapporte ton salaire.", to: "/vie", cta: "Y aller" };
  if (i.age >= 18) return { emoji: "🔎", title: "Trouver un emploi", detail: "Des offres t'attendent.", to: "/espace-emploi", cta: "Voir les offres" };
  return { emoji: "🗺️", title: "Explorer ta ville", detail: "Découvre les lieux autour de toi.", to: "/carte", cta: "Ouvrir la carte" };
}

/** Prochaine destination : lieu de l'activité en cours ou à venir (jamais inventé). */
export function nextDestination<A extends { status: string; start_time: string; end_time: string; title: string; location?: { id: string; name: string; city_id: string; district_id: string | null } | null }>(activities: A[], now: Date, currentLocationId?: string | null) {
  const t = now.getTime();
  const a = activities.filter(x => x.status !== "cancelled" && x.status !== "completed" && Date.parse(x.end_time) > t && x.location && x.location.id !== currentLocationId)
    .sort((x, y) => Date.parse(x.start_time) - Date.parse(y.start_time))[0];
  return a?.location ? { title: a.title, place: a.location } : null;
}
