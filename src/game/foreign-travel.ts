export type TravelCountry = { id: string; name: string; flag: string; eu: boolean; mode: string; fare: number };
export const lodgingPrices = { auberge: 30, location: 60, hôtel: 90 } as const;
export type Lodging = keyof typeof lodgingPrices;
export function documentRequirement(eu: boolean) { return eu ? 'CNI' : 'Passeport'; }
export function travelPrice(fare: number, days: number, lodging: Lodging, factor = 1) {
  const transport = Math.ceil(Number((fare * factor).toFixed(8))); const accommodation = Math.ceil(Number((lodgingPrices[lodging] * days * factor).toFixed(8)));
  return { transport, accommodation, total: transport + accommodation };
}
export function leaveUsage(days: number, used: number, employed: boolean) {
  const balance = employed ? Math.max(0, 25 - used) : 0;
  const paid = employed ? Math.min(days, balance) : 0;
  return { balance, paid, absence: employed ? days - paid : 0 };
}
export type ForeignTrip = { id: string; country_id: string; status: 'abroad' | 'returned'; returns_at: string; days: number; total: number; incident: string | null; paid_days: number; absence_days: number };
export type ForeignTravelState = { now: string; factor: number; countries: TravelCountry[]; documents: { cni: boolean; passport: boolean }; employed: boolean; leave_used: number; trips: ForeignTrip[]; postcards: { id: string; country_id: string; text: string }[] };
