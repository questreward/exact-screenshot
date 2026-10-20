import { displayPhase, type WorldEvent } from './events';

export type PlaceEvent = Pick<WorldEvent, 'id' | 'title' | 'location_id' | 'importance' | 'starts_at' | 'press_category'>;

/** Public presentation only; omit eligibility, rewards and participation data. */
export function publicPlaceEvents(events: WorldEvent[], cityId: string, locationId: string, now: string): PlaceEvent[] {
  return events.filter(e => !e.personal && e.city_id === cityId
    && (e.location_id === locationId || e.location_id === null)
    && e.phase !== 'a_venir' && displayPhase(e, now) === 'en_cours'
    && Date.parse(e.starts_at) <= Date.parse(now))
    .sort((a, b) => b.importance - a.importance)
    .map(({ id, title, location_id, importance, starts_at, press_category }) => ({ id, title, location_id, importance, starts_at, press_category }));
}

export function isCurrentPlace(currentLocationId: string | null | undefined, selectedLocationId: string) {
  return currentLocationId === selectedLocationId;
}

export function recordedImpacts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])));
}