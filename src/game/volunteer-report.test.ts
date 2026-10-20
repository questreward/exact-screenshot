import { describe, expect, it } from 'vitest';
import { volunteerReports } from './volunteer-report';
import type { SecurityShift } from '@/services/game';

const shift: SecurityShift = { id: 'pc-1', service: 'protection_civile', starts_at: '2026-10-20T08:00:00Z', ends_at: '2026-10-20T12:00:00Z', hours: 4, mission_id: 'pc-poste', choice: 'orienter', outcome: 'reussite', settled: false };
describe('comptes rendus bénévoles enregistrés', () => {
  it('ne présente pas un résultat avant clôture du service', () => {
    expect(volunteerReports([shift])[0]?.outcome).toBeNull();
  });
  it('conserve le résultat exact du service clôturé', () => {
    expect(volunteerReports([{ ...shift, settled: true, outcome: 'plainte' }])[0]?.outcome).toBe('plainte');
  });
  it('exclut les services de police du dossier bénévole', () => {
    expect(volunteerReports([{ ...shift, service: 'police' }])).toEqual([]);
  });
});