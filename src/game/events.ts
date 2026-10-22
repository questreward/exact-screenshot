// Présentation uniquement : le serveur décide de tout (génération, éligibilité, résultat, récompenses).
export type EventPhase = 'a_venir' | 'en_cours' | 'termine';
export type ParticipationStatus = 'inscrit' | 'reussi' | 'echoue' | 'absent' | 'ignore';
export type WorldEvent = {
  id: string; title: string; description: string | null; category: string; press_category: string | null;
  city_id: string | null; scope: 'local' | 'regional' | 'national'; location_id: string | null; location_name: string | null; district_id: string | null;
  starts_at: string; ends_at: string | null; importance: number; interactive: boolean; personal: boolean; reason: string | null;
  duration_kind: string | null; news_id: string | null; phase: EventPhase; eligible: boolean; conflict: string | null;
  participation: { choice: 'participer' | 'ignorer'; status: ParticipationStatus; outcome: { result?: string } | null; activity_id: string | null } | null;
  travel_delay_minutes?: number; marker?: boolean;
  city_effect?: { level: CityEffectLevel; amount: number; indicator: string } | null;
  reward: { money: number; skill: string | null; skill_amount: number; relation: number; reputation: number; civic: number; political: number; energy: number; success_rate: number } | null;
};
export type CityEffectLevel = 'none' | 'low' | 'medium' | 'strong';
export type EventsState = { now: string; enabled: boolean; city_id: string; events: WorldEvent[] };

export const EVENT_CATEGORIES = ['Vie quotidienne', 'Travail', 'Études', 'Logement', 'Social', 'Économie', 'Citoyenneté', 'Politique', 'Ville', 'Transport', 'Actualités'] as const;

export const PARTICIPATION_LABEL: Record<ParticipationStatus, string> = {
  inscrit: 'Inscrit — dans votre agenda', reussi: 'Participation réussie', echoue: 'Résultat insuffisant', absent: 'Absent', ignore: 'Ignoré',
};

/** Une participation reste possible jusqu'à 30 minutes après le début, comme le vérifie le serveur. */
export function canAct(e: WorldEvent, now: string) {
  if (e.participation || e.phase === 'termine') return false;
  return new Date(now).getTime() <= new Date(e.starts_at).getTime() + 30 * 60_000;
}

export type EventTab = 'aujourdhui' | 'a_venir' | 'pour_vous' | 'ma_ville' | 'recents';
const day = (iso: string) => iso.slice(0, 10);

/** Les annonces sans date de fin (Actualités) sont du jour même ; ensuite elles passent dans Récents. */
export function displayPhase(e: WorldEvent, now: string): EventPhase {
  if (e.phase === 'termine') return 'termine';
  if (e.ends_at || e.phase === 'a_venir') return e.phase;
  return day(e.starts_at) < day(now) ? 'termine' : 'en_cours';
}

export function filterEvents(events: WorldEvent[], tab: EventTab, now: string, cityId: string) {
  switch (tab) {
    case 'aujourdhui': return events.filter(e => displayPhase(e, now) !== 'termine' && day(e.starts_at) <= day(now));
    case 'a_venir': return events.filter(e => e.phase === 'a_venir' && day(e.starts_at) > day(now));
    case 'pour_vous': return events.filter(e => e.personal || (e.participation && e.participation.choice === 'participer') || (e.interactive && e.eligible && e.phase !== 'termine'));
    case 'ma_ville': return events.filter(e => e.city_id === cityId && !e.personal);
    case 'recents': return events.filter(e => displayPhase(e, now) === 'termine').reverse();
  }
}

export function rewardSummary(r: WorldEvent['reward']) {
  if (!r) return [];
  const out: string[] = [];
  if (r.money > 0) out.push(`+${r.money} €`);
  if (r.skill && r.skill_amount > 0) out.push(`+${r.skill_amount} ${r.skill}`);
  if (r.relation > 0) out.push(`+${r.relation} relation`);
  if (r.reputation > 0) out.push(`+${r.reputation} réputation`);
  if (r.civic > 0) out.push(`+${r.civic} engagement`);
  if (r.political > 0) out.push(`+${r.political} politique`);
  return out;
}

// ---------- Bloc 14 (présentation ; le serveur calcule tout) ----------
export const CITY_EFFECT_LABEL: Record<CityEffectLevel, string> = { none: 'Aucun effet', low: 'Effet faible', medium: 'Effet moyen', strong: 'Effet fort' };
export const INDICATOR_LABEL: Record<string, string> = { satisfaction: 'satisfaction' };
/** Indication du retard (identique au calcul serveur : somme plafonnée). */
export function travelDelay(delays: number[], cap = 40) { return Math.min(delays.reduce((a, b) => a + Math.max(0, b), 0), cap); }
/** Niveau d'effet national selon la satisfaction (indication : seuils 70 / 50 / 30). */
export function cityEffectLevel(satisfaction: number | null): CityEffectLevel {
  if (satisfaction === null || satisfaction >= 70) return 'none';
  if (satisfaction >= 50) return 'low';
  return satisfaction >= 30 ? 'medium' : 'strong';
}
/** Un seul marqueur par lieu : événements publics actifs regroupés. */
export function markersByLocation(events: WorldEvent[], now?: string) {
  const m = new Map<string, WorldEvent[]>();
  for (const e of events) {
    if (!e.marker || e.personal || !e.location_id || e.phase !== 'en_cours') continue;
    if (now && (displayPhase(e, now) !== 'en_cours' || (e.ends_at && Date.parse(e.ends_at) <= Date.parse(now)) || Date.parse(e.starts_at) > Date.parse(now))) continue;
    const list = m.get(e.location_id) ?? [];
    if (!list.some(x => x.id === e.id)) list.push(e);
    m.set(e.location_id, list);
  }
  return m;
}
