import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Construction, Sparkles, PartyPopper, CloudOff } from "lucide-react";
import { districtFactsQuery, worldEventsQuery } from "@/services/game";
import { districtStatus, DISTRICT_BADGE_LABEL, type DistrictBadge, type DistrictStatus as Status } from "@/game/districts-state";
import { displayPhase } from "@/game/events";

export const BADGE_ICON: Record<DistrictBadge, typeof Construction> = { chantier: Construction, renove: Sparkles, crise: AlertTriangle, anime: PartyPopper, delaisse: CloudOff };

/** Returns a per-district status lookup for the city; empty while loading. */
export function useDistrictStatuses(cityId: string): (districtId: string) => Status | null {
  const { data: facts } = useQuery(districtFactsQuery(cityId));
  const { data: ev } = useQuery(worldEventsQuery);
  if (!facts) return () => null;
  const now = ev?.now ?? new Date().toISOString();
  const events = (ev?.events ?? []).filter(e => e.city_id === cityId).map(e => ({ id: e.id, title: e.title, district_id: e.district_id, location_id: e.location_id, personal: e.personal, ongoing: displayPhase(e, now) === 'en_cours' }));
  return id => districtStatus(id, { ...facts, events }, now);
}

export function DistrictBadges({ status, small }: { status: Status | null; small?: boolean }) {
  if (!status?.badges.length) return small ? null : <p className="text-xs text-muted-foreground">Quartier calme en ce moment.</p>;
  return <span className="flex flex-wrap gap-1.5">{status.badges.map(b => { const Icon = BADGE_ICON[b]; return <span key={b} className={`district-chip chip-${b} inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium`}><Icon className="h-3.5 w-3.5" />{DISTRICT_BADGE_LABEL[b]}</span>; })}</span>;
}

export function DistrictReasons({ status, onLocation, children }: { status: Status | null; onLocation: (id: string) => void; children?: React.ReactNode }) {
  if (!status) return null;
  return <section className="mb-5 space-y-2 rounded-lg border border-border bg-surface p-3">
    <h3 className="text-sm font-semibold">État du quartier</h3>
    <DistrictBadges status={status} />
    {status.reasons.length > 0 && <ul className="space-y-1">{status.reasons.slice(0, 8).map((r, i) => <li key={i}>
      {r.locationId ? <button type="button" onClick={() => onLocation(r.locationId!)} className="min-h-11 w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted">{r.text} <span className="text-xs text-primary">· voir le lieu</span></button>
        : <p className="px-2 py-2 text-sm">{r.text}</p>}
    </li>)}</ul>}
    {status.badges.includes('delaisse') && <p className="text-xs text-muted-foreground">« Délaissé » est une estimation à partir des signalements, pas une mesure officielle.</p>}
    {children}
  </section>;
}
