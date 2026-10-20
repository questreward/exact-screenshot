/** Presentation-only district badges derived from existing public records. No game rule lives here. */
export type DistrictBadge = 'chantier' | 'renove' | 'crise' | 'anime' | 'delaisse';

export const DISTRICT_BADGE_LABEL: Record<DistrictBadge, string> = {
  chantier: 'En chantier', renove: 'Rénové', crise: 'En crise', anime: 'Animé', delaisse: 'Délaissé (estimation)',
};
/** Display priority: the first present badge colours the district on the map. */
export const BADGE_PRIORITY: DistrictBadge[] = ['crise', 'chantier', 'anime', 'renove', 'delaisse'];

export const RENOVATED_RECENT_DAYS = 30;
export const NEGLECT_MIN_ISSUES = 2;
export const NEGLECT_MIN_SEVERITY = 4;

export type DistrictFacts = {
  locations: { id: string; name: string; district_id: string; civic_state: string }[];
  decisions: { id: string; title: string; district_id: string | null; location_id: string; workflow: string | null; completed_at: string | null }[];
  issues: { id: string; title: string; district_id: string; location_id: string; severity: number; status: string }[];
  crises: { id: string; district_id: string | null; status: string }[];
  projects: { id: string; title: string; district_id: string | null; status: string }[];
  events: { id: string; title: string; district_id: string | null; location_id: string | null; personal: boolean; ongoing: boolean }[];
};

export type DistrictReason = { badge: DistrictBadge; text: string; locationId?: string };
export type DistrictStatus = { badges: DistrictBadge[]; main: DistrictBadge | null; reasons: DistrictReason[] };

const DAY = 86_400_000;

export function districtStatus(districtId: string, f: DistrictFacts, now: string): DistrictStatus {
  const t = Date.parse(now);
  const locIds = new Set(f.locations.filter(l => l.district_id === districtId).map(l => l.id));
  const inDistrict = (d: string | null, loc?: string | null) => d === districtId || (!!loc && locIds.has(loc));
  const reasons: DistrictReason[] = [];

  for (const l of f.locations) if (l.district_id === districtId) {
    if (l.civic_state === 'travaux') reasons.push({ badge: 'chantier', text: `Travaux : ${l.name}`, locationId: l.id });
    if (l.civic_state === 'renove') reasons.push({ badge: 'renove', text: `Rénové : ${l.name}`, locationId: l.id });
  }
  for (const d of f.decisions) if (inDistrict(d.district_id, d.location_id)) {
    if (d.workflow === 'running') reasons.push({ badge: 'chantier', text: `Projet municipal en cours : ${d.title}`, locationId: d.location_id });
    if (d.workflow === 'completed' && d.completed_at && t - Date.parse(d.completed_at) <= RENOVATED_RECENT_DAYS * DAY)
      reasons.push({ badge: 'renove', text: `Projet terminé : ${d.title}`, locationId: d.location_id });
  }
  for (const p of f.projects) if (p.district_id === districtId && p.status === 'travaux')
    reasons.push({ badge: 'chantier', text: `Projet citoyen en travaux : ${p.title}` });
  for (const i of f.issues) if (inDistrict(i.district_id, i.location_id) && i.status === 'ongoing')
    reasons.push({ badge: 'chantier', text: `Intervention en cours : ${i.title}`, locationId: i.location_id });
  for (const c of f.crises) if (c.district_id === districtId && c.status !== 'terminee')
    reasons.push({ badge: 'crise', text: c.status === 'urgence' ? 'Crise en urgence dans le quartier' : 'Crise en cours de gestion' });
  for (const e of f.events) if (!e.personal && e.ongoing && inDistrict(e.district_id, e.location_id))
    reasons.push({ badge: 'anime', text: `Événement en cours : ${e.title}`, ...(e.location_id ? { locationId: e.location_id } : {}) });

  const severe = f.issues.filter(i => inDistrict(i.district_id, i.location_id) && i.status !== 'resolved' && i.severity >= NEGLECT_MIN_SEVERITY);
  const intervened = reasons.some(r => r.badge === 'chantier' || r.badge === 'renove');
  if (severe.length >= NEGLECT_MIN_ISSUES && !intervened)
    reasons.push({ badge: 'delaisse', text: `${severe.length} signalements graves sans intervention` });

  const badges = BADGE_PRIORITY.filter(b => reasons.some(r => r.badge === b));
  return { badges, main: badges[0] ?? null, reasons };
}
