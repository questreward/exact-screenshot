// Game rules — mirrored and enforced server-side in the create_character database function.
// The UI uses these only to guide the player; the server has the final word.

export const MIN_AGE = 16;
export const MAX_AGE = 30;
export const ADULT_AGE = 18;

export type PathId = "student" | "young_worker" | "early_career";

export const PATH_MIN_AGE: Record<PathId, number> = {
  student: 16,
  young_worker: 18,
  early_career: 18,
};

export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
}

export function isPathAllowedForAge(pathId: PathId, age: number): boolean {
  return isValidAge(age) && age >= PATH_MIN_AGE[pathId];
}

export function allowedPaths(age: number): PathId[] {
  return (Object.keys(PATH_MIN_AGE) as PathId[]).filter((p) => isPathAllowedForAge(p, age));
}
