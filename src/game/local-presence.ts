import type { PresentNpc } from '@/services/game';

// Only identities supplied by the location snapshot are shown, once each.
export function localPeople<T extends PresentNpc>(snapshot: T[]): T[] {
  return [...new Map(snapshot.map(person => [person.id, person])).values()]
    .sort((a, b) => Number(b.known) - Number(a.known) || a.first_name.localeCompare(b.first_name, 'fr'));
}