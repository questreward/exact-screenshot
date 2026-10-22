import type { DriveSegment, DriveRadar } from './driving';

/** Presentation of a saved deadline, never an arrival or a road-routing decision. */
export function journeySummary(start: string, end: string, now: number, segments: DriveSegment[] = [], radars: DriveRadar[] = []) {
  const a = Date.parse(start), b = Date.parse(end);
  const valid = Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(now) && b > a;
  if (!valid) return { progress: 0, remainingMinutes: null, awaitingConfirmation: false, segment: undefined, nextSegment: undefined, nextRadar: undefined };
  const progress = Math.max(0, Math.min(100, (now - a) / (b - a) * 100));
  return {
    progress,
    remainingMinutes: Math.max(0, Math.ceil((b - now) / 60000)),
    awaitingConfirmation: now >= b,
    segment: segments.find(s => progress >= s.from && progress < s.to),
    nextSegment: segments.filter(s => s.from > progress).sort((x, y) => x.from - y.from)[0],
    nextRadar: radars.filter(r => r.at > progress).sort((x, y) => x.at - y.at)[0],
  };
}