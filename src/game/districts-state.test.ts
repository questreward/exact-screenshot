import { describe, expect, it } from 'vitest';
import { districtStatus, type DistrictFacts } from './districts-state';

const now = '2026-10-20T12:00:00Z';
const empty = (): DistrictFacts => ({ locations: [{ id: 'L1', name: 'Place', district_id: 'D1', civic_state: 'normal' }], decisions: [], issues: [], crises: [], projects: [], events: [] });

describe('districtStatus', () => {
  it('a calm district has no badge', () => {
    expect(districtStatus('D1', empty(), now).main).toBeNull();
  });
  it('a running municipal project marks the district as chantier', () => {
    const f = empty(); f.decisions.push({ id: 'p', title: 'Parc', district_id: null, location_id: 'L1', workflow: 'running', completed_at: null });
    expect(districtStatus('D1', f, now).badges).toEqual(['chantier']);
  });
  it('an active district crisis takes priority', () => {
    const f = empty(); f.locations[0]!.civic_state = 'travaux'; f.crises.push({ id: 'c', district_id: 'D1', status: 'urgence' });
    expect(districtStatus('D1', f, now).main).toBe('crise');
  });
  it('a finished crisis or another district crisis is ignored', () => {
    const f = empty(); f.crises.push({ id: 'c', district_id: 'D1', status: 'terminee' }, { id: 'd', district_id: 'D2', status: 'urgence' });
    expect(districtStatus('D1', f, now).main).toBeNull();
  });
  it('completed works count as renovated only for 30 days', () => {
    const f = empty(); f.decisions.push({ id: 'p', title: 'Parc', district_id: 'D1', location_id: 'L1', workflow: 'completed', completed_at: '2026-10-01T00:00:00Z' });
    expect(districtStatus('D1', f, now).main).toBe('renove');
    f.decisions[0]!.completed_at = '2026-08-01T00:00:00Z';
    expect(districtStatus('D1', f, now).main).toBeNull();
  });
  it('two severe unresolved issues without works means délaissé', () => {
    const f = empty();
    f.issues.push({ id: 'a', title: 'A', district_id: 'D1', location_id: 'L1', severity: 4, status: 'reported' }, { id: 'b', title: 'B', district_id: 'D1', location_id: 'L1', severity: 5, status: 'identified' });
    expect(districtStatus('D1', f, now).main).toBe('delaisse');
    f.locations[0]!.civic_state = 'travaux';
    expect(districtStatus('D1', f, now).badges).not.toContain('delaisse');
  });
  it('an ongoing public event makes the district animé, personal ones do not', () => {
    const f = empty(); f.events.push({ id: 'e', title: 'Fête', district_id: 'D1', location_id: 'L1', personal: true, ongoing: true });
    expect(districtStatus('D1', f, now).main).toBeNull();
    f.events[0]!.personal = false;
    expect(districtStatus('D1', f, now).main).toBe('anime');
  });
});
