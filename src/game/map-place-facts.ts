import type { LifeState } from './life-state';
import { openState } from './place-doors';

export function recordedPlaceFacts(activities: LifeState['activities'], currentId?: string | null) {
  const visited = new Set<string>(currentId ? [currentId] : []);
  const meetings = new Map<string, LifeState['activities']>();
  for (const activity of new Map(activities.map(a => [a.id, a])).values()) {
    if (!activity.location_id) continue;
    if (activity.status === 'completed' && ['work', 'study', 'social'].includes(activity.type)) visited.add(activity.location_id);
    if (activity.type === 'social' && activity.social_npc_id && ['planned', 'running'].includes(activity.status)) {
      meetings.set(activity.location_id, [...(meetings.get(activity.location_id) ?? []), activity].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time)));
    }
  }
  return { visited, meetings };
}

export function placeAvailability(hours: string | null, accessible: boolean, now: Date) {
  if (!accessible) return 'indisponible';
  const state = openState(hours, now);
  return state ? state.open ? 'disponible' : 'fermé' : 'horaires non précisés';
}