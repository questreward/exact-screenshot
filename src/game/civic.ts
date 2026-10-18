import type { Tables } from '@/integrations/supabase/types';
import type { LifeLocation, LifeActivity } from './life-state';
export const ISSUE_CATEGORIES = ['Voirie','Propreté','Éclairage','Espaces verts','Transport','Logement étudiant','Sport','Culture'] as const;
export const ISSUE_STATUS: Record<string,string> = { reported:'Signalé',identified:'Identifié',studying:'En étude',ongoing:'En cours',resolved:'Résolu' };
export const CIVIC_LOCATION_STATE: Record<string,string> = { normal:'',travaux:'En travaux',renove:'Rénové',projet:'Projet municipal',accueil:'Accueil citoyen' };
export type Institution = Tables<'institutions'> & { location:LifeLocation };
export type PublicIssue = Tables<'public_issues'> & { location:LifeLocation; district_name:string; institution_name:string; history:Tables<'issue_history'>[] };
export type ConsultationOption = Tables<'consultation_options'> & { votes:number | null };
export type Consultation = Tables<'consultations'> & { institution_name:string; participant_count:number; my_option_id:string|null; options:ConsultationOption[] };
export type Decision = Tables<'public_decisions'> & { location:LifeLocation; institution_name:string };
export type CivicEvent = Tables<'organization_events'> & { organization_name:string; location:LifeLocation; member:boolean; activity:LifeActivity|null };
export type CivicState = { world_now:string; city_id:string;city_name:string;engagement:number;settings:Tables<'civic_settings'>;counts:{consultations:number;reports:number;events:number;organizations:number};institutions:Institution[];issues:PublicIssue[];reports:Tables<'citizen_reports'>[];consultations:Consultation[];decisions:Decision[];events:CivicEvent[] };
export function consultationOpen(c:Pick<Consultation,'status'|'starts_at'|'ends_at'>,now:string) { return c.status==='open' && Date.parse(now)>=Date.parse(c.starts_at) && Date.parse(now)<Date.parse(c.ends_at); }
export function consultationWinner(options:ConsultationOption[]) { return options.filter(o=>(o.votes ?? 0)>0).sort((a,b)=>(b.votes??0)-(a.votes??0)||a.sort_order-b.sort_order)[0] ?? null; }