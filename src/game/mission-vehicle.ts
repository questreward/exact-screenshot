/** Illustration of equipment for a recorded mission, never a new trip. */
export function missionVehicle(job: string): 'camion' | 'voiture' | null {
  if (job === 'pompier_pro' || job === 'pompier_vol' || job === 'protection_civile' || job.startsWith('samu_')) return 'camion';
  if (job === 'police' || job === 'gendarmerie') return 'voiture';
  return null;
}