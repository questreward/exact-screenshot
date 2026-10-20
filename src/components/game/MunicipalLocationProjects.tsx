import {useSuspenseQuery} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {ArrowRight} from 'lucide-react';
import {locationProjectsQuery,formatMoney} from '@/services/game';
import {GOVERNANCE_WORKFLOW} from '@/game/governance';
import {newsDate} from '@/game/news';
import {Impact} from './GovernancePage';
import { recordedImpacts } from '@/game/living-city';
export function MunicipalLocationProjects({locationId}:{locationId:string}) {
  const {data:projects}=useSuspenseQuery(locationProjectsQuery(locationId));
  if(!projects.length)return null;
  return <section className="space-y-4 border-t border-border pt-4"><h3 className="font-semibold">Transformations du lieu</h3>{projects.map(p => {
    const actual = recordedImpacts(p.impact_real);
    return <div key={p.id} className="space-y-2 border-b border-border pb-3"><p className="break-words text-sm font-semibold">{p.title}</p><p className="text-xs text-primary">{GOVERNANCE_WORKFLOW[p.workflow??'']??'Projet'} · {formatMoney(p.cost??0)}</p><p className="text-xs text-muted-foreground">{p.duration_days} jours du monde{p.ends_at?` · Échéance ${newsDate(p.ends_at)}`:''}</p>
      {Object.keys(actual).length > 0 ? <><p className="text-xs text-success">Effets enregistrés</p><Impact values={actual}/></> : <p className="text-xs text-muted-foreground">Aucun effet enregistré pour le moment.</p>}
      <p className="text-xs text-muted-foreground">Impacts prévus</p><Impact values={recordedImpacts(p.impact_expected)}/>
    </div>;
  })}<Button asChild variant="outline" className="min-h-11"><Link to="/mandat">Suivre les projets<ArrowRight/></Link></Button></section>;
}