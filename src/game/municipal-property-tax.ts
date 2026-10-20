/** Presentation only: PostgreSQL owns assessments and rate votes. */
export function clampPropertyTaxRate(rate: number): number {
  return Math.min(120, Math.max(80, Number.isFinite(rate) ? Math.round(rate) : 100));
}
export function municipalPropertyTaxAmount(base: number, rate: number): number {
  return Math.round(Math.max(0, base) * clampPropertyTaxRate(rate) / 100);
}
export interface MunicipalPropertyTaxState {
  city_id: string; city_name: string; year: number; received: number;
  current_rate: number; next_rate: number; next_voted: boolean; is_mayor: boolean;
}
