import type { SecurityShift } from '@/services/game';

/** An outcome may be chosen internally before settlement; never expose it as a final report early. */
export function volunteerReports(shifts: SecurityShift[]) {
  return shifts.filter(shift => shift.service === 'protection_civile').map(shift => ({
    ...shift,
    outcome: shift.settled ? shift.outcome : null,
  }));
}