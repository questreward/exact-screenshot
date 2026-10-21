import { createFileRoute, Link } from "@tanstack/react-router";
import { citiesQuery, clockQuery, positionQuery } from "@/services/game";
import { WorldMap } from "@/components/game/WorldMap";

export const Route = createFileRoute("/_authenticated/_game/carte")({
  validateSearch: (s: Record<string, unknown>): { city?: string | undefined; district?: string | undefined; location?: string | undefined; view?: string | undefined } => ({ city: typeof s["city"] === "string" ? s["city"] : undefined, district: typeof s["district"] === "string" ? s["district"] : undefined, location: typeof s["location"] === "string" ? s["location"] : undefined, view: s["view"] === "france" ? "france" : undefined }),
  head: () => ({ meta: [{ title: "Carte du monde — CIVITAS" }, { name: "description", content: "Explorez les villes, quartiers et lieux de CIVITAS et retrouvez votre position." }, { property: "og:title", content: "Carte du monde — CIVITAS" }, { property: "og:description", content: "Les cinq villes du monde CIVITAS, votre position et vos déplacements." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(citiesQuery), q.ensureQueryData(positionQuery), q.ensureQueryData(clockQuery)]),
  component: MapPage,
});
function MapPage() {
  const { city, district, location, view } = Route.useSearch();
  return <><Link to="/guide" className="mx-4 mt-3 flex min-h-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold">🧭 Je ne sais pas quoi faire : demander au guide</Link><WorldMap key={`${city ?? ''}:${district ?? ''}:${location ?? ''}:${view ?? ''}`} initialCity={city} initialDistrict={district} initialLocation={location} initialFrance={view === "france"} /></>;
}