export const NEWS_CATEGORIES = ["Société", "Éducation", "Emploi", "Économie", "Vie locale", "Culture", "Sport", "Transport", "Technologie", "Environnement", "Politique"] as const;
export const NEWS_SCOPES = { local: "Local", regional: "Régional", national: "National" } as const;
export type NewsScope = keyof typeof NEWS_SCOPES;
export type NewsArticle = {
  id: string; title: string; summary: string; body: string; image: string | null;
  category: string; author: string; published_at: string; scope: NewsScope;
  importance: number; status: string; city_id: string | null; region: string | null;
  city_name: string | null; read_at: string | null; bookmarked: boolean; relevance: number;
  source: { id: string; name: string; description: string; kind: string; reputation: number; scope: NewsScope } | null;
  location: { id: string; name: string; city_id: string; district_id: string } | null;
  organization: { id: string; name: string; city_id: string } | null;
  event: { id: string; title: string; description: string; starts_at: string; status: string } | null;
  agenda_activity_id: string | null;
  related_entities?: { political?: boolean; personalities?: { id: string; name: string; role: string }[] } | null;
};
export type NewsState = {
  world_now: string; city_id: string; region: string; unread_count: number;
  articles: NewsArticle[]; preferences: { news_personalized: boolean; news_notifications: boolean };
  settings: { new_hours: number; recent_hours: number; archive_days: number; important_threshold: number; page_size: number };
};
export type NewsFilters = { query: string; scope: string; category: string; mode: string; archived: boolean };
export function newsAge(article: NewsArticle, state: Pick<NewsState, "world_now" | "settings">) {
  const hours = Math.max(0, (Date.parse(state.world_now) - Date.parse(article.published_at)) / 3600000);
  return article.status === "archived" || hours >= state.settings.archive_days * 24 ? "archived" : hours < state.settings.new_hours ? "new" : hours < state.settings.recent_hours ? "recent" : "old";
}
export function filterNews(state: NewsState, filters: NewsFilters) {
  const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const needle = normalized(filters.query.trim());
  return state.articles.filter(a => {
    if (!filters.archived && newsAge(a, state) === "archived" && filters.mode !== "saved") return false;
    if (filters.scope === "local" && (a.scope !== "local" || a.city_id !== state.city_id)) return false;
    if (filters.scope === "regional" && (a.scope !== "regional" || a.region !== state.region)) return false;
    if (filters.scope === "national" && a.scope !== "national") return false;
    if (filters.category && a.category !== filters.category) return false;
    if (filters.mode === "unread" && a.read_at) return false;
    if (filters.mode === "saved" && !a.bookmarked) return false;
    return !needle || normalized([a.title, a.source?.name, a.category, a.city_name, a.region].join(" ")).includes(needle);
  }).sort((a, b) => {
    const bucket = (article: NewsArticle) => newsAge(article, state) === "archived" ? 2 : newsAge(article, state) === "old" ? 1 : 0;
    return bucket(a) - bucket(b) || b.importance - a.importance || (state.preferences.news_personalized ? b.relevance - a.relevance : 0) || Date.parse(b.published_at) - Date.parse(a.published_at) || a.id.localeCompare(b.id);
  });
}
export function newsDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}