import type { LifeActivity } from './life-state';

/** Time passing does not finish a shift; retain the server's running status. */
export function workSchedule(activities: LifeActivity[]) {
  const work = [...new Map(activities.filter(a => a.type === 'work').map(a => [a.id, a])).values()];
  return {
    active: work.filter(a => a.status === 'running' || a.status === 'planned').sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running') || Date.parse(a.start_time) - Date.parse(b.start_time)),
    lastCompleted: work.filter(a => a.status === 'completed').sort((a, b) => Date.parse(b.end_time) - Date.parse(a.end_time))[0],
  };
}