// Presentation only: election calendar, support explanations and home banners from existing election state.
import type { Election, ElectionState } from "./elections";

export function electionCalendar(e: Pick<Election, "starts_at" | "candidacy_ends_at" | "campaign_starts_at" | "debate_at" | "vote_starts_at" | "count_at">, now: string) {
  const steps = [
    { label: "Candidatures", emoji: "📝", at: e.starts_at },
    { label: "Campagne", emoji: "📣", at: e.campaign_starts_at },
    { label: "Débat", emoji: "🎙️", at: e.debate_at },
    { label: "Vote", emoji: "🗳️", at: e.vote_starts_at },
    { label: "Résultats", emoji: "📊", at: e.count_at },
  ];
  let current = -1;
  steps.forEach((s, i) => { if (s.at <= now) current = i; });
  return { steps, current };
}

/** Why the player's support moved: one line per recorded campaign action. */
export function supportReasons(s: Pick<ElectionState, "actions" | "rules">, candidacyId: string) {
  return s.actions.filter(a => a.candidacy_id === candidacyId && a.rewarded_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
    .map(a => ({ id: a.id, title: s.rules.find(r => r.id === a.rule_id)?.title ?? "Action de campagne", delta: a.support_delta }));
}

/** Home banner: elected moment first, then vote today / tomorrow. */
export function electionBanner(s: Pick<ElectionState, "elections" | "world_now">) {
  const now = Date.parse(s.world_now), D = 86400000;
  for (const e of s.elections) {
    const m = e.mandate;
    if (m && m.status === "active" && e.candidates.some(c => c.mine && c.id === m.candidacy_id) && now - Date.parse(m.starts_at) < 7 * D)
      return { kind: "elu" as const, text: `🏛️ Vous êtes élu : ${m.function}`, id: e.id };
  }
  for (const e of s.elections) {
    const start = Date.parse(e.vote_starts_at), end = Date.parse(e.vote_ends_at);
    if (now >= start && now < end && !e.voted) return { kind: "vote" as const, text: `🗳️ Élection aujourd'hui : ${e.name}`, id: e.id };
    if (start > now && start - now < D) return { kind: "demain" as const, text: `🗳️ Élection demain : ${e.name}`, id: e.id };
  }
  return null;
}
