// Bloc 13 — aides d'affichage uniquement ; toutes les règles sont vérifiées par le serveur.
export type CommunicationState = { unread: number; posts_today: number; daily_post_limit: number; enabled: boolean; city_id: string };
export type Reply = { id: string; label: string; body: string };
export type Message = { id: string; thread_id: string; sender: 'npc' | 'player'; body: string; template_id: string | null; sent_at: string; read_at: string | null; replied_with: string | null; location_id: string | null };
export type Thread = { id: string; npc_id: string; last_message_at: string; npc: { first_name: string; last_name: string; location_id: string | null } | null };
export type Post = { id: string; author_kind: string; author_label: string; character_id: string | null; body: string; posted_at: string; news_id: string | null; event_id: string | null; city_id: string | null };
export type WorldOverview = {
  now: string; season: string;
  cities: { id: string; name: string; mayor: string | null; weather: { condition: string; temperature: number } | null; indicators: Record<string, number> | null }[];
  national_events: { id: string; title: string; starts_at: string }[];
  headlines: { id: string; title: string; city_id: string | null }[];
};

export function postsLeft(s: Pick<CommunicationState, 'posts_today' | 'daily_post_limit'>) {
  return Math.max(0, s.daily_post_limit - s.posts_today);
}
export function canPost(s: Pick<CommunicationState, 'posts_today' | 'daily_post_limit' | 'enabled'>) {
  return s.enabled && postsLeft(s) > 0;
}
export function badgeLabel(n: number) { return n > 99 ? '99+' : String(n); }
