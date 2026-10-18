import {useSuspenseQuery} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {ArrowRight} from 'lucide-react';
import {locationProjectsQuery,formatMoney} from '@/services/game';
import {GOVERNANCE_WORKFLOW} from '@/game/governance';
import {newsDate} from '@/game/news';
import {Impact} from './GovernancePage';
function deltas(value:unknown):Record<string,number>{if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter((e):e is [string,number]=>typeof e[1]==='number'));}
export function MunicipalLocationProjects({locationId}:{locationId:string}){const {data:projects}=useSuspenseQuery(locationProjectsQuery(locationId));if(!projects.length)return null;return <section className="space-y-4 border-t border-border pt-4"><h3 className="font-semibold">Projets municipaux</h3>{projects.map(p=><div key={p.id} className="space-y-2 border-b border-border pb-3"><p className="text-sm font-semibold">{p.title}</p><p className="text-xs text-primary">{GOVERNANCE_WORKFLOW[p.workflow??'']??'Projet'} · {formatMoney(p.cost??0)}</p><p className="text-xs text-muted-foreground">{p.duration_days} jours du monde{p.ends_at?` · Échéance ${newsDate(p.ends_at)}`:''}</p><Impact values={deltas(p.impact_real)}/><p className="text-xs text-muted-foreground">Impacts prévus</p><Impact values={deltas(p.impact_expected)}/></div>)}<Button asChild variant="outline"><Link to="/mandat">Suivre les projets<ArrowRight/></Link></Button></section>;}