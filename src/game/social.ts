import type { Tables } from '@/integrations/supabase/types';
import type { LifeLocation } from './life-state';
export const RELATION_LEVELS = [{ min: 80, label: 'Proche' }, { min: 50, label: 'Ami' }, { min: 25, label: 'Relation amicale' }, { min: 5, label: 'Connaissance' }, { min: 0, label: 'Inconnu' }];
export const relationLevel = (score: number) => RELATION_LEVELS.find(l => score >= l.min)?.label ?? 'Inconnu';
export const ORGANIZATION_TYPES: Record<string,string> = { student:'Association étudiante',culture:'Association culturelle',sport:'Association sportive',citizen:'Association citoyenne',professional:'Organisation professionnelle',charity:'Association caritative' };
export type SocialNpc = Tables<'social_npcs'> & { location: LifeLocation };
export type SocialRelation = Tables<'social_relations'> & { npc: SocialNpc; level: string };
export type SocialState = { world_now:string; stats:Tables<'social_stats'>; relations:SocialRelation[]; nearby:SocialNpc[]; memberships:Tables<'memberships'>[]; history:Tables<'social_interactions'>[]; rules:Tables<'social_rules'>[]; participations:Tables<'social_participations'>[] };
export type Organization = Tables<'organizations'> & { location:LifeLocation;city_name:string;member_count:number;members:{ first_name:string;last_name:string;role:string;fictional:boolean }[];events:(Tables<'organization_events'> & {participant_count:number})[] };
export function nextEventDate(now:string,hour:number) { const d=new Date(now); d.setUTCHours(hour,0,0,0); if(d.getTime()<new Date(now).getTime())d.setUTCDate(d.getUTCDate()+1); return d.toISOString(); }
