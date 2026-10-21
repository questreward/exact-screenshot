import { Suspense, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CITY_CENTER, FRANCE_VIEW, districtCenter, realPlace } from "@/game/real-places";
import type { RealMarker } from "./RealMap";
import { RealMapBox, useRealMapReady } from "./RealMapBox";

import { BonhommeG } from "./Bonhomme";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ArrowLeft, LocateFixed, MapPin, Minus, Plus, Lock, Footprints, LoaderCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { citiesQuery, districtsQuery, locationsQuery, positionQuery, spacesQuery, moveCharacter, worldEventsQuery, enterLocationSpace, leaveLocationSpace, locationPresenceQuery } from "@/services/game";
import { locationType, movementAllowed } from "@/game/world";
import type { Tables } from "@/integrations/supabase/types";
import { WorldClock, useWorldClock } from "./WorldClock";
import worldSquare from "@/assets/world-square.jpg";
import { DailyActions } from "./LifeControls";
import { TransportControl } from "./TransportControl";
import { SocialContacts } from "./SocialContacts";
import { CIVIC_LOCATION_STATE } from "@/game/civic";
import { MunicipalLocationProjects } from './MunicipalLocationProjects';
import { LocationEvents } from './EventsPage';
import { markersByLocation } from "@/game/events";
import { isCurrentPlace } from '@/game/living-city';
import { PlaceAtmosphere, PublicPlaceLife } from './LivingLocation';
import { BADGE_ICON, DistrictBadges, DistrictReasons, useDistrictStatuses } from './DistrictStatus';
import { DISTRICT_BADGE_LABEL } from '@/game/districts-state';
import { DistrictGauges } from './DistrictGauges';

export function WorldMap({ initialCity, initialDistrict, initialLocation, initialFrance = false }: { initialCity?: string | undefined; initialDistrict?: string | undefined; initialLocation?: string | undefined; initialFrance?: boolean }) {
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: position } = useSuspenseQuery(positionQuery);
  const [cityId, setCityId] = useState(initialCity ?? position?.city_id ?? cities[0]?.id ?? "paris");
  const [districtId, setDistrictId] = useState(initialDistrict ?? position?.district_id);
  const [france, setFrance] = useState(initialFrance);
  const city = cities.find(c => c.id === cityId);
  const { phase } = useWorldClock();
  const realReady = useRealMapReady();
  const selectCity = (id: string) => { setCityId(id); setDistrictId(undefined); setFrance(false); };
  if (!city) return <p>Ville introuvable.</p>;
  return <div className="space-y-5 animate-rise">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="mb-1 text-xs uppercase tracking-wider text-primary">CIVITAS · {france ? "Le monde" : "Votre environnement"}</p>
        <h1 className="text-3xl font-bold">{france ? "France" : city.name}</h1></div>
      <Button variant="outline" onClick={() => { setFrance(!france); }}>{france ? <ArrowLeft /> : <MapPin />}{france ? "Retour à la ville" : "Carte de France"}</Button>
    </div>
    <Suspense fallback={<p className="text-sm text-muted-foreground">Horloge…</p>}><WorldClock cityId={city.id} /></Suspense>
    {!france && position?.city_id !== city.id && <p className="flex items-center gap-2 border-l-2 border-primary bg-primary/10 p-3 text-sm"><MapPin className="h-4 w-4 shrink-0" /> Ville consultée · pour venir, prenez le train ou le car depuis votre ville.</p>}
    {france ? <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      {realReady ? <RealMapBox viewKey="france" center={FRANCE_VIEW.at} zoom={FRANCE_VIEW.zoom}
        markers={cities.flatMap(c => { const v = CITY_CENTER[c.id]; return v ? [{ id: c.id, at: v.at, label: c.name, active: position?.city_id === c.id, onClick: () => selectCity(c.id) }] : []; })} /> :
      <MapSurface phase={phase} resetKey="france">
        <svg viewBox="0 0 800 700" role="img" aria-label="Carte de France stylisée" className="world-svg">
          <path className="world-land" d="M250 125 L360 90 L475 60 L525 140 L650 210 L625 325 L580 420 L660 515 L575 610 L425 575 L325 620 L210 550 L190 400 L105 315 L130 240 L255 220 Z" />
          <path className="world-road" d="M450 145 L425 265 L553 435 L590 567 M425 265 L286 468" />
          {cities.map(c => <g key={c.id} transform={`translate(${Number(c.map_x)*7+30},${Number(c.map_y)*6.1+40})`}>
            <MapMarker label={c.name} active={position?.city_id === c.id} onClick={() => selectCity(c.id)} />
          </g>)}
        </svg>
      </MapSurface>}
      <div><h2 className="mb-3 text-lg font-semibold">Les villes</h2><div className="divide-y divide-border">{cities.map(c => <Button key={c.id} variant="ghost" className="h-auto min-h-16 w-full justify-start whitespace-normal rounded-none px-2 py-3 text-left" onClick={() => selectCity(c.id)}>
        <MapPin className="shrink-0 text-primary" /><span><span className="block font-semibold">{c.name}</span><span className="block text-xs font-normal text-muted-foreground">{position?.city_id === c.id ? "Votre ville actuelle" : c.region}</span></span>
      </Button>)}</div></div>
    </div> : <Suspense fallback={<MapLoading />}><CityMap key={city.id} city={city} selectedDistrict={districtId} initialLocation={initialLocation} onDistrict={setDistrictId} phase={phase} realReady={realReady} /></Suspense>}
  </div>;
}

