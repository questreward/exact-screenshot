import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Appearance } from "@/game/appearance";
import type { PathId } from "@/game/rules";
import type { LifeState } from "@/game/life-state";
import type { SocialState, Organization } from "@/game/social";
import type { NewsState } from "@/game/news";
import type { CivicState } from "@/game/civic";
import type { PoliticalState } from "@/game/politics";
import type { ElectionState, Program } from "@/game/elections";
import type { GovernanceState } from "@/game/governance";

// All data access lives here. Reads go through RLS; sensitive writes go through
// the secured create_character database function.

export const citiesQuery = queryOptions({
  queryKey: ["cities"],
  staleTime: Infinity,
  queryFn: async () => {
    const { data, error } = await supabase.from("cities").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const pathsQuery = queryOptions({
  queryKey: ["paths"],
  staleTime: Infinity,
  queryFn: async () => {
    const { data, error } = await supabase.from("starting_paths").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const characterQuery = queryOptions({
  queryKey: ["character"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("characters")
      .select("*, city:cities(name, region), path:starting_paths(name)")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const bankQuery = queryOptions({
  queryKey: ["bank"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, label, balance, transactions(id, amount, label, created_at)")
      .order("created_at", { referencedTable: "transactions", ascending: false })
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },
});

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    return data;
  },
});

export const worldQuery = queryOptions({
  queryKey: ["world"],
  queryFn: async () => {
    const { data, error } = await supabase.from("world_state").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_settings").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});

export async function createCharacter(input: {
  firstName: string; lastName: string; age: number; cityId: string; pathId: PathId; appearance: Appearance;
}) {
  const { data, error } = await supabase.rpc("create_character", {
    _first_name: input.firstName,
    _last_name: input.lastName,
    _age: input.age,
    _city_id: input.cityId,
    _path_id: input.pathId,
    _appearance: input.appearance,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function saveSettings(userId: string, patch: {
  language?: string; notifications_enabled?: boolean; reduced_motion?: boolean; profile_public?: boolean; news_personalized?: boolean; news_notifications?: boolean;
}) {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const positionQuery = queryOptions({
  queryKey: ["position"],
  queryFn: async () => {
    const { data, error } = await supabase.from("character_positions")
      .select("*, city:cities(name), district:districts(name), location:locations(name, kind, map_x, map_y)").maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const districtsQuery = (cityId: string) => queryOptions({
  queryKey: ["districts", cityId], staleTime: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.from("districts").select("*").eq("city_id", cityId).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const locationsQuery = (districtId: string) => queryOptions({
  queryKey: ["locations", districtId], staleTime: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.from("locations").select("*").eq("district_id", districtId).order("name");
    if (error) throw error;
    return data;
  },
});

export const spacesQuery = (locationId: string) => queryOptions({
  queryKey: ["spaces", locationId], staleTime: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.from("location_spaces").select("*").eq("location_id", locationId);
    if (error) throw error;
    return data;
  },
});

export const weatherQuery = (cityId: string) => queryOptions({
  queryKey: ["weather", cityId], staleTime: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.from("city_weather").select("*").eq("city_id", cityId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const clockQuery = queryOptions({
  queryKey: ["world-clock"], refetchInterval: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("world_clock");
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data) || typeof data["world_now"] !== "string") throw new Error("Horloge indisponible");
    return { anchor: data["world_now"], speed: Number(data["time_speed"] ?? 1), season: String(data["season"] ?? ""), receivedAt: Date.now() };
  },
});

export async function moveCharacter(locationId: string) {
  const { data, error } = await supabase.rpc("move_character", { _location_id: locationId });
  if (error) throw new Error(error.message);
  return data;
}

export const lifeQuery = queryOptions({
  queryKey: ["daily-life"], staleTime: 0, refetchInterval: 10000,
  queryFn: async (): Promise<LifeState> => {
    const { data, error } = await supabase.rpc("daily_life_state");
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object" || Array.isArray(data) || !data["character"] || !Array.isArray(data["activities"])) throw new Error("Vie quotidienne indisponible");
    return data as unknown as LifeState;
  },
});
export async function enrollStudies(fieldId: string) {
  const { error } = await supabase.rpc("enroll_studies", { _field_id: fieldId });
  if (error) throw new Error(error.message);
}
export async function applyJob(jobId: string) {
  const { error } = await supabase.rpc("apply_job", { _job_id: jobId });
  if (error) throw new Error(error.message);
}
export async function startLifeActivity(input: { type?: string; activityId?: string; targetLocationId?: string }) {
  const { data, error } = await supabase.rpc("start_life_activity", {
    ...(input.type ? { _type: input.type } : {}), ...(input.activityId ? { _activity_id: input.activityId } : {}), ...(input.targetLocationId ? { _target_location_id: input.targetLocationId } : {}),
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function cancelLifeActivity(activityId: string) {
  const { error } = await supabase.rpc("cancel_life_activity", { _activity_id: activityId });
  if (error) throw new Error(error.message);
}
export async function payHousing() {
  const { error } = await supabase.rpc("pay_housing");
  if (error) throw new Error(error.message);
}
export const socialQuery = queryOptions({
  queryKey: ['social'], staleTime: 0, refetchInterval: 10000,
  queryFn: async (): Promise<SocialState> => {
    const { data, error } = await supabase.rpc('social_state');
    if (error) throw new Error(error.message);
    return data as unknown as SocialState;
  },
});
export const organizationsQuery = (cityId: string) => queryOptions({
  queryKey: ['organizations', cityId], staleTime: 0,
  queryFn: async (): Promise<Organization[]> => {
    const { data, error } = await supabase.rpc('organization_directory', { _city_id: cityId });
    if (error) throw new Error(error.message);
    return data as unknown as Organization[];
  },
});
export async function interactSocial(input: { npcId: string; actionId: string }) {
  const { error } = await supabase.rpc('social_interact', { _npc_id: input.npcId, _action_id: input.actionId });
  if (error) throw new Error(error.message);
}
export async function changeMembership(input: { organizationId: string; join: boolean }) {
  const { error } = await supabase.rpc('change_membership', { _organization_id: input.organizationId, _join: input.join });
  if (error) throw new Error(error.message);
}
export async function reserveSocialEvent(eventId: string) {
  const { error } = await supabase.rpc('reserve_social_event', { _event_id: eventId });
  if (error) throw new Error(error.message);
}

export const newsQuery = queryOptions({
  queryKey: ["news"], staleTime: 0, refetchInterval: 60000,
  queryFn: async (): Promise<NewsState> => {
    const { data, error } = await supabase.rpc("news_state");
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data["articles"]) || typeof data["world_now"] !== "string") throw new Error("Actualités indisponibles");
    return data as unknown as NewsState;
  },
});
export async function markNewsRead(newsId: string) {
  const { error } = await supabase.rpc("mark_news_read", { _news_id: newsId });
  if (error) throw new Error(error.message);
}
export async function bookmarkNews(input: { newsId: string; saved: boolean }) {
  const { error } = await supabase.rpc("bookmark_news", { _news_id: input.newsId, _saved: input.saved });
  if (error) throw new Error(error.message);
}

export const civicQuery = queryOptions({
  queryKey: ['civic'], staleTime: 0, refetchInterval: 30000,
  queryFn: async ():Promise<CivicState> => {
    const {data,error}=await supabase.rpc('civic_state');
    if(error) throw new Error(error.message);
    if(!data || typeof data!=='object' || Array.isArray(data) || !Array.isArray(data['institutions'])) throw new Error('Ma Ville indisponible');
    return data as unknown as CivicState;
  },
});
export async function reportCivicIssue(input:{category:string;locationId:string;description:string}) {
  const {data,error}=await supabase.rpc('report_civic_issue',{_category:input.category,_location_id:input.locationId,_description:input.description});
  if(error) throw new Error(error.message); return data;
}
export async function participateConsultation(input:{consultationId:string;optionId:string}) {
  const {error}=await supabase.rpc('participate_consultation',{_consultation_id:input.consultationId,_option_id:input.optionId});
  if(error) throw new Error(error.message);
}
export const civicLocationsQuery=(cityId:string)=>queryOptions({queryKey:['civic-locations',cityId],queryFn:async()=>{
  const {data,error}=await supabase.from('locations').select('*').eq('city_id',cityId).eq('accessible',true).not('district_id','is',null).order('name');
  if(error) throw new Error(error.message); return data;
}});

// Bloc 7 — political state and secured political actions.
export const politicsQuery = queryOptions({
  queryKey: ['politics'], staleTime: 0, refetchInterval: 30000,
  queryFn: async (): Promise<PoliticalState> => {
    const { data, error } = await supabase.rpc('political_state');
    if (error) throw new Error(error.message);
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data['organizations'])) throw new Error('Politique indisponible');
    return data as unknown as PoliticalState;
  },
});
export async function setPoliticalOpinion(input: { topicId: string; stance: string }) {
  const { error } = await supabase.rpc('set_political_opinion', { _topic_id: input.topicId, _stance: input.stance });
  if (error) throw new Error(error.message);
}
export async function changePoliticalMembership(input: { organizationId: string; join: boolean }) {
  const { error } = await supabase.rpc('change_political_membership', { _organization_id: input.organizationId, _join: input.join });
  if (error) throw new Error(error.message);
}
export async function reservePoliticalEvent(eventId: string) {
  const { error } = await supabase.rpc('reserve_political_event', { _event_id: eventId });
  if (error) throw new Error(error.message);
}

export const electionsQuery=queryOptions({queryKey:['elections'],staleTime:0,refetchInterval:30000,queryFn:async():Promise<ElectionState>=>{
  const {data,error}=await supabase.rpc('election_state');
  if(error)throw new Error(error.message);
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data['elections']))throw new Error('Élections indisponibles');
  return data as unknown as ElectionState;
}});
export async function submitCandidacy(input:{electionId:string;organizationId?:string}){const {data,error}=await supabase.rpc('submit_candidacy',{_election_id:input.electionId,...(input.organizationId?{_organization_id:input.organizationId}:{})});if(error)throw new Error(error.message);return data;}
export async function saveCandidateProgram(input:{candidacyId:string;slogan:string;program:Program}){const {error}=await supabase.rpc('save_candidate_program',{_candidacy_id:input.candidacyId,_slogan:input.slogan,_program:input.program as unknown as import('@/integrations/supabase/types').Json});if(error)throw new Error(error.message);}
export async function manageCampaign(input:{candidacyId:string;command:string;npcId?:string;role?:string}){const {error}=await supabase.rpc('manage_campaign',{_candidacy_id:input.candidacyId,_command:input.command,...(input.npcId?{_npc_id:input.npcId}:{}),...(input.role?{_role:input.role}:{})});if(error)throw new Error(error.message);}
export async function startCampaignAction(input:{candidacyId:string;ruleId:string;choices?:Record<string,string>}){const {data,error}=await supabase.rpc('start_campaign_action',{_candidacy_id:input.candidacyId,_rule_id:input.ruleId,...(input.choices?{_choices:input.choices}:{})});if(error)throw new Error(error.message);return data;}
export async function castElectionVote(input:{electionId:string;candidacyId:string}){const {error}=await supabase.rpc('cast_election_vote',{_election_id:input.electionId,_candidacy_id:input.candidacyId});if(error)throw new Error(error.message);}

export const governanceQuery=queryOptions({queryKey:['governance'],staleTime:0,refetchInterval:30000,queryFn:async():Promise<GovernanceState>=>{
 const {data,error}=await supabase.rpc('governance_state');
 if(error)throw new Error(error.message);
 if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data['indicators']))throw new Error('Mandat indisponible');
 return data as unknown as GovernanceState;
}});
export async function setMandatePriorities(input:{mandateId:string;priorities:string[]}){const {error}=await supabase.rpc('set_mandate_priorities',{_mandate_id:input.mandateId,_priorities:input.priorities});if(error)throw new Error(error.message);}
export async function createMunicipalDossier(input:{mandateId:string;ruleId:string;issueId?:string}){const {data,error}=await supabase.rpc('create_municipal_dossier',{_mandate_id:input.mandateId,_rule_id:input.ruleId,...(input.issueId?{_issue_id:input.issueId}:{})});if(error)throw new Error(error.message);return data;}
export async function reserveGovernanceAction(input:{decisionId:string;command:string;groupId?:string;compromise?:boolean}){const {data,error}=await supabase.rpc('reserve_governance_action',{_decision_id:input.decisionId,_command:input.command,...(input.groupId?{_group_id:input.groupId}:{}),_compromise:input.compromise??false});if(error)throw new Error(error.message);return data;}
export async function openGovernanceConsultation(decisionId:string){const {data,error}=await supabase.rpc('open_governance_consultation',{_decision_id:decisionId});if(error)throw new Error(error.message);return data;}
export async function fundMunicipalProject(decisionId:string){const {error}=await supabase.rpc('fund_municipal_project',{_decision_id:decisionId});if(error)throw new Error(error.message);}
export async function abandonMunicipalDossier(decisionId:string){const {error}=await supabase.rpc('abandon_municipal_dossier',{_decision_id:decisionId});if(error)throw new Error(error.message);}
export async function reserveMunicipalEvent(decisionId:string){const {data,error}=await supabase.rpc('reserve_municipal_event',{_decision_id:decisionId});if(error)throw new Error(error.message);return data;}
export const locationProjectsQuery=(locationId:string)=>queryOptions({queryKey:['municipal-projects',locationId],queryFn:async()=>{const {data,error}=await supabase.from('public_decisions').select('id,title,workflow,cost,duration_days,ends_at,impact_expected,impact_real').eq('location_id',locationId).not('mandate_id','is',null).order('decided_at',{ascending:false});if(error)throw new Error(error.message);return data;}});
