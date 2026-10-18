import {createFileRoute} from '@tanstack/react-router';
import {electionsQuery} from '@/services/game';
import {gameMeta} from '@/game/metadata';
import {ElectionsPage} from '@/components/game/ElectionsPage';
export const Route=createFileRoute('/_authenticated/_game/elections')({head:()=>({meta:gameMeta('Élections municipales','Candidatures, campagnes et résultats des élections municipales fictives de CIVITAS.')}),loader:({context:{queryClient:q}})=>q.ensureQueryData(electionsQuery),component:ElectionsPage});