function MapLoading() { return <div className="flex min-h-96 items-center justify-center gap-3 bg-surface"><LoaderCircle className="animate-spin" /> Chargement de la carte…</div>; }

function MapSurface({ children, phase, resetKey }: { children: React.ReactNode; phase: string; resetKey: string }) {
  return <div className="world-map relative min-w-0 overflow-hidden rounded-lg border border-border" data-phase={phase}>
    <TransformWrapper key={resetKey} minScale={0.7} maxScale={3} initialScale={1} centerOnInit wheel={{ step: 0.08 }} doubleClick={{ disabled: true }}>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <TransformComponent wrapperClass="world-map-viewport" contentClass="world-map-content">{children}</TransformComponent>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <Button size="icon" variant="secondary" onClick={() => zoomIn()} aria-label="Agrandir la carte" title="Agrandir la carte"><Plus /></Button>
          <Button size="icon" variant="secondary" onClick={() => zoomOut()} aria-label="Réduire la carte" title="Réduire la carte"><Minus /></Button>
          <Button size="icon" variant="secondary" onClick={() => resetTransform()} aria-label="Recentrer la carte" title="Recentrer la carte"><LocateFixed /></Button>
        </div>
      </>}
    </TransformWrapper>
  </div>;
}

function MapMarker({ label, active, selected, onClick, icon: Icon = MapPin, events = 0, onEvents }: { label: string; active?: boolean; selected?: boolean; onClick: () => void; icon?: typeof MapPin; events?: number; onEvents?: () => void }) {
  return <g role="button" tabIndex={0} aria-label={label} onClick={e => { e.stopPropagation(); onClick(); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} className={`world-marker ${active ? "is-player" : ""} ${selected ? "is-selected" : ""}`}>
    <circle r="40" className="marker-hit" />
    {active && <circle r="30" className="marker-pulse" />}
    <circle r="20" className="marker-body" />
    <Icon x={-10} y={-10} width={20} height={20} className="marker-icon" />
    <rect x={-105} y={27} width={210} height={26} rx={4} className="marker-caption" />
    <text textAnchor="middle" y={45} className="marker-label">{label}</text>
    {events > 0 && onEvents && <g role="button" tabIndex={0} aria-label={events > 1 ? `${events} événements : ${label}` : `Événement : ${label}`} data-testid="event-marker" className="event-badge" transform="translate(20,-22)" onClick={e => { e.stopPropagation(); onEvents(); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onEvents(); } }}>
      <circle r="16" className="event-badge-hit" /><circle r="12" className="event-badge-body" /><text textAnchor="middle" y={5} className="event-badge-label">{events > 1 ? events : "!"}</text>
    </g>}
  </g>;
}

