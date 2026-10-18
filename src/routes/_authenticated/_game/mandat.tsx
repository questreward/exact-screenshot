import {createFileRoute} from '@tanstack/react-router';
import {governanceQuery,clockQuery} from '@/services/game';
import {gameMeta} from '@/game/metadata';
import {GovernancePage} from '@/components/game/GovernancePage';
export const Route=createFileRoute('/_authenticated/_game/mandat')({head:()=>({meta:gameMeta('Mandat municipal','Conseil municipal, projets, budget fictif et conséquences locales dans CIVITAS.')}),loader:({context:{queryClient:q}})=>Promise.all([q.ensureQueryData(governanceQuery),q.ensureQueryData(clockQuery)]),component:GovernancePage});