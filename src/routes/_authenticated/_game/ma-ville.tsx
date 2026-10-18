import { createFileRoute } from '@tanstack/react-router';
import { civicQuery,civicLocationsQuery,governanceQuery } from '@/services/game';
import { CivicPage } from '@/components/game/CivicPage';
import { gameMeta } from '@/game/metadata';
export const Route=createFileRoute('/_authenticated/_game/ma-ville')({
 head:()=>({meta:gameMeta('Ma Ville','Institutions, signalements, consultations et décisions locales dans CIVITAS.')}),
 loader:async({context:{queryClient:q}})=>{const s=await q.ensureQueryData(civicQuery);await Promise.all([q.ensureQueryData(civicLocationsQuery(s.city_id)),q.ensureQueryData(governanceQuery)]);},
 component:CivicPage,
});