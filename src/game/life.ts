export const MAX_ENERGY = 100;
export const ACTIVITY_STATUS: Record<string, string> = { planned: "Prévu", running: "En cours", completed: "Terminé", cancelled: "Annulé" };
export const LIFE_ACTIONS: Record<string, string> = { rest: "Se reposer", eat: "Manger", study: "Étudier", work: "Travailler", transport: "Transport public" };
export function energyAfter(current: number, cost: number, recovery: number, maximum = MAX_ENERGY) {
  return Math.min(maximum, Math.max(0, current - cost + recovery));
}
export function canFinish(status: string, endTime: string, worldNow: string) {
  return status === "running" && new Date(worldNow).getTime() >= new Date(endTime).getTime();
}
export function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return new Date(start).getTime() < new Date(otherEnd).getTime() && new Date(end).getTime() > new Date(otherStart).getTime();
}
export function academicLevel(progress: number) { return 1 + Math.floor(progress / 100); }
export function gameDate(value: string) { return new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z"); }
export function gameHour(value: string) { return gameDate(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }); }
export function durationLabel(minutes: number) { return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}`; }