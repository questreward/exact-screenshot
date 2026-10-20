/** Presentation only; all scoring and effects belong to the server. */
export const MISSION_THRESHOLDS = [10, 25, 50] as const;
export function nextMissionThreshold(successes: number): number | null {
  return MISSION_THRESHOLDS.find(n => n > Math.max(0, successes)) ?? null;
}
export function missionStepLabel(index: number, count: number): string {
  return `Étape ${Math.min(Math.max(index + 1, 1), Math.max(count, 1))} sur ${Math.max(count, 1)}`;
}
export function missionResult(status: string): string {
  return ({ success: 'Intervention réussie', failure: 'Intervention difficile', expired: 'Mission expirée, sans pénalité' } as Record<string, string>)[status] ?? 'Mission du jour';
}
