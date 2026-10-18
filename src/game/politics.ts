import type { LifeLocation } from "./life-state";

// Presentation-only political helpers. Authoritative rules (membership, roles,
// rewards) live in secured database functions; gains are configured in
// political_settings and organization_events.

export const POLITICAL_KINDS: Record<string, string> = { party: "Parti politique", movement: "Mouvement politique" };
export const POLITICAL_SCOPES: Record<string, string> = { local: "Locale", regional: "Régionale", national: "Nationale" };
export const POLITICAL_ROLE_LABELS: Record<string, string> = {
  supporter: "Sympathisant", member: "Membre", activist: "Militant", local_lead: "Responsable local", cadre: "Cadre", leader: "Dirigeant",
};
export const POLITICAL_EVENT_KINDS: Record<string, string> = {
  reunion: "Réunion", reunion_locale: "Réunion locale", debat: "Débat", conference: "Conférence",
  tractage: "Tractage", rencontre_citoyenne: "Rencontre citoyenne", evenement_public: "Événement public",
};

export type PoliticalAxis = { id: string; label: string; low_label: string; high_label: string; sort_order: number };
export type PoliticalTopic = { id: string; label: string; description: string; axis_id: string; sort_order: number };
export type PoliticalStance = { id: string; label: string; target: number | null; sort_order: number };
export type PoliticalRole = { id: string; label: string; rank: number; min_progress: number; min_reputation: number; player_start: boolean };
export type PoliticalOpinion = { character_id: string; topic_id: string; stance: string; updated_at: string };
export type PoliticalEvent = {
  id: string; organization_id: string; title: string; description: string; start_hour: number; duration_minutes: number;
  energy_cost: number; political_kind: string; political_reputation_gain: number; political_influence_gain: number;
  political_engagement_gain: number; relation_gain: number; location: LifeLocation; city_name: string; participant_count: number;
};
export type PoliticalOrganization = {
  id: string; name: string; kind: "party" | "movement"; city_id: string; city_name: string; description: string; symbol: string;
  scope: string; reputation: number; influence: number; created_at: string; status: string;
  ideology: Record<string, number>; core_values: string[]; priorities: string[]; slogan: string; location: LifeLocation;
  branches: { kind: string; city_id: string; city_name: string; location: LifeLocation }[];
  member_count: number; leaders: { id: string; first_name: string; last_name: string; role: string; city_id: string }[];
  events: PoliticalEvent[];
};
export type PoliticalPersonality = {
  id: string; first_name: string; last_name: string; age: number; city_id: string; city_name: string; political_role: string;
  description: string; reputation: number; influence: number; location: LifeLocation;
  organization: { id: string; name: string; kind: string; symbol: string } | null;
  relation: { score: number; level: string } | null;
};
export type PoliticalMembership = { id: string; organization_id: string; role: string; status: string; joined_at: string; left_at: string | null; progress: number; name: string; kind: string; symbol: string };
export type PoliticalState = {
  world_now: string; city_id: string;
  settings: { opinion_interest_gain: number; join_interest_gain: number; join_engagement_gain: number; activity_interest_gain: number; single_party: boolean; stat_cap: number };
  axes: PoliticalAxis[]; topics: PoliticalTopic[]; stances: PoliticalStance[]; roles: PoliticalRole[];
  stats: { interest: number; engagement: number; reputation: number; influence: number };
  opinions: PoliticalOpinion[]; organizations: PoliticalOrganization[]; personalities: PoliticalPersonality[];
  memberships: PoliticalMembership[];
  history: { kind: string; label: string; occurred_at: string; reputation?: number; influence?: number; engagement?: number }[];
  activities: { id: string; title: string; start_time: string; end_time: string; status: string; organization_event_id: string; organization_id: string }[];
};

/**
 * Indicative affinity (0–100) between the player's opinions and an organization.
 * Returns null when no opinion is defined. It never blocks any action.
 */
export function politicalAffinity(
  ideology: Record<string, number>,
  opinions: Pick<PoliticalOpinion, "topic_id" | "stance">[],
  topics: Pick<PoliticalTopic, "id" | "axis_id">[],
  stances: Pick<PoliticalStance, "id" | "target">[],
): number | null {
  const gaps: number[] = [];
  for (const o of opinions) {
    const target = stances.find(s => s.id === o.stance)?.target;
    const axis = topics.find(t => t.id === o.topic_id)?.axis_id;
    const position = axis ? ideology[axis] : undefined;
    if (target == null || position == null) continue;
    gaps.push(Math.abs(target - position));
  }
  if (!gaps.length) return null;
  return Math.round(100 - gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

export function compareAxes(a: PoliticalOrganization, b: PoliticalOrganization, axes: PoliticalAxis[]) {
  return axes.map(axis => {
    const va = a.ideology[axis.id] ?? 50, vb = b.ideology[axis.id] ?? 50;
    return { axis, a: va, b: vb, gap: Math.abs(va - vb) };
  });
}

export function compareLists(a: string[], b: string[]) {
  return { common: a.filter(x => b.includes(x)), onlyA: a.filter(x => !b.includes(x)), onlyB: b.filter(x => !a.includes(x)) };
}

export const gapLabel = (gap: number) => gap < 10 ? "Positions proches" : gap < 25 ? "Différence modérée" : "Forte différence";
