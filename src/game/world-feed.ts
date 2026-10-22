import { displayPhase, type WorldEvent } from './events';

/** Projection of one server snapshot; never creates an event or a consequence. */
export function worldFeed(events: WorldEvent[], now: string, cityId: string, districtId?: string) {
  const unique = new Map<string, WorldEvent>();
  for (const event of events) {
    if (event.personal || (event.city_id !== cityId && !(event.city_id === null && event.scope === 'national'))) continue;
    if (districtId && event.district_id && event.district_id !== districtId) continue;
    if (displayPhase(event, now) !== 'en_cours') continue;
    if (event.ends_at && Date.parse(event.ends_at) <= Date.parse(now)) continue;
    if (Date.parse(event.starts_at) > Date.parse(now)) continue;
    unique.set(event.id, event);
  }
  return [...unique.values()].sort((a, b) => b.importance - a.importance || b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id));
}