import type { QueryClient } from "@tanstack/react-query";
import { phoneDataKeys } from "@/game/phone-state";
import { clockQuery, notificationsQuery, lifeQuery, newsQuery, communicationQuery, threadsQuery, messagesQuery, messageTemplatesQuery, positionQuery, civiFeedQuery, characterQuery, civicQuery, bankQuery, economyQuery, socialQuery } from "./game";

export async function preparePhone(q: QueryClient, app?: string) {
  const tasks: Record<string, () => Promise<unknown>> = {
    clock: () => q.ensureQueryData(clockQuery), notifications: () => q.ensureQueryData(notificationsQuery),
    life: () => q.ensureQueryData(lifeQuery), news: () => q.ensureQueryData(newsQuery), communication: () => q.ensureQueryData(communicationQuery),
    threads: () => q.ensureQueryData(threadsQuery), messages: () => q.ensureQueryData(messagesQuery), templates: () => q.ensureQueryData(messageTemplatesQuery),
    position: () => q.ensureQueryData(positionQuery), feed: () => q.ensureQueryData(civiFeedQuery), character: () => q.ensureQueryData(characterQuery),
    civic: () => q.ensureQueryData(civicQuery), bank: () => q.ensureQueryData(bankQuery), economy: () => q.ensureQueryData(economyQuery), social: () => q.ensureQueryData(socialQuery),
  };
  // Existing mounted observers retain their refresh intervals; this does not change global caching.
  const keys = phoneDataKeys(app);
  // communication_state settles recorded messages; read histories only after it completes.
  if (keys.includes("communication")) await tasks["communication"]?.();
  await Promise.all(keys.filter(key => key !== "communication").map(key => tasks[key]?.()));
}