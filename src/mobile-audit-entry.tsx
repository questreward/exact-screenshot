import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameShell } from '@/components/game/GameShell';
import { MissionDossier } from '@/components/game/MissionDossier';
import { MissionScene } from '@/components/game/MissionScene';
import { Input } from '@/components/ui/input';
import { SECTIONS } from '@/game/navigation';
const q = new QueryClient({defaultOptions:{queries:{enabled:false,retry:false}}});
function Sample(){return <div className="space-y-4"><h1 className="text-2xl font-bold">Protection civile</h1><MissionScene job="protection_civile" title="Poste de secours" step={1} count={3} active /><MissionDossier mission={{day:'2026-10-20',title:'Poste de secours pendant un concert',job:'protection_civile',city_id:'lyon',status:'active',step_index:1,step_count:3,step:{text:'Personne blessée : bilan de la situation enregistrée.',choices:[{label:'Faire un bilan'}]},reputation_delta:null,energy_cost:null}}/><Input aria-label="Message de contrôle" placeholder="Message…" /></div>}
const root=createRootRoute({component:()=> <QueryClientProvider client={q}><GameShell/></QueryClientProvider>});
const children=[createRoute({getParentRoute:()=>root,path:'/auth',component:Sample}),...SECTIONS.map(s=>createRoute({getParentRoute:()=>root,path:'/'+s.id,component:Sample})),createRoute({getParentRoute:()=>root,path:'/tableau-de-bord',component:Sample})];
const router=createRouter({routeTree:root.addChildren(children)});
const target=document.createElement('div');document.body.replaceChildren(target);createRoot(target).render(<RouterProvider router={router}/>);
