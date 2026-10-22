import type { PoliticalState } from './politics';
import type { ElectionState } from './elections';
import type { LifeLocation } from './life-state';

export type PoliticalAppointment = { id: string; title: string; start: string; end: string; status: string; location?: LifeLocation; organizationId?: string; electionId?: string };

/** Recorded appointments only: no attendance, inferred completion or new agenda. */
export function politicalAppointments(p: PoliticalState, e?: ElectionState): PoliticalAppointment[] {
  const rows: PoliticalAppointment[] = p.activities.map(a => {
    const org = p.organizations.find(o => o.id === a.organization_id);
    const event = org?.events.find(event => event.id === a.organization_event_id);
    return { id: a.id, title: a.title, start: a.start_time, end: a.end_time, status: a.status, location: event?.location, organizationId: org?.id };
  });
  if (e) for (const action of e.actions) {
    const election = e.elections.find(el => el.candidates.some(c => c.id === action.candidacy_id && c.mine));
    const a = action.activity;
    if (!election || !a) continue;
    rows.push({ id: a.id, title: a.title, start: a.start_time, end: a.end_time, status: a.status, location: a.location, electionId: election.id });
  }
  return [...new Map(rows.map(row => [row.id, row])).values()]
    .filter(row => row.status === 'planned' || row.status === 'running')
    .sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running') || Date.parse(a.start) - Date.parse(b.start));
}

export function localPoliticalEvents(p: PoliticalState) {
  return p.organizations.filter(o => o.city_id === p.city_id && o.status === 'active')
    .flatMap(o => o.events.filter(event => event.location?.city_id === p.city_id).map(event => ({ event, organization: o })))
    .filter((row, index, all) => all.findIndex(other => other.event.id === row.event.id) === index);
}