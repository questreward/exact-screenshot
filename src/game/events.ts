// Présentation uniquement : le serveur décide de tout (génération, éligibilité, résultat, récompenses).
export type EventPhase = 'a_venir' | 'en_cours' | 'termine';
export type ParticipationStatus = 'inscrit' | 'reussi' | 'echoue' | 'absent' | 'ignore';
export type WorldEvent = {
  id: string; title: string; description: string | null; category: string; press_category: string | null;
  city_id: string | null; scope: 'local' | 'regional' | 'national'; location_id: string | null; location_name: string | null; district_id: string | null;
  starts_at: string; ends_at: string | null; importance: number; interactive: boolean; personal: boolean; reason: string | null;
  duration_kind: string | null; news_id: string | null; phase: EventPhase; eligible: boolean; conflict: string | null;
  participation: { choice: 'participer' | 'ignorer'; status: ParticipationStatus; outcome: { result?: string } | null; activity_id: string | null } | null;
  reward: { money: number; skill: string | null; skill_amount: number; relation: number; reputation: number; civic: number; political: number; energy: number; success_rate: number } | null;
};
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

export function filterEvents(events: WorldEvent[], tab: EventTab, now: string, cityId: string) {
  switch (tab) {
    case 'aujourdhui': return events.filter(e => e.phase !== 'termine' && day(e.starts_at) <= day(now));
    case 'a_venir': return events.filter(e => e.phase === 'a_venir' && day(e.starts_at) > day(now));
    case 'pour_vous': return events.filter(e => e.personal || (e.participation && e.participation.choice === 'participer') || (e.interactive && e.eligible && e.phase !== 'termine'));
    case 'ma_ville': return events.filter(e => e.city_id === cityId && !e.personal);
    case 'recents': return events.filter(e => e.phase === 'termine').reverse();
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