function CityMap({ city, selectedDistrict, initialLocation, onDistrict, phase, realReady }: { city: Tables<"cities">; selectedDistrict?: string | undefined; initialLocation?: string | undefined; onDistrict: (id?: string) => void; phase: string; realReady: boolean }) {
  const { data: districts } = useSuspenseQuery(districtsQuery(city.id));
  const { data: position } = useSuspenseQuery(positionQuery);
  const selected = districts.find(d => d.id === selectedDistrict);
  const statusOf = useDistrictStatuses(city.id);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(initialLocation);
  const districtSelect = (id?: string) => { onDistrict(id); setSelectedLocation(undefined); };
  const playerHere = position?.city_id === city.id;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{city.name}{selected ? ` / ${selected.name}` : " / Quartiers"}</p>
      <div className="flex gap-1">
        {selected && <Button variant="ghost" onClick={() => districtSelect(undefined)}><ArrowLeft /> Ville</Button>}
        {playerHere && <Button variant="ghost" onClick={() => { districtSelect(position.district_id); setSelectedLocation(position.location_id); }}><LocateFixed /> Ma position</Button>}
      </div>
    </div>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {realReady ? <RealCityMap city={city} districts={districts} selected={selected} positionId={playerHere ? position?.location_id : undefined} positionDistrict={playerHere ? position?.district_id : undefined} selectedLocation={selectedLocation} onDistrict={districtSelect} onLocation={setSelectedLocation} /> :
        <MapSurface phase={phase} resetKey={selected?.id ?? city.id}>
          <svg viewBox="0 0 900 760" role="img" aria-label={`Carte de ${selected?.name ?? city.name}`} className="world-svg">
            <defs><pattern id="blocks" width="65" height="65" patternUnits="userSpaceOnUse"><rect x="8" y="8" width="46" height="46" rx="4" className="world-block" /></pattern></defs>
            <rect x="15" y="15" width="870" height="730" rx="12" fill="url(#blocks)" />
            <path className="world-river" d="M-20 150 C160 310 235 145 420 295 S640 400 925 595" />
            <path className="world-road" d="M40 510 L240 510 L435 300 L700 225 M240 510 L695 580 M435 300 L695 580" />
            <path className="world-park" d="M85 585 Q130 550 180 590 L175 690 L75 690 Z M700 65 L820 65 L820 135 L700 135 Z" />
            {districts.filter(d => !selected || d.id === selected.id).map(d => { const st = statusOf(d.id); const MainIcon = st?.main ? BADGE_ICON[st.main] : null; return <g key={d.id} transform={`translate(${selected ? 450 : Number(d.map_x)*8+40},${selected ? 380 : Number(d.map_y)*6.8+20})`}>
              <rect x="-115" y="-80" width="230" height="160" rx="16" className={`world-district ${st?.main ? `district-${st.main}` : ""} ${d.id === selected?.id ? "district-selected" : ""}`} />
              {!selected && MainIcon && st?.main && <g transform="translate(-95,-62)" aria-label={DISTRICT_BADGE_LABEL[st.main]}><circle r="15" className={`district-icon-bg chip-${st.main}`} /><MainIcon x={-9} y={-9} width={18} height={18} className="district-icon" /></g>}
              {!selected && <MapMarker label={d.name} active={playerHere && position?.district_id === d.id} onClick={() => districtSelect(d.id)} />}
              {[0, 1, phase === "nuit" ? -1 : 2].filter(i => i >= 0).map(i => <g key={i} className="bh-wander" style={{ animationDelay: `${i * 1.3}s`, animationDuration: `${7 + i * 2}s` }}><g transform={`translate(${-70 + i * 50},${selected ? 40 : 20}) scale(${selected ? 0.9 : 0.55})`}><BonhommeG seed={`${d.id}-${i}`} mood={i === 1 ? "talk" : "walk"} delay={i * 0.3} /></g></g>)}
              {selected && <text y="-210" textAnchor="middle" className="district-label">{d.name}</text>}
            </g>; })}
            {selected && <Suspense fallback={null}><LocationMarkers district={selected} positionId={playerHere ? position?.location_id : undefined} selectedId={selectedLocation} onSelect={setSelectedLocation} /></Suspense>}
            {playerHere && !selected && <text x="30" y="730" className="district-label">● {position?.district?.name} — {position?.location?.name}</text>}
          </svg>
        </MapSurface>}
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Votre position {playerHere ? `· ${position?.location?.name}` : `· ${position?.city?.name ?? "—"}`}</p>
      </div>
      <div className="min-w-0">
        {selected ? <><DistrictReasons status={statusOf(selected.id)} onLocation={setSelectedLocation}><DistrictGauges cityId={city.id} districtId={selected.id} /></DistrictReasons><Suspense fallback={<p>Chargement des lieux…</p>}><LocationList district={selected} city={city} selectedId={selectedLocation} onSelect={setSelectedLocation} /></Suspense></> : <>
          <h2 className="mb-2 text-lg font-semibold">Quartiers de {city.name}</h2><p className="mb-4 text-sm text-muted-foreground">{city.description}</p>
          <div className="divide-y divide-border">{districts.map(d => <Button key={d.id} variant="ghost" className="h-auto min-h-20 w-full justify-start whitespace-normal rounded-none px-2 py-4 text-left" onClick={() => districtSelect(d.id)} disabled={!d.available}>
            <MapPin className="shrink-0 text-primary" /><span className="min-w-0"><span className="block">{d.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{d.description}</span><span className="mt-2 block"><DistrictBadges status={statusOf(d.id)} small /></span></span>
          </Button>)}</div>
        </>}
      </div>
    </div>
  </div>;
}

function RealCityMap({ city, districts, selected, positionId, positionDistrict, selectedLocation, onDistrict, onLocation }: { city: Tables<"cities">; districts: Tables<"districts">[]; selected?: Tables<"districts"> | undefined; positionId?: string | undefined; positionDistrict?: string | undefined; selectedLocation?: string | undefined; onDistrict: (id?: string) => void; onLocation: (id: string) => void }) {
  const lists = useQueries({ queries: districts.map(d => locationsQuery(d.id)) });
  const byDistrict = new Map(districts.map((d, i) => [d.id, lists[i]?.data ?? []]));
  const view = CITY_CENTER[city.id] ?? { at: FRANCE_VIEW.at, zoom: 12 };
  let markers: RealMarker[]; let center = view.at; let zoom = view.zoom;
  if (selected) {
    const locs = byDistrict.get(selected.id) ?? [];
    center = districtCenter(city.id, locs.map(l => l.kind)) ?? center; zoom = 15.3;
    markers = locs.flatMap(l => { const r = realPlace(city.id, l.kind); return r ? [{ id: l.id, at: r.at, label: l.name, sub: r.real, active: positionId === l.id, selected: selectedLocation === l.id, onClick: () => onLocation(l.id) }] : []; });
  } else {
    // Tous les lieux (parcs, commerces, gare…) accessibles directement depuis la carte de la ville.
    markers = districts.filter(d => d.available).flatMap(d => (byDistrict.get(d.id) ?? []).flatMap(l => { const r = realPlace(city.id, l.kind); return r ? [{ id: l.id, at: r.at, label: l.name, sub: `${d.name} · ${r.real}`, active: positionId === l.id, onClick: () => { onDistrict(d.id); onLocation(l.id); } }] : []; }));
  }
  return <RealMapBox viewKey={selected?.id ?? city.id} center={center} zoom={zoom} markers={markers} />;
}

function LocationMarkers({ district, positionId, selectedId, onSelect }: { district: Tables<"districts">; positionId?: string | undefined; selectedId?: string | undefined; onSelect: (id: string) => void }) {
  const { data: locations } = useSuspenseQuery(locationsQuery(district.id));
  const { data: ev } = useQuery(worldEventsQuery);
  const markers = markersByLocation(ev?.events ?? []);
  const openEvents = (id: string) => { onSelect(id); setTimeout(() => document.getElementById("evenements-lieu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400); };
  // The district detail projects persisted location coordinates into a local frame.
  return <g transform="translate(400,350)">{locations.map(l => {
    return <g key={l.id} transform={`translate(${(Number(l.map_x)-Number(district.map_x))*22},${(Number(l.map_y)-Number(district.map_y))*22})`}><MapMarker label={l.name} icon={locationType(l.kind).icon} active={positionId === l.id} selected={selectedId === l.id} onClick={() => onSelect(l.id)} events={markers.get(l.id)?.length ?? 0} onEvents={() => openEvents(l.id)} /></g>;
  })}</g>;
}

function LocationList({ district, city, selectedId, onSelect }: { district: Tables<"districts">; city: Tables<"cities">; selectedId?: string | undefined; onSelect: (id: string) => void }) {
  const { data: locations } = useSuspenseQuery(locationsQuery(district.id));
  const selected = locations.find(l => l.id === selectedId);
  return <div>
    <h2 className="mb-3 text-lg font-semibold">{district.name}</h2>
    <div className="mb-5 grid grid-cols-2 gap-2">{locations.map(l => {
      const Icon = locationType(l.kind).icon;
      return <Button key={l.id} variant={selected?.id === l.id ? "secondary" : "outline"} className="h-auto min-h-16 justify-start whitespace-normal px-3 py-3 text-left text-xs" onClick={() => onSelect(l.id)}><Icon className="shrink-0 text-primary" /><span>{l.name}</span></Button>;
    })}</div>
    {selected ? <Suspense fallback={<p>Chargement du lieu…</p>}><LocationPanel key={selected.id} location={selected} district={district} city={city} /></Suspense> : <p className="border-t border-border pt-4 text-sm text-muted-foreground">{locations.length} lieux · {district.description}</p>}
  </div>;
}

function LocationPanel({ location: l, district, city }: { location: Tables<"locations">; district: Tables<"districts">; city: Tables<"cities"> }) {
  const { data: p } = useSuspenseQuery(positionQuery);
  const { data: spaces } = useSuspenseQuery(spacesQuery(l.id));
  const q = useQueryClient();
  const move = useMutation({ mutationFn: () => moveCharacter(l.id), onSuccess: async () => { await Promise.all([q.invalidateQueries({ queryKey: ["position"] }), q.invalidateQueries({ queryKey: ["daily-life"] }), q.invalidateQueries({ queryKey: ["social"] }), q.invalidateQueries({ queryKey: ["location-presence"] })]); toast.success(`Vous êtes arrivé : ${l.name}`); }, onError: (error: Error) => toast.error(error.message) });
  const here = isCurrentPlace(p?.location_id, l.id);
  const allowed = p && movementAllowed(p.city_id, l, district.available, city.available);
  const { icon: Icon, label } = locationType(l.kind);
  return <article className="min-w-0 border-t border-border pt-4">
    <figure className="relative overflow-hidden rounded-lg">
      <img src={l.illustration ?? worldSquare} alt={`Ambiance illustrée · ${l.name}`} loading="lazy" width={1536} height={768} className="aspect-[2/1] w-full object-cover" />
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-overlay px-3 py-2 text-xs text-foreground"><span>Illustration · CIVITAS</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{here ? 'Vous êtes ici' : 'Lieu consulté'}</span></figcaption>
    </figure>
    <div className="space-y-4 py-4">
      <div><p className="mb-2 flex items-center gap-2 text-xs text-primary"><Icon className="h-4 w-4" /> {label}</p><h3 className="text-xl font-semibold">{l.name}</h3><p className="mt-1 text-xs text-muted-foreground">{city.name} · {district.name}</p></div>
      <p className="text-sm text-muted-foreground">{l.description}</p>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Ambiance du lieu…</p>}><PlaceAtmosphere cityId={city.id} /></Suspense>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Vie du lieu…</p>}><PublicPlaceLife cityId={city.id} locationId={l.id} /></Suspense>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Projets municipaux…</p>}><MunicipalLocationProjects locationId={l.id}/></Suspense>
      <Suspense fallback={null}><LocationEvents locationId={l.id} full/></Suspense>
      {l.civic_project && <div className="border-y border-border py-3"><p className="text-xs text-primary">{CIVIC_LOCATION_STATE[l.civic_state] ?? l.civic_state}</p><p className="mt-1 text-sm font-semibold">{l.civic_project}</p></div>}
      <dl className="space-y-2 border-y border-border py-3 text-xs"><div><dt className="text-muted-foreground">Accès</dt><dd className="mt-1">{l.opening_hours ?? "Horaires non définis"}</dd></div><div><dt className="text-muted-foreground">Statut</dt><dd className="mt-1">{here ? "Vous êtes ici" : l.accessible && district.available && city.available ? "Accessible" : "Inaccessible"}</dd></div></dl>
      <Button className="w-full" disabled={!allowed || here || move.isPending} onClick={() => move.mutate()}>{move.isPending ? <LoaderCircle className="animate-spin" /> : here ? <Check /> : <Footprints />}{move.isPending ? "Déplacement…" : here ? "Vous êtes ici" : "Se déplacer ici"}</Button>
      {p?.city_id !== city.id && <p className="text-xs text-muted-foreground">Pour venir ici, prenez le train à la Gare centrale ou le car à la Station de transport de votre ville.</p>}
      {spaces.map(s => <SpaceRow key={s.id} space={s} here={here} currentSpace={(p as { space_id?: string | null } | null)?.space_id ?? null} />)}
      <Suspense fallback={<p className="text-xs text-muted-foreground">Activités…</p>}><DailyActions locationId={l.id} selectedLocation={l} />{["gare","station"].includes(l.kind) && <TransportControl location={l} />}</Suspense>
      <PresentPeople locationId={l.id} here={here} />
      {here && <Suspense fallback={<p className="text-xs text-muted-foreground">Rencontres…</p>}><SocialContacts locationId={l.id}/></Suspense>}
    </div>
  </article>;
}

function PresentPeople({ locationId, here }: { locationId: string; here: boolean }) {
  const { data, isError } = useQuery(locationPresenceQuery(locationId));
  if (isError || !data) return null;
  return <section className="space-y-2 border-t border-border pt-3">
    <h4 className="text-sm font-semibold">Personnes présentes</h4>
    {data.length === 0 ? <p className="text-xs text-muted-foreground">Personne pour le moment.</p> :
      <ul className="space-y-2">{data.map(n => <li key={n.id} className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm">
        <span><span className="font-medium">{n.first_name} {n.last_name}</span>{n.profession && <span className="block text-xs text-muted-foreground">{n.profession}</span>}</span>
        {n.known && <span className="text-xs text-primary">Connu(e)</span>}
      </li>)}</ul>}
    {!here && data.length > 0 && <p className="text-xs text-muted-foreground">Rendez-vous sur place pour leur parler.</p>}
  </section>;
}
function SpaceRow({ space: s, here, currentSpace }: { space: Tables<"location_spaces">; here: boolean; currentSpace: string | null }) {
  const q = useQueryClient();
  const inside = currentSpace === s.id;
  const act = useMutation({ mutationFn: () => inside ? leaveLocationSpace() : enterLocationSpace(s.id), onSuccess: async () => { await q.invalidateQueries({ queryKey: ["position"] }); toast.success(inside ? `Vous êtes sorti : ${s.name}` : `Vous êtes entré : ${s.name}`); }, onError: (e: Error) => toast.error(e.message) });
  if (!s.accessible) return <div className="flex gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" /><span>{s.name}<br />Disponible dans une prochaine étape</span></div>;
  return <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><span className="text-sm">{s.name}{inside && <span className="block text-xs text-primary">Vous êtes à l’intérieur</span>}</span><Button variant={inside ? "secondary" : "outline"} className="h-11 shrink-0" disabled={!here || act.isPending} onClick={() => act.mutate()}>{inside ? "Sortir" : "Entrer"}</Button></div>;
}
