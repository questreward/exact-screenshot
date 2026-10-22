import type { Message } from "./communication";

/** Back leaves a conversation before leaving its application. */
export function phoneBackTarget(app?: string, thread?: string): { app: string | undefined; thread: undefined } {
  return { app: app === 'messages' && thread ? 'messages' : undefined, thread: undefined };
}

/** The phone only requests the systems needed by the selected view. */
export function phoneDataKeys(app?: string): string[] {
  const base = ["clock", "notifications"];
  const views: Record<string, string[]> = {
    home: ["life", "news", "communication"],
    messages: ["communication", "threads", "messages", "templates", "position"],
    social: ["communication", "feed", "templates"],
    profil: ["character", "civic"],
    banque: ["bank", "economy", "life"],
    contacts: ["life", "social"],
    achats: ["shop"],
    "vie-sociale": ["life", "character"],
    travail: ["life"],
    meteo: ["position"],
    notifications: [],
    politique: [],
    reseau: [],
  };
  return [...base, ...(views[app ?? "home"] ?? views["home"] ?? [])];
}

export function conversationMessages(messages: Message[], threadId: string) {
  return messages.filter(m => m.thread_id === threadId).sort((a, b) => a.sent_at.localeCompare(b.sent_at) || a.id.localeCompare(b.id));
}

export function phoneNotificationTarget(n: { title: string; body: string; news_id: string | null }, fallback: string) {
  if (n.news_id) return { to: "/actualites/$id", id: n.news_id };
  if (fallback === "/banque") return { to: "/telephone", app: "banque" };
  if (fallback === "/telephone") return { to: "/telephone", app: "messages" };
  return { to: fallback };
}