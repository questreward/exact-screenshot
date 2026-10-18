import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Landmark,ArrowRight } from 'lucide-react';
import { civicQuery } from '@/services/game';
import { consultationOpen } from '@/game/civic';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
export function CivicSummary({profile=false}:{profile?:boolean}) {
 const {data:s}=useSuspenseQuery(civicQuery);
 const pending=s.reports.filter(r=>s.issues.some(i=>i.id===r.issue_id && i.status!=='resolved')).length;
 return <section className="space-y-3 border-y border-border py-5"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Landmark className="h-5 w-5 text-primary"/>{profile?'Engagement citoyen':'Ma Ville · '+s.city_name}</h2><Button asChild variant="ghost" size="icon" aria-label="Ouvrir Ma Ville"><Link to="/ma-ville"><ArrowRight/></Link></Button></div><p className="text-sm">Engagement citoyen <strong className="text-primary">{s.engagement} / 100</strong></p><Progress value={s.engagement} className="h-1.5"/>{profile?<dl className="grid grid-cols-2 gap-3 text-sm">{[['Consultations',s.counts.consultations],['Signalements',s.counts.reports],['Événements citoyens',s.counts.events],['Organisations citoyennes',s.counts.organizations]].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>:<p className="text-sm text-muted-foreground">{s.consultations.filter(c=>consultationOpen(c,s.world_now)).length} consultations en cours · {pending} signalements en traitement</p>}</section>;
}