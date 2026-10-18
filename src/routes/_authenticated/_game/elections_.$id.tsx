import {createFileRoute} from '@tanstack/react-router';
import {electionsQuery} from '@/services/game';
import {gameMeta} from '@/game/metadata';
import {ElectionsPage} from '@/components/game/ElectionsPage';
export const Route=createFileRoute('/_authenticated/_game/elections_/$id')({loader:async({context:{queryClient:q},params})=>{const s=await q.ensureQueryData(electionsQuery);return {name:s.elections.find(e=>e.id===params.id)?.name};},head:({loaderData})=>({meta:gameMeta(loaderData?.name??'Élection municipale','Programmes, campagne, bulletin privé et mandat municipal dans CIVITAS.')}),component:()=>{const {id}=Route.useParams();return <ElectionsPage id={id}/>;}});
