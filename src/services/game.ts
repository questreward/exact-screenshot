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
import type { EconomyState } from '@/game/economy';

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
    const { error: settlementError } = await supabase.rpc('personal_economy_state');
    if (settlementError) throw new Error(settlementError.message);
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
  refetchInterval: 15000,
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
  // The dashboard list must not share the structured world-events cache entry.
  queryKey: ["events", "summary"],
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
  const { data, error } = await supabase.rpc("pay_housing_attempt");
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Résultat du paiement indisponible');
  if (data['status'] === 'insufficient_funds') throw new Error('Solde insuffisant. Échec conservé, aucun débit.');
  if (data['status'] === 'already_paid') throw new Error('Logement déjà payé aujourd’hui. Aucun nouveau débit.');
  if (data['status'] !== 'paid') throw new Error('Paiement non enregistré');
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

export const economyQuery = queryOptions({ queryKey: ['economy'], staleTime: 0, refetchInterval: 10000, queryFn: async (): Promise<EconomyState> => {
  const { data, error } = await supabase.rpc('personal_economy_state');
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data['goals'])) throw new Error('Économie personnelle indisponible');
  return data as unknown as EconomyState;
} });
export async function economyAction(input: { command: string; requestId: string; input?: Record<string, unknown> }) {
  const { error } = await supabase.rpc('personal_economy_action', { _command: input.command, _request_id: input.requestId, _input: (input.input ?? {}) as import('@/integrations/supabase/types').Json });
  if (error) throw new Error(error.message);
}

export const adminQuery = queryOptions({ queryKey: ['admin'], staleTime: 0, refetchInterval: 15000, queryFn: async (): Promise<import('@/game/admin').AdminState> => {
  const { data, error } = await supabase.rpc('admin_state');
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data['procedures'])) throw new Error('Démarches indisponibles');
  return data as unknown as import('@/game/admin').AdminState;
} });
export async function adminAction(input: { command: string; requestId: string; input?: Record<string, unknown> }) {
  const { error } = await supabase.rpc('admin_action', { _command: input.command, _request_id: input.requestId, _input: (input.input ?? {}) as import('@/integrations/supabase/types').Json });
  if (error) throw new Error(error.message);
}

export const worldEventsQuery = queryOptions({ queryKey: ['events'], staleTime: 0, refetchInterval: 20000, queryFn: async (): Promise<import('@/game/events').EventsState> => {
  const { data, error } = await supabase.rpc('world_events_state');
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data['events'])) throw new Error('Événements indisponibles');
  return data as unknown as import('@/game/events').EventsState;
} });
export async function eventAction(input: { eventId: string; choice: 'participer' | 'ignorer' }) {
  const { error } = await supabase.rpc('world_event_action', { _event_id: input.eventId, _choice: input.choice });
  if (error) throw new Error(error.message);
}

export type TransportPreview = { base_minutes: number; delay_minutes: number; total_minutes: number; events: { id: string; title: string; minutes: number }[] };
export const transportPreviewQuery = (target: string) => queryOptions({ queryKey: ['transport-preview', target], staleTime: 0, enabled: !!target, queryFn: async (): Promise<TransportPreview> => {
  const { data, error } = await supabase.rpc('transport_delay_preview', { _target_location_id: target });
  if (error) throw new Error(error.message);
  return data as unknown as TransportPreview;
} });

// ---------- Bloc 13 : Messages, Civi, Monde ----------
export const communicationQuery = queryOptions({ queryKey: ['communication'], staleTime: 0, refetchInterval: 20000, queryFn: async (): Promise<import('@/game/communication').CommunicationState> => {
  const { data, error } = await supabase.rpc('communication_state');
  if (error) throw new Error(error.message);
  return data as unknown as import('@/game/communication').CommunicationState;
} });
export const threadsQuery = queryOptions({ queryKey: ['communication', 'threads'], staleTime: 0, queryFn: async (): Promise<import('@/game/communication').Thread[]> => {
  const { data, error } = await supabase.from('message_threads').select('id,npc_id,last_message_at,npc:social_npcs(first_name,last_name,location_id)').order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as import('@/game/communication').Thread[];
} });
export const messagesQuery = queryOptions({ queryKey: ['communication', 'messages'], staleTime: 0, queryFn: async (): Promise<import('@/game/communication').Message[]> => {
  const { data, error } = await supabase.from('messages').select('id,thread_id,sender,body,template_id,sent_at,read_at,replied_with,location_id').order('sent_at');
  if (error) throw new Error(error.message);
  return data as unknown as import('@/game/communication').Message[];
} });
export const messageTemplatesQuery = queryOptions({ queryKey: ['communication', 'templates'], staleTime: Infinity, queryFn: async () => {
  const [m, p] = await Promise.all([supabase.from('message_templates').select('id,trigger_kind,replies'), supabase.from('social_post_templates').select('id,category,body').eq('active', true)]);
  if (m.error) throw new Error(m.error.message); if (p.error) throw new Error(p.error.message);
  return { messages: m.data as unknown as { id: string; trigger_kind: string; replies: import('@/game/communication').Reply[] }[], posts: p.data };
} });
export const civiFeedQuery = queryOptions({ queryKey: ['communication', 'feed'], staleTime: 0, queryFn: async () => {
  const [posts, reactions] = await Promise.all([
    supabase.from('social_posts').select('id,author_kind,author_label,character_id,body,posted_at,news_id,event_id,city_id').order('posted_at', { ascending: false }).limit(60),
    supabase.from('social_post_reactions').select('post_id,kind'),
  ]);
  if (posts.error) throw new Error(posts.error.message); if (reactions.error) throw new Error(reactions.error.message);
  return { posts: posts.data as unknown as import('@/game/communication').Post[], reactions: reactions.data };
} });
export const worldOverviewQuery = queryOptions({ queryKey: ['world-overview'], staleTime: 0, refetchInterval: 30000, queryFn: async (): Promise<import('@/game/communication').WorldOverview> => {
  const { data, error } = await supabase.rpc('world_overview');
  if (error) throw new Error(error.message);
  return data as unknown as import('@/game/communication').WorldOverview;
} });
export async function readThread(threadId: string) { const { error } = await supabase.rpc('read_message_thread', { _thread: threadId }); if (error) throw new Error(error.message); }
export async function replyMessage(input: { messageId: string; replyId: string }) { const { error } = await supabase.rpc('reply_message', { _message: input.messageId, _reply: input.replyId }); if (error) throw new Error(error.message); }
export async function civiPost(input: { templateId: string; requestId: string }) { const { error } = await supabase.rpc('civi_post', { _template: input.templateId, _request_id: input.requestId }); if (error) throw new Error(error.message); }
export async function civiReact(input: { postId: string; kind: 'like' | 'share'; on: boolean }) { const { error } = await supabase.rpc('civi_react', { _post: input.postId, _kind: input.kind, _on: input.on }); if (error) throw new Error(error.message); }

export type IntercityRoute = { id: string; from_city_id: string; to_city_id: string; mode: "train" | "car"; duration_minutes: number; money_cost: number; energy_cost: number; departure_kind: string };
// Table et fonction installées sur le serveur autonome (absentes des types générés).
const untyped = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
export const intercityRoutesQuery = (cityId: string) => queryOptions({
  queryKey: ["intercity-routes", cityId],
  queryFn: async (): Promise<IntercityRoute[]> => {
    const { data, error } = await untyped.from("intercity_routes").select("*").eq("from_city_id", cityId).order("duration_minutes");
    if (error) throw new Error(error.message);
    return (data ?? []) as IntercityRoute[];
  },
});
export type PresentNpc = { id: string; first_name: string; last_name: string; profession: string | null; known: boolean };
export const locationPresenceQuery = (locationId: string) => queryOptions({
  queryKey: ["location-presence", locationId],
  queryFn: async (): Promise<PresentNpc[]> => {
    const { data, error } = await untyped.rpc("location_presence", { _location_id: locationId });
    if (error) throw new Error(error.message);
    return (data ?? []) as PresentNpc[];
  },
  refetchInterval: 60_000,
  retry: false,
});
export async function travelIntercity(input: { toCity: string; mode: "train" | "car" }) {
  const { data, error } = await untyped.rpc("travel_intercity", { _to_city: input.toCity, _mode: input.mode });
  if (error) throw new Error(error.message);
  return data;
}
export async function enterLocationSpace(spaceId: string) {
  const { data, error } = await untyped.rpc("enter_location_space", { _space_id: spaceId });
  if (error) throw new Error(error.message);
  return data;
}
export async function leaveLocationSpace() {
  const { data, error } = await untyped.rpc("leave_location_space", {});
  if (error) throw new Error(error.message);
  return data;
}

// P3 — Organisations fondées par les joueurs (règles et argent vérifiés côté base)
export type OrgKindChoice = "association" | "movement" | "party";
export type PlayerOrgState = {
  organization: { id: string; name: string; kind: string; city_id: string; description: string; symbol: string | null; reputation: number; influence: number; location_id: string };
  level: string;
  my_role: "founder" | "manager" | "member" | null;
  settings: { event_cost: number; player_weekly_dues: number };
  members: { character_id: string; name: string; role: string }[];
  npc_members: { id: string; name: string; profession: string | null }[];
  events: { id: string; title: string; start_hour: number; location_id: string }[];
  balance?: number;
  ledger?: { amount: number; kind: string; label: string; world_at: string }[];
};
export const playerOrgQuery = (orgId: string) => queryOptions({
  queryKey: ["organizations", "player-org", orgId],
  queryFn: async (): Promise<PlayerOrgState | null> => {
    const { data, error } = await untyped.rpc("org_state", { _org: orgId });
    if (error) return null;
    return data as PlayerOrgState;
  },
  retry: false,
});
export const cityLocationsQuery = (cityId: string) => queryOptions({
  queryKey: ["city-locations", cityId],
  queryFn: async (): Promise<{ id: string; name: string; kind: string }[]> => {
    const { data, error } = await supabase.from("locations").select("id, name, kind").eq("city_id", cityId).eq("accessible", true).order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});
export async function foundOrganization(input: { kind: OrgKindChoice; name: string; symbol: string; description: string; locationId: string }) {
  const { data, error } = await untyped.rpc("found_organization", { _kind: input.kind, _name: input.name, _symbol: input.symbol, _description: input.description, _location_id: input.locationId });
  if (error) throw new Error(error.message);
  return data as string;
}
export async function donateToOrganization(input: { orgId: string; amount: number }) {
  const { error } = await untyped.rpc("donate_to_organization", { _org: input.orgId, _amount: input.amount, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
}
export async function setMemberRole(input: { orgId: string; characterId: string; role: "manager" | "member" }) {
  const { error } = await untyped.rpc("set_member_role", { _org: input.orgId, _character: input.characterId, _role: input.role });
  if (error) throw new Error(error.message);
}
export async function createOrgEvent(input: { orgId: string; title: string; locationId: string; startHour: number }) {
  const { data, error } = await untyped.rpc("create_org_event", { _org: input.orgId, _title: input.title, _location_id: input.locationId, _start_hour: input.startHour, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data;
}

// P4 — Manifestations et journal télévisé
export type ProtestItem = { id: string; cause: string; description: string; starts_at: string; ends_at: string; status: "planned" | "success" | "failed"; player_count: number; npc_count: number; registered: number; joined: boolean; mine: boolean; organizer: string; location: { id: string; name: string }; consultation: string | null; option: string | null; decision: string | null; effects: string[] };
export type ProtestsState = { settings: { success_threshold: number; energy_cost: number; duration_minutes: number; min_age: number; pressure_percent: number }; age: number; city_id: string; now: string; protests: ProtestItem[]; consultations: { id: string; title: string; ends_at: string; options: { id: string; label: string }[] }[]; decisions: { id: string; title: string }[]; locations: { id: string; name: string; kind: string }[] };
export const protestsQuery = queryOptions({
  queryKey: ["protests", "state"],
  queryFn: async (): Promise<ProtestsState> => {
    const { data, error } = await untyped.rpc("protests_state", {});
    if (error) throw new Error(error.message);
    return data as ProtestsState;
  },
});
export async function callProtest(input: { cause: string; description: string; locationId: string; dayOffset: number; hour: number; consultationId?: string | undefined; optionId?: string | undefined; decisionId?: string | undefined }) {
  const { data, error } = await untyped.rpc("call_protest", { _cause: input.cause, _description: input.description, _location_id: input.locationId, _day_offset: input.dayOffset, _hour: input.hour, _consultation_id: input.consultationId || null, _option_id: input.optionId || null, _decision_id: input.decisionId || null });
  if (error) throw new Error(error.message);
  return data as string;
}
export async function joinProtest(protestId: string) {
  const { error } = await untyped.rpc("join_protest", { _protest: protestId });
  if (error) throw new Error(error.message);
}
export type TvSegment = { id: string; kind: "news" | "interview"; title: string; body: string; news_id: string | null; scene?: import('@/game/scenes').EventScene | undefined };
export type TvState = { date: string; city_id: string; local: TvSegment[]; national: TvSegment[]; invitations: { id: string; question: string; deadline: string; answer: string | null; scope: string }[] };
export const tvQuery = (cityId?: string) => queryOptions({
  queryKey: ["tv", "state", cityId ?? "mine"],
  queryFn: async (): Promise<TvState> => {
    const { data, error } = await untyped.rpc("tv_state", { _city: cityId ?? null });
    if (error) throw new Error(error.message);
    const state = data as TvState;
    const ids = [...state.local, ...state.national].filter(s => s.kind === 'news').map(s => s.id);
    if (ids.length === 0) return state;
    const scenes = await untyped.rpc('tv_scenes_state', { _segments: [...new Set(ids)].slice(0, 100) });
    // Before 0088 is installed, keep old editions working unchanged.
    if (scenes.error) {
      const code = 'code' in scenes.error ? scenes.error.code : undefined;
      if (code === 'PGRST202' || code === '42883' || /Could not find the function public\.tv_scenes_state/.test(scenes.error.message)) return state;
      throw new Error(scenes.error.message);
    }
    const projection = (scenes.data ?? {}) as Record<string, import('@/game/scenes').EventScene>;
    return { ...state, local: state.local.map(s => ({ ...s, scene: projection[s.id] })), national: state.national.map(s => ({ ...s, scene: projection[s.id] })) };
  },
});
export async function answerTvInterview(input: { interviewId: string; answer: string }) {
  const { error } = await untyped.rpc("answer_tv_interview", { _interview: input.interviewId, _answer: input.answer });
  if (error) throw new Error(error.message);
}

// P5a — Banque : prêt, découvert, note bancaire
export type BankInstallment = { id: string; number: number; due_at: string; principal_part: number; interest_part: number; late_fee: number; status: "pending" | "late" | "paid" | "seized" | "cancelled" };
export type BankState = {
  settings: { min_loan: number; max_loan: number; income_multiplier: number; minor_max_loan: number; min_months: number; max_months: number; overdraft_limit: number; overdraft_daily_fee: number; score_min: number; seizure_after: number; seizure_percent: number; late_fee_percent: number };
  age: number; now: string; balance: number; income: number; loan_cap: number; rate: number; overdraft_limit: number;
  profile: { score: number; overdraft_used: number; consecutive_missed: number; blocked: boolean };
  loan: null | { id: string; principal: number; months: number; rate: number; monthly: number; installments: BankInstallment[]; remaining_principal: number };
  history: { kind: string; amount: number; label: string; world_at: string }[];
  seizures: { asset_name: string | null; asset_value: number; recovered: number; world_at: string }[];
};
export const bankLoansQuery = queryOptions({
  queryKey: ["bank", "loans-state"],
  queryFn: async (): Promise<BankState> => {
    const { data, error } = await untyped.rpc("bank_state", {});
    if (error) throw new Error(error.message);
    return data as BankState;
  },
});
export async function requestLoan(input: { amount: number; months: number }) {
  const { error } = await untyped.rpc("request_loan", { _amount: input.amount, _months: input.months, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
}
export async function repayLoanEarly() {
  const { error } = await untyped.rpc("repay_loan_early", { _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
}
export async function drawOverdraft(amount: number) {
  const { error } = await untyped.rpc("use_overdraft", { _amount: amount, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
}

// P5b — Assurances et imprévus
export type InsuranceState = {
  now: string; age: number; debt: number | null;
  settings: { min_age: number; waiting_days: number; month_days: number };
  products: { id: string; name: string; covers: string[]; monthly_price: number }[];
  coverage: { type: string; label: string; deductible: number; cap: number; examples: string[] }[];
  contracts: { id: string; product_id: string; name: string; insurer?: string; covers: string[]; status: "active" | "suspended"; monthly_price: number; covered_from: string; next_due_at: string }[];
  incidents: { id: string; type_label: string; label: string; occurred_at: string; cost: number; insurer_paid: number; player_paid: number; unpaid: number }[];
};
export const insuranceQuery = queryOptions({
  queryKey: ["bank", "insurance-state"],
  queryFn: async (): Promise<InsuranceState> => {
    const { data, error } = await untyped.rpc("insurance_state", {});
    if (error) throw new Error(error.message);
    return data as InsuranceState;
  },
});
export async function subscribeInsurance(productId: string) {
  const { error } = await untyped.rpc("subscribe_insurance", { _product: productId, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
}
export async function cancelInsurance(contractId: string) {
  const { error } = await untyped.rpc("cancel_insurance", { _contract: contractId });
  if (error) throw new Error(error.message);
}

export type InsurerState = {
  insurance: InsuranceState; settings: { founding_total: number; min_percent: number; max_percent: number };
  founding_fee: number; can_found: boolean;
  providers: { id: string; name: string; percent: number }[];
  mine: null | { id: string; name: string; percent: number; balance: number; contracts: number;
    ledger: { id: string; kind: "premium" | "claim"; amount: number; treasury_amount: number; fictive_amount: number; world_at: string }[] };
};
export const insurerQuery = queryOptions({
  queryKey: ["bank", "insurer-state"], retry: false,
  queryFn: async (): Promise<InsurerState> => {
    const { data, error } = await untyped.rpc("insurer_state", {});
    if (error) throw new Error(error.message);
    return data as InsurerState;
  },
});
export async function insurerAction(fn: "insurer_found" | "insurer_subscribe" | "insurer_set_price", args: Record<string, unknown>) {
  const { data, error } = await untyped.rpc(fn, fn === "insurer_set_price" ? args : { ...args, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data;
}

// P5c — Entreprises des joueurs
export type BusinessSector = { id: string; label: string; description: string; min_capital: number; base_revenue: number; per_worker: number; per_shift: number; weekly_rent: number; npc_wage: number; max_npc: number };
export type BusinessState = {
  now: string; age: number; balance: number;
  settings: { min_age: number; founding_fee: number; max_owner_salary: number; min_player_salary: number; max_player_salary: number; shift_minutes: number; shift_energy: number; fail_strikes: number };
  sectors: BusinessSector[];
  business: null | {
    id: string; name: string; owner_salary: number; strikes: number; sector: BusinessSector; city_name: string; location_name: string; treasury: number; shifts_this_week: number;
    npc_staff: { id: string; name: string; profession: string }[];
    employees: { id: string; name: string; title: string; weekly_salary: number }[];
    offers: { id: string; title: string; weekly_salary: number }[];
    weeks: { week: number; revenue: number; costs: number; workers: number; shifts: number }[];
  };
  last_closed: null | { name: string; status: "closed" | "failed"; closed_at: string | null };
  job: null | { id: string; business_id: string; business_name: string; title: string; weekly_salary: number; shifts_this_week: number };
  offers: { id: string; title: string; weekly_salary: number; business_name: string; sector: string }[];
  pay_history: { label: string; amount: number; paid_at: string }[];
};
export const businessQuery = queryOptions({
  queryKey: ["bank", "business-state"],
  queryFn: async (): Promise<BusinessState> => {
    const { data, error } = await untyped.rpc("business_state", {});
    if (error) throw new Error(error.message);
    return data as BusinessState;
  },
});
async function bizRpc(fn: string, args: Record<string, unknown>) {
  const { error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
}
export const foundBusiness = (i: { name: string; sector: string; capital: number }) => bizRpc("found_business", { _name: i.name, _sector: i.sector, _capital: i.capital, _request_id: crypto.randomUUID() });
export const businessDeposit = (i: { biz: string; amount: number }) => bizRpc("business_deposit", { _biz: i.biz, _amount: i.amount, _request_id: crypto.randomUUID() });
export const businessSetOwnerSalary = (i: { biz: string; amount: number }) => bizRpc("business_set_owner_salary", { _biz: i.biz, _amount: i.amount });
export const businessHireNpc = (biz: string) => bizRpc("business_hire_npc", { _biz: biz });
export const businessFireNpc = (i: { biz: string; npc: string }) => bizRpc("business_fire_npc", { _biz: i.biz, _npc: i.npc });
export const businessOpenOffer = (i: { biz: string; title: string; salary: number }) => bizRpc("business_open_offer", { _biz: i.biz, _title: i.title, _salary: i.salary });
export const businessCloseOffer = (offer: string) => bizRpc("business_close_offer", { _offer: offer });
export const businessJoin = (offer: string) => bizRpc("business_join", { _offer: offer });
export const businessLeave = (employee: string) => bizRpc("business_leave", { _employee: employee });
export const businessWork = (biz: string) => bizRpc("business_work", { _biz: biz });
export const businessClose = (biz: string) => bizRpc("business_close", { _biz: biz });

// P5d — Impôts des entreprises
export type BusinessTaxState = {
  settings: { profit_rate: number; local_weekly: number };
  debt: number; total_paid: number;
  weeks: { week: number; profit: number; profit_tax: number; local_tax: number; paid: number }[];
};
export const businessTaxQuery = queryOptions({
  queryKey: ["bank", "business-tax-state"],
  queryFn: async (): Promise<BusinessTaxState> => {
    const { data, error } = await untyped.rpc("business_tax_state", {});
    if (error) throw new Error(error.message);
    return data as BusinessTaxState;
  },
});

// P6 — Profils publics et réseau entre joueurs
export type PlayerCard = { id: string; name: string; age: number; city: string; situation: string; reputation: number; contact_id?: string };
export type PlayerProfile = PlayerCard & {
  bio: string; influence: number; political_reputation: number; job: string | null;
  organizations: { id: string; name: string; kind: string; role: string }[];
  mandate: null | { function: string; city: string }; business: null | { name: string; sector: string };
  followers: number; contacts_count: number; is_me: boolean; following: boolean; blocked_by_me: boolean;
  contact: null | { id: string; status: "pending" | "accepted"; incoming: boolean };
};
export type NetworkState = {
  me: string; settings: { bio_max: number; message_max: number };
  bio: { bio: string; listed: boolean };
  contacts: PlayerCard[]; incoming: PlayerCard[]; outgoing: PlayerCard[]; following: PlayerCard[]; followers: number;
  threads: { id: string; last_at: string; other: PlayerCard; last_body: string | null; unread: number }[];
  multiplayer: { transfer_daily_max: number; together_minutes: number; together_energy: number; together_reputation: number; invite_hours: number };
  together_kinds: { id: string; label: string; location_kinds: string[] }[];
  balance: number; sent_today: number; blocked: PlayerCard[];
  invites: { id: string; mine: boolean; kind: string; place: string; expires_at: string; other: PlayerCard }[];
  transfers: { id: string; amount: number; note: string; created_at: string; sent: boolean; other: PlayerCard }[];
};
export const networkQuery = queryOptions({
  queryKey: ["network", "state"],
  refetchInterval: 10000,
  queryFn: async (): Promise<NetworkState> => {
    const { data, error } = await untyped.rpc("network_state", {});
    if (error) throw new Error(error.message);
    return data as NetworkState;
  },
});
export const playerDirectoryQuery = (q: string) => queryOptions({
  queryKey: ["network", "directory", q],
  refetchInterval: 15000,
  queryFn: async (): Promise<{ city: string; players: PlayerCard[]; here: PlayerCard[] }> => {
    const { data, error } = await untyped.rpc("player_directory", { _query: q });
    if (error) throw new Error(error.message);
    return data as { city: string; players: PlayerCard[]; here: PlayerCard[] };
  },
});
export const playerProfileQuery = (id: string) => queryOptions({
  queryKey: ["network", "profile", id],
  queryFn: async (): Promise<PlayerProfile> => {
    const { data, error } = await untyped.rpc("player_profile", { _target: id });
    if (error) throw new Error(error.message);
    return data as PlayerProfile;
  },
});
export const playerThreadQuery = (id: string) => queryOptions({
  queryKey: ["network", "thread", id],
  refetchInterval: 5000,
  queryFn: async (): Promise<{ other: PlayerCard; can_write: boolean; messages: { id: string; mine: boolean; body: string; sent_at: string }[] }> => {
    const { data, error } = await untyped.rpc("read_player_thread", { _other: id });
    if (error) throw new Error(error.message);
    return data as { other: PlayerCard; can_write: boolean; messages: { id: string; mine: boolean; body: string; sent_at: string }[] };
  },
});
async function netRpc(fn: string, args: Record<string, unknown>) {
  const { error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
}
export const setPlayerBio = (i: { bio: string; listed: boolean }) => netRpc("set_player_bio", { _bio: i.bio, _listed: i.listed });
export const requestContact = (id: string) => netRpc("request_contact", { _target: id });
export const respondContact = (i: { id: string; accept: boolean }) => netRpc("respond_contact", { _request: i.id, _accept: i.accept });
export const cancelContact = (id: string) => netRpc("cancel_contact", { _contact: id });
export const followPlayer = (i: { id: string; on: boolean }) => netRpc("follow_player", { _target: i.id, _on: i.on });
export const sendPlayerMessage = (i: { id: string; body: string }) => netRpc("send_player_message", { _target: i.id, _body: i.body, _request_id: crypto.randomUUID() });

// P7 — Multijoueur : blocage, signalement, virements, activités à plusieurs
export const blockPlayer = (i: { id: string; on: boolean }) => netRpc("block_player", { _target: i.id, _on: i.on });
export const reportPlayer = (i: { id: string; reason: string; details: string }) => netRpc("report_player", { _target: i.id, _reason: i.reason, _details: i.details });
export const sendMoney = (i: { id: string; amount: number; note: string }) => netRpc("send_money", { _target: i.id, _amount: i.amount, _note: i.note, _request_id: crypto.randomUUID() });
export const inviteTogether = (i: { id: string; kind: string }) => netRpc("invite_together", { _target: i.id, _kind: i.kind });
export const respondTogether = (i: { id: string; accept: boolean }) => netRpc("respond_together", { _invite: i.id, _accept: i.accept });
export const cancelTogether = (id: string) => netRpc("cancel_together", { _invite: id });

// ---- Presse des joueurs ----
export type PressArticle = { id: string; title: string; body: string; photo: string | null; published_at: string; city: string | null; author_id: string; author: string; outlet: string; portrait: string | null; mine: boolean };
export type PressState = { card: { outlet: string; portrait: string | null } | null; feed: PressArticle[] };
export const pressQuery = queryOptions({
  queryKey: ["press", "state"],
  refetchInterval: 30000,
  queryFn: async (): Promise<PressState> => {
    const { data: ch } = await untyped.from("characters").select("id").maybeSingle();
    const [{ data: card }, feed] = await Promise.all([
      ch ? untyped.from("press_cards").select("outlet, portrait").eq("character_id", ch.id).maybeSingle() : Promise.resolve({ data: null }),
      untyped.rpc("press_feed", { _limit: 30 }),
    ]);
    if (feed.error) throw new Error(feed.error.message);
    return { card: card ?? null, feed: (feed.data ?? []) as PressArticle[] };
  },
});
export async function registerPress(input: { outlet: string; portrait: string | null }) {
  const { error } = await untyped.rpc("press_register", { _outlet: input.outlet, _portrait: input.portrait });
  if (error) throw new Error(error.message);
}
export async function publishArticle(input: { requestId: string; title: string; body: string; photo: string | null }) {
  const { error } = await untyped.rpc("press_publish", { _request_id: input.requestId, _title: input.title, _body: input.body, _photo: input.photo });
  if (error) throw new Error(error.message);
}
export async function hideArticle(input: { id: string }) {
  const { error } = await untyped.rpc("press_hide", { _article: input.id });
  if (error) throw new Error(error.message);
}

// ---- Médias des joueurs (journal + chaîne, abonnés, caisse du média) ----
export type MediaItem = PressArticle & { format: "article" | "emission"; tone: "neutre" | "positif" | "critique"; indicator: string | null; cited: string | null; reported: boolean };
export type MediaOutlet = { owner_id: string; outlet: string; channel: string | null; author: string; portrait: string | null; subscribers: number; subscribed: boolean; items: number; mine: boolean };
export type MediaState = {
  settings: { sub_price: number; owner_pay_max: number; report_hide: number; npc_per_item: number; npc_cents: number; mention_week_cap: number; opinion_week_cap: number };
  indicators: string[];
  mine: null | { outlet: string; channel: string | null; balance: number; subscribers: number; paid_this_week: boolean;
    weeks: { week: number; readers: number; revenue: number }[]; ledger: { kind: string; amount: number; label: string; at: string }[] };
  outlets: MediaOutlet[]; feed: MediaItem[]; subscriptions: { owner_id: string; outlet: string }[]; people: { id: string; name: string }[];
};
export const mediaQuery = queryOptions({
  queryKey: ["press", "media-state"],
  refetchInterval: 30000,
  queryFn: async (): Promise<MediaState> => {
    const { data, error } = await untyped.rpc("media_state", {});
    if (error) throw new Error(error.message);
    return data as MediaState;
  },
});
async function mediaRpc(fn: string, args: Record<string, unknown>) {
  const { error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
}
export const openChannel = (i: { name: string }) => mediaRpc("media_channel", { _name: i.name });
export const publishMedia = (i: { requestId: string; format: "article" | "emission"; title: string; body: string; photo: string | null; cited: string | null; tone: string; indicator: string | null }) =>
  mediaRpc("media_publish", { _request_id: i.requestId, _format: i.format, _title: i.title, _body: i.body, _photo: i.photo, _cited: i.cited, _tone: i.tone, _indicator: i.indicator });
export const subscribeMedia = (i: { owner: string; on: boolean }) => mediaRpc("media_subscribe", { _owner: i.owner, _on: i.on });
export const reportMedia = (i: { id: string }) => mediaRpc("media_report", { _article: i.id });
export const payMediaOwner = (i: { amount: number }) => mediaRpc("media_owner_pay", { _amount: i.amount });

// ---- Législatives réelles (577 circonscriptions) ----
export type LegislativeState = {
  now: string; my_constituency: string | null; eligible: boolean; focus: string | null;
  election: null | { id: string; candidacies_at: string; candidacies_end_at: string; round1_at: string; round2_at: string; vote_end_at: string; counted: boolean; round1_counted: boolean };
  my_candidacy: null | { constituency_code: string; party_code: string };
  my_votes: Record<string, string>;
  player_candidates: { party_code: string; name: string }[];
  results: { round: number; party_code: string; name: string; votes: number; qualified: boolean; elected: boolean }[];
  assembly: null | { by_party: Record<string, number>; seats: Record<string, { n: string; d: string; p: boolean }> };
};
export const legislativeQuery = (code: string | null) => queryOptions({
  queryKey: ["legislatives", "state", code ?? "mine"],
  retry: false,
  refetchInterval: 30000,
  queryFn: async (): Promise<LegislativeState> => {
    const { data, error } = await untyped.rpc("legislative_state", { _code: code });
    if (error) throw new Error(error.message);
    return data as LegislativeState;
  },
});
export async function legislativeAction(input: { command: "candidacy" | "withdraw" | "vote"; constituency_code?: string; party_code?: string }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("legislative_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Trophées : décompte de ce que le joueur a fait (lectures seules) ----
export const trophyFactsQuery = queryOptions({
  queryKey: ["trophies", "facts"],
  staleTime: 30000,
  queryFn: async (): Promise<import("@/game/trophies").Facts> => {
    const { data: ch } = await supabase.from("characters").select("id").maybeSingle();
    const id = ch?.id ?? "00000000-0000-0000-0000-000000000000";
    const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => { try { const r = await q; return r.error ? 0 : r.count ?? 0; } catch { return 0; } };
    const safe = async <T,>(p: PromiseLike<T>): Promise<T | null> => { try { return await p; } catch { return null; } };
    const head = { count: "exact" as const, head: true };
    const [activities, studies, jobs, interactions, memberships, newsRead, reports, consultations, opinions, votes, candidacies, articles, bank, biz, net, pol, leg] = await Promise.all([
      count(supabase.from("activities").select("id", head).eq("character_id", id).in("status", ["completed", "done"])),
      count(supabase.from("study_enrollments").select("character_id", head).eq("character_id", id)),
      count(supabase.from("employments").select("character_id", head).eq("character_id", id)),
      count(supabase.from("social_interactions").select("id", head).eq("character_id", id)),
      count(supabase.from("memberships").select("id", head).eq("character_id", id)),
      count(supabase.from("news_reads").select("news_id", head)),
      count(supabase.from("citizen_reports").select("id", head).eq("character_id", id)),
      count(supabase.from("consultation_participations").select("character_id", head).eq("character_id", id)),
      count(supabase.from("political_opinions").select("character_id", head).eq("character_id", id)),
      count(supabase.from("election_votes").select("character_id", head).eq("character_id", id)),
      count(supabase.from("candidacies").select("id", head).eq("character_id", id)),
      count(untyped.from("press_articles").select("id", head).eq("author_id", id)),
      safe(supabase.from("accounts").select("balance").maybeSingle().then(r => r.data)),
      safe(untyped.rpc("business_state", {}).then((r: { data: unknown }) => r.data as BusinessState | null)),
      safe(untyped.rpc("network_state", {}).then((r: { data: unknown }) => r.data as NetworkState | null)),
      safe(supabase.rpc("political_state").then(r => r.data as unknown as import("@/game/politics").PoliticalState | null)),
      safe(untyped.rpc("legislative_state", { _code: null }).then((r: { data: unknown }) => r.data as LegislativeState | null)),
    ]);
    return {
      activities, studies, jobs, interactions, memberships, newsRead, reports, consultations, opinions, votes, candidacies, articles,
      balance: Number(bank?.balance ?? 0), business: !!biz?.business,
      contacts: net?.contacts?.length ?? 0, followers: net?.followers ?? 0,
      politicalMember: (pol?.memberships?.length ?? 0) > 0, reputation: pol?.stats?.reputation ?? 0, influence: pol?.stats?.influence ?? 0,
      legislativeCandidate: !!leg?.my_candidacy,
    };
  },
});

// ---- Pétitions et référendums ----
export type Petition = {
  id: string; scope: "city" | "national"; city_id: string | null; title: string; body: string; author: string; mine: boolean;
  threshold: number; signatures: number; status: "open" | "expired" | "referendum" | "rejected" | "council" | "accepted" | "refused" | "assembly";
  created_at: string; ends_at: string; referendum_ends_at: string | null; council_ends_at: string | null;
  yes_pct: number | null; council_note: string | null; signed: boolean; voted: boolean | null;
};
export type PetitionState = {
  now: string; city_id: string; city_name: string; mayor: boolean; can_create: boolean;
  settings: { city_pct: number; national_pct: number; signing_days: number; referendum_days: number; council_days: number; title_max: number; body_max: number; min_age: number };
  city: Petition[]; national: Petition[];
};
export const petitionQuery = queryOptions({
  queryKey: ["petitions", "state"],
  retry: false,
  refetchInterval: 15000,
  queryFn: async (): Promise<PetitionState> => {
    const { data, error } = await untyped.rpc("petition_state", {});
    if (error) throw new Error(error.message);
    return data as PetitionState;
  },
});
export async function petitionAction(input: { command: "create" | "sign" | "vote" | "council"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("petition_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Débats entre joueurs ----
export type Debate = {
  id: string; topic: string; status: "invited" | "declined" | "expired" | "running" | "voting" | "done"; round: number;
  created_at: string; invite_ends_at: string; turn_ends_at: string | null; voting_ends_at: string | null;
  challenger: PlayerCard; opponent: PlayerCard; winner_id: string | null; forfeit: boolean;
  votes_challenger: number | null; votes_opponent: number | null;
  role: "challenger" | "opponent" | "public"; my_vote: string | null;
  turns: { round: number; character_id: string; body: string; created_at: string }[];
};
export type DebateState = {
  me: string; now: string;
  settings: { rounds: number; topic_max: number; turn_max: number; turn_hours: number; voting_hours: number; invite_hours: number; win_reputation: number; campaign_support: number };
  mine: Debate[]; public: Debate[];
};
export const debateQuery = queryOptions({
  queryKey: ["debates", "state"],
  retry: false,
  refetchInterval: 10000,
  queryFn: async (): Promise<DebateState> => {
    const { data, error } = await untyped.rpc("debate_state", {});
    if (error) throw new Error(error.message);
    return data as DebateState;
  },
});
export async function debateAction(input: { command: "challenge" | "respond" | "turn" | "vote"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("debate_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Famille et vie privée ----
export type FamilyPerson = { id: string; name: string; age: number; situation: string; player: boolean };
export type FamilyState = {
  me: string; now: string; age: number;
  settings: { min_age: number; npc_couple_score: number; npc_friend_score: number; union_after_days: number; rent_share_pct: number; child_weekly_cost: number; child_days_per_year: number; child_max: number; adoption_min_age: number; friend_max: number; friend_energy: number };
  couple: null | { id: string; union_kind: "pacs" | "mariage" | null; started_at: string; union_at: string | null; union_pending: "pacs" | "mariage" | null; union_requested_by_me: boolean; partner: FamilyPerson;
    cohabitation: null | { status: "pending" | "active"; host_is_me: boolean; since: string | null; share: number } };
  requests: { id: string; from: PlayerCard }[];
  sent: { id: string; to: PlayerCard }[];
  children: { id: string; first_name: string; origin: "naissance" | "adoption"; status: "pending" | "home" | "adult"; wellbeing: number; requested_by_me: boolean; age: number | null; unpaid_weeks: number }[];
  friends: { id: string; status: "pending" | "active"; incoming: boolean; person: FamilyPerson }[];
  hangout_today: boolean;
  close_npcs: { id: string; name: string; age: number; score: number }[];
};
export const familyQuery = queryOptions({
  queryKey: ["family", "state"],
  retry: false,
  refetchInterval: 15000,
  queryFn: async (): Promise<FamilyState> => {
    const { data, error } = await untyped.rpc("family_state", {});
    if (error) throw new Error(error.message);
    return data as FamilyState;
  },
});
export async function familyAction(input: { command: string; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("family_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Santé et bien-être ----
export type HealthState = {
  now: string; health: number; morale: number; illness: string | null; ill_until: string | null; energy: number; balance: number | null;
  settings: { illness_chance_pct: number; illness_days: number; illness_loss: number; daily_recovery: number; morale_target: number; doctor_cost: number; doctor_health: number; sport_energy: number; sport_health: number; sport_morale: number; relax_morale: number };
  done_today: ("sport" | "detente" | "medecin")[];
};
export const healthQuery = queryOptions({
  queryKey: ["health", "state"],
  retry: false,
  queryFn: async (): Promise<HealthState> => {
    const { data, error } = await untyped.rpc("health_state", {});
    if (error) throw new Error(error.message);
    return data as HealthState;
  },
});
export async function healthAction(command: "sport" | "detente" | "medecin") {
  const { error } = await untyped.rpc("health_action", { _command: command });
  if (error) throw new Error(error.message);
}

// ---- Justice et tribunaux ----
export type JusticeCategory = "diffamation" | "harcelement" | "escroquerie" | "non_paiement" | "autre";
export type JusticeCase = {
  id: string; role: "plaignant" | "accuse"; other: PlayerCard; category: JusticeCategory; facts: string; defense: string | null;
  status: "instruction" | "jugee"; verdict: "coupable" | "relaxe" | null; judge: string; fine: number; fine_paid: boolean;
  filed_at: string; judged_at: string | null; deadline: string;
};
export type JusticeState = {
  me: string; now: string;
  settings: { min_age: number; filing_fee: number; defense_hours: number; after_defense_hours: number; max_open: number; guilty_pct_no_defense: number; guilty_pct_defense: number; fine: number; reputation_loss: number };
  cases: JusticeCase[];
};
export const justiceQuery = queryOptions({
  queryKey: ["justice", "state"],
  retry: false,
  refetchInterval: 20000,
  queryFn: async (): Promise<JusticeState> => {
    const { data, error } = await untyped.rpc("justice_state", {});
    if (error) throw new Error(error.message);
    return data as JusticeState;
  },
});
export async function justiceAction(input: { command: "file" | "defend"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("justice_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Syndicats et grèves ----
export type UnionCampaign = {
  id: string; demand: string; status: "collecte" | "greve" | "gagnee" | "perdue" | "abandonnee"; author: PlayerCard;
  created_at: string; collect_ends: string; strike_from: string | null; ends_at: string | null;
  support: number; pressure: number; supporters: number; strikers: number; i_support: boolean; struck_today: boolean; my_days: number; my_prime: number | null;
};
export type UnionState = {
  me: string; now: string; employed: boolean; daily_wage: number; my_union: string | null;
  settings: { join_fee: number; collect_days: number; strike_days: number; support_threshold: number; player_support: number; success_threshold: number; strike_pressure: number; strike_energy: number; workdays_month: number; prime_multiplier: number; prime_min: number; win_reputation: number };
  unions: { id: string; name: string; motto: string; members: number; campaigns: UnionCampaign[] }[];
};
export const unionQuery = queryOptions({
  queryKey: ["unions", "state"],
  retry: false,
  refetchInterval: 20000,
  queryFn: async (): Promise<UnionState> => {
    const { data, error } = await untyped.rpc("union_state", {});
    if (error) throw new Error(error.message);
    return data as UnionState;
  },
});
export async function unionAction(input: { command: "join" | "leave" | "propose" | "support" | "strike"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("union_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

// ---- Classements publics ----
export type RankingKind = "reputation" | "influence" | "popularite" | "fortune";
export type RankingsState = {
  kind: RankingKind; city: string | null; me: string; my_city: string; show_wealth: boolean;
  cities: { id: string; name: string }[];
  top: { rank: number; id: string; score: number; name: string; city: string }[];
  mine: { rank: number; score: number; total: number } | null;
};
export const rankingsQuery = (kind: RankingKind, city: string | null) => queryOptions({
  queryKey: ["rankings", "state", kind, city ?? "all"],
  retry: false,
  queryFn: async (): Promise<RankingsState> => {
    const { data, error } = await untyped.rpc("rankings_state", { _kind: kind, _city: city });
    if (error) throw new Error(error.message);
    return data as RankingsState;
  },
});
export async function rankingsSetWealth(show: boolean) {
  const { error } = await untyped.rpc("rankings_set_wealth", { _show: show });
  if (error) throw new Error(error.message);
}

// ---- Conséquences différées, projets citoyens, crises ----
export type CityEffect = { label: string; kind: "indicator" | "treasury"; indicator: string | null; delta: number; amount: number; due_at: string; applied: boolean; value?: number | null };
export type ProjectType = { id: string; label: string; indicator: string; min_cost: number; max_cost: number; work_days: number; effect: number; followup: number };
export type CitizenProject = {
  id: string; title: string; problem: string; goal: string; type_id: string; district: string | null; cost: number;
  status: "soutiens" | "examen" | "reporte" | "travaux" | "termine" | "refuse" | "echoue"; decision: string | null; decided_by: "maire" | "simulation" | null;
  funding_pct: number; score: number; version: number; author: PlayerCard; mine: boolean; stage_at: string; works_end: string | null; created_at: string;
  supporters: number; donations: number; i_support: boolean; mobilized_today: boolean;
  log: { at: string; step: string; message: string }[]; effects: CityEffect[] | null;
};
export type ProjectsState = {
  me: string; now: string; city: string; my_city: string; age: number; is_mayor: boolean; treasury: number | null;
  settings: { min_age: number; max_active: number; support_days: number; review_days: number; postpone_days: number; player_weight: number; mobilize_points: number; mobilize_energy: number; donation_step: number; approve_score: number; partial_score: number; postpone_score: number; author_reputation: number; supporter_reputation: number; refusal_political: number; followup_days: number };
  types: ProjectType[]; districts: { id: string; name: string }[]; projects: CitizenProject[];
};
export const projectsQuery = queryOptions({
  queryKey: ["projects", "state"],
  retry: false,
  refetchInterval: 20000,
  queryFn: async (): Promise<ProjectsState> => {
    const { data, error } = await untyped.rpc("cproject_state", { _city: null });
    if (error) throw new Error(error.message);
    return data as ProjectsState;
  },
});
export async function projectAction(input: { command: "create" | "support" | "mobilize" | "donate" | "amend" | "decide"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("cproject_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}

export type CrisisOption = { id: "A" | "B" | "C"; label: string; description: string; cost: number; immediate_pct: number; later_pct: number; later_days: number; satisfaction_now: number; satisfaction_later: number; side_delta: number; pros: string; cons: string; favorable: string; unfavorable: string };
export type Crisis = {
  id: string; title: string; description: string; national: boolean; district: string | null; status: "urgence" | "gestion" | "terminee";
  option_id: "A" | "B" | "C" | null; decided_by: "maire" | "conseil" | null; starts_at: string; decide_by: string; ends_at: string;
  impact: Record<string, number>; main_indicator: string; side_indicator: string; helpers: number; protests: number; donations: number;
  my_actions: ("aide" | "protestation")[]; effects: CityEffect[] | null;
};
export type CrisesState = {
  me: string; now: string; city: string; my_city: string; energy: number; is_mayor: boolean;
  settings: { weekly_chance_pct: number; national_chance_pct: number; decide_hours: number; help_energy: number; help_reputation: number; helpers_cap: number; protest_threshold: number; protest_political: number };
  cities: { id: string; name: string }[]; options: CrisisOption[]; crises: Crisis[];
};
export const crisesQuery = (city: string | null) => queryOptions({
  queryKey: ["crises", "state", city ?? "mine"],
  retry: false,
  refetchInterval: 20000,
  queryFn: async (): Promise<CrisesState> => {
    const { data, error } = await untyped.rpc("crisis_state", { _city: city });
    if (error) throw new Error(error.message);
    return data as CrisesState;
  },
});
export async function crisisAction(input: { command: "decide" | "help" | "protest" | "donate"; [k: string]: unknown }) {
  const { command, ...rest } = input;
  const { error } = await untyped.rpc("crisis_action", { _command: command, _input: rest });
  if (error) throw new Error(error.message);
}
export type CityEffectsState = {
  now: string; treasury: number | null; indicators: Record<string, number>;
  upcoming: (CityEffect & { id: string; source_kind: string })[];
  recent: (CityEffect & { id: string; source_kind: string; applied_at: string })[];
};
export const cityEffectsQuery = (city: string) => queryOptions({
  queryKey: ["effects", "city", city],
  retry: false,
  queryFn: async (): Promise<CityEffectsState> => {
    const { data, error } = await untyped.rpc("city_effects", { _city: city });
    if (error) throw new Error(error.message);
    return data as CityEffectsState;
  },
});

// ---- Ma vie dans CIVITAS : réputations multiples, compétences, journal (calculés côté serveur) ----
export type LifeDimension = { axis: "reputation" | "skill"; dimension: string; value: number; parts: { source: string; points: number }[] | null };
export type LifeJournalEntry = { at: string; kind: string; title: string; age: number };
export type LifeProfile = { sources: Record<string, number>; journal: LifeJournalEntry[]; dimensions: LifeDimension[] };
export const lifeProfileQuery = queryOptions({
  queryKey: ["life-profile", "state"],
  retry: false,
  queryFn: async (): Promise<LifeProfile> => {
    const { data, error } = await untyped.rpc("life_profile", {});
    if (error) throw new Error(error.message);
    return data as LifeProfile;
  },
});

// ---- Identité : carte fictive, photo, signature (numéros et dates fixés par le serveur) ----
export type IdentityCardData = {
  first_name: string; last_name: string; age: number; appearance: unknown; city: string | null; created_at: string;
  nationality: string; civitas_id: string; doc_number: string; birth_date: string; birth_city: string;
  issued_at: string; expires_at: string; expired: boolean; signature_style: string | null; signature_text: string | null;
  photo: string | null; use_photo: boolean; settings: { photo_max_chars: number; signature_styles: string[] };
};
export const identityQuery = queryOptions({
  queryKey: ["identity", "card"],
  retry: false,
  queryFn: async (): Promise<IdentityCardData> => {
    const { data, error } = await untyped.rpc("identity_card", {});
    if (error) throw new Error(error.message);
    return data as IdentityCardData;
  },
});
export async function identityUpdate(command: "appearance" | "signature" | "photo" | "delete_photo" | "use_photo", input: Record<string, unknown> = {}) {
  const { error } = await untyped.rpc("identity_update", { _command: command, _input: input });
  if (error) throw new Error(error.message);
}

// ---- Orientation politique (partis réels = positionnement, jamais adhésion) et profil citoyen public ----
export type RealParty = { code: string; label: string; short: string; family: string };
export type OrientationAxis = { id: string; label: string; low_label: string; high_label: string };
export type PublicPrefs = { show_photo: boolean; show_party: boolean; show_job: boolean; show_orgs: boolean; show_mandates: boolean; show_projects: boolean; show_skills: boolean };
export type OrientationState = {
  me: string; party_code: string | null; axes: Record<string, number>; drift: Record<string, number>; prefs: PublicPrefs;
  parties: RealParty[]; axis_defs: OrientationAxis[]; history: { at: string; label: string; party_code: string | null }[];
  civitas_orgs: { id: string; name: string; kind: string }[];
};
export const orientationQuery = queryOptions({
  queryKey: ["orientation", "state"],
  retry: false,
  queryFn: async (): Promise<OrientationState> => {
    const { data, error } = await untyped.rpc("orientation_state", {});
    if (error) throw new Error(error.message);
    return data as OrientationState;
  },
});
export async function orientationAction(command: "party" | "axes" | "prefs", input: Record<string, unknown>) {
  const { error } = await untyped.rpc("orientation_action", { _command: command, _input: input });
  if (error) throw new Error(error.message);
}
export type PublicProfile = {
  name: string; age: number; city: string | null; appearance: unknown; has_photo: boolean; party: string | null; job: string | null;
  organizations: { name: string; kind: string }[] | null;
  mandates: { function: string; city: string; starts_at: string; ends_at: string; active: boolean }[] | null;
  projects: { proposed: number; done: number; petitions: number } | null;
  skills: { dimension: string; value: number }[] | null;
  engagement: { reputation: number; political_reputation: number; followers: number };
};
export const publicProfileQuery = (id: string) => queryOptions({
  queryKey: ["orientation", "public-profile", id],
  retry: false,
  queryFn: async (): Promise<PublicProfile> => {
    const { data, error } = await untyped.rpc("public_profile", { _cid: id });
    if (error) throw new Error(error.message);
    return data as PublicProfile;
  },
});
export const publicPhotoQuery = (id: string) => queryOptions({
  queryKey: ["orientation", "public-photo", id],
  retry: false,
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<string | null> => {
    const { data, error } = await untyped.rpc("public_photo", { _cid: id });
    if (error) throw new Error(error.message);
    return (data as string | null) ?? null;
  },
});

// ---- Coffre-fort « Mes documents » (documents recalculés par le serveur, formulaires validés par le serveur) ----
export type VaultDoc = { key: string; category: string; kind: string; title: string; at: string | null; status: string; expires_at: string | null; data: Record<string, unknown> };
export type FormField = { key: string; label: string; type: "text" | "number" | "date" | "select" | "radio" | "checkbox"; required?: boolean; options?: [string, string][]; min?: number; max?: number; prefill?: string; help?: string };
export type FormType = { id: string; category: string; title: string; intro: string; simple_intro: string; fields: FormField[] };
export type DocumentVault = {
  now: string;
  owner: { full_name: string; age: number; city: string | null; civitas_id: string; signature_style: string | null; signature_text: string | null };
  documents: VaultDoc[]; seen: string[];
  deadlines: { title: string; due_at: string; status: string }[];
  prefill: Record<string, string | number | null>;
  form_types: FormType[];
  drafts: { id: string; type_id: string; data: Record<string, unknown>; updated_at: string; version: number }[];
  history: { type_id: string; action: string; version: number; at: string }[];
};
export const documentVaultQuery = queryOptions({
  queryKey: ["documents", "vault"],
  retry: false,
  queryFn: async (): Promise<DocumentVault> => {
    const { data, error } = await untyped.rpc("document_vault", {});
    if (error) throw new Error(error.message);
    return data as DocumentVault;
  },
});
export async function documentAction(command: "seen" | "save" | "submit" | "correct" | "delete_draft", input: Record<string, unknown>) {
  const { data, error } = await untyped.rpc("document_action", { _command: command, _input: input });
  if (error) throw new Error(error.message);
  return data as { id?: string; data?: Record<string, unknown> };
}
export const candidacyPhotoQuery = (id: string) => queryOptions({
  queryKey: ["orientation", "candidacy-photo", id],
  retry: false,
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<string | null> => {
    const { data, error } = await untyped.rpc("candidacy_photo", { _candidacy: id });
    if (error) return null; // fonction pas encore installée ou candidat fictif : on garde l'initiale
    return (data as string | null) ?? null;
  },
});

// ---- Sondages, débats publics, CV citoyen (règles et contrôles côté serveur) ----
export type PollGroup = { group: string; count: number; counts: number[] | null };
export type Poll = { id: string; question: string; options: string[]; sponsor_kind: string; sponsor_label: string; created_at: string; ends_at: string; open: boolean; mine: boolean;
  results: { players: number[]; total: number; simulated: number[]; simulated_sample: number; filters: Record<string, PollGroup[]> | null; min_answers_filters: number; my_answer: number | null } };
export type PollsState = { now: string; sponsors: { kind: string; label: string }[]; polls: Poll[] };
export const pollsQuery = queryOptions({
  queryKey: ["polls", "state"], retry: false,
  queryFn: async (): Promise<PollsState> => { const { data, error } = await untyped.rpc("polls_state", {}); if (error) throw new Error(error.message); return data as PollsState; },
});
export async function pollAction(command: "create" | "answer", input: Record<string, unknown>) {
  const { error } = await untyped.rpc("poll_action", { _command: command, _input: input }); if (error) throw new Error(error.message);
}
export type Forum = { id: string; topic_kind: string; title: string; context: string | null; created_at: string; closes_at: string; open: boolean; mine: boolean; author: string; posts: number };
export type ForumPost = { id: string; kind: "position" | "reponse" | "question"; parent_id: string | null; body: string; created_at: string; mine: boolean; author_id: string; author: string; soutiens: number; critiques: number; my_reaction: string | null };
export type ForumsState = { now: string; forums: Forum[]; posts: ForumPost[] | null };
export const forumsQuery = (forum: string | null) => queryOptions({
  queryKey: ["forums", forum ?? "list"], retry: false,
  queryFn: async (): Promise<ForumsState> => { const { data, error } = await untyped.rpc("forums_state", { _forum: forum }); if (error) throw new Error(error.message); return data as ForumsState; },
});
export async function forumAction(command: "create" | "post" | "react", input: Record<string, unknown>) {
  const { data, error } = await untyped.rpc("forum_action", { _command: command, _input: input }); if (error) throw new Error(error.message); return data as { id?: string };
}
type Dated = { since?: string; until?: string | null; at?: string | null; active?: boolean };
export type CitizenCv = {
  identity: { name: string; age: number; city: string };
  studies: ({ title: string; semester: number; progress: number } & Dated)[];
  jobs: ({ title: string; employer: string; level: number } & Dated)[];
  businesses: ({ name: string; status: string } & Dated)[];
  organizations: ({ name: string; kind: string; role: string } & Dated)[];
  unions: ({ name: string } & Dated)[];
  mandates: ({ function: string; city: string } & Dated)[];
  projects: ({ title: string; status: string } & Dated)[];
  distinctions: ({ title: string } & Dated)[];
  engagements: Record<string, number>;
  skills: { dimension: string; value: number }[] | null;
};
export const citizenCvQuery = queryOptions({
  queryKey: ["cv", "state"], retry: false,
  queryFn: async (): Promise<CitizenCv> => { const { data, error } = await untyped.rpc("citizen_cv", {}); if (error) throw new Error(error.message); return data as CitizenCv; },
});

// ---- Coalitions, vie interne des partis, vérification des faits (calculs côté serveur) ----
export type OrgVote = { id: string; kind: string; title: string; body: string | null; closes_at: string; status: string; result: { tally: Record<string, number>; total: number; winner?: string } | null;
  coalition_id: string | null; candidates: { id: string; name: string }[] | null; voted: boolean; ballots: number };
export type Coalition = { id: string; status: string; concessions: string; responsibilities: string; budget_support: boolean; created_at: string; decided_at: string | null; ended_at: string | null;
  proposer: { id: string; name: string }; partner: { id: string; name: string }; broken_by: string | null };
export type PartyLifeState = {
  now: string; settings: { respect_days: number; break_penalty: number; respect_bonus: number; vote_hours: number }; led: string[];
  council: { name: string; seats: number; majority: boolean; organization_id: string | null }[];
  parties: { id: string; name: string; kind: string; reputation: number; seats: number }[];
  coalitions: Coalition[];
  my_orgs: { id: string; name: string; role: string; president: string | null; program: string | null; members: { id: string; name: string }[] | null; votes: OrgVote[] | null }[];
};
export const partyLifeQuery = queryOptions({
  queryKey: ["party-life", "state"], retry: false,
  queryFn: async (): Promise<PartyLifeState> => { const { data, error } = await untyped.rpc("party_life_state", {}); if (error) throw new Error(error.message); return data as PartyLifeState; },
});
export async function partyLifeAction(command: "propose" | "accept" | "refuse" | "break" | "open_vote" | "ballot", input: Record<string, unknown>) {
  const { error } = await untyped.rpc("party_life_action", { _command: command, _input: input }); if (error) throw new Error(error.message);
}
export type FactCheck = { id: string; claim: string; data: Record<string, number>; calculation: string; verdict: string; created_at?: string; mine?: boolean; author?: string };
export const factCheckQuery = queryOptions({
  queryKey: ["fact-checks", "state"], retry: false,
  queryFn: async (): Promise<{ indicators: string[]; checks: FactCheck[] }> => { const { data, error } = await untyped.rpc("fact_check_state", {}); if (error) throw new Error(error.message); return data as { indicators: string[]; checks: FactCheck[] }; },
});
export async function runFactCheck(input: Record<string, unknown>) {
  const { data, error } = await untyped.rpc("fact_check", { _input: input }); if (error) throw new Error(error.message); return data as FactCheck;
}

// ---- Carrière : entretiens, promotions, chômage (règles côté serveur) ----
export type CareerProfile = { competence: number; experience: number; etudes: number; situation: number; total: number; reponses?: number };
export type CareerOffer = { id: string; title: string; salary: number; description: string; skill: string | null; skill_min: number; blocked: string | null; profile: CareerProfile; current: boolean };
export type CareerState = {
  eligible_path: boolean; pass_score: number; housing_monthly: number;
  job: null | { title: string; salary: number; base: number; level: number; progress: number; started_at: string; max_level: number; last_shift: string | null; layoff_days: number;
    next: null | { progress: number; skill: string; skill_level: number; current_skill: number; raise: number; first: boolean } };
  unemployment: null | { since: string; previous: string; weekly: number; paid_weeks: number; max_weeks: number };
  offers: CareerOffer[];
  open_interview: null | { id: string; job_id: string; job: string; questions: { id: string; question: string; answers: string[] }[] };
  interviews: { job: string; score: number; status: string; at: string; details: CareerProfile & { motif?: string } }[];
  history: { kind: string; label: string; at: string }[];
  salary_months: { month: string; total: number }[];
};
export const careerQuery = queryOptions({
  queryKey: ["career", "state"], retry: false,
  queryFn: async (): Promise<CareerState> => { const { data, error } = await untyped.rpc("career_state", {}); if (error) throw new Error(error.message); return data as CareerState; },
});
export async function careerAction(command: "interview_start" | "interview_answer" | "promote", input: Record<string, unknown> = {}) {
  const { data, error } = await untyped.rpc("career_action", { _command: command, _input: input });
  if (error) throw new Error(error.message);
  return data as { status?: string; score?: number; details?: CareerProfile; motif?: string; changement?: boolean; level?: number; salary?: number; interview_id?: string };
}

// ---- Boutique : catalogue réel, achats via le compte courant, patrimoine existant ----
export type ShopProduct = { id: string; name: string; price: number; kind: string; brand: string; section: string; desc: string; dep: number; owned: boolean; sales: number;
  details: { condition?: string; year?: number; km?: number; fuel?: string; conso?: number; maintenance?: number; city?: string; district?: string; surface?: number; rooms?: number; dpe?: string; charges_monthly?: number; tax_yearly?: number; realestate?: boolean } };
export type ShopAsset = { id: string; catalog_id: string; name: string; kind: string; brand: string | null; price: number; acquired_at: string; value: number;
  condition: string; next_maintenance: string | null; maintenance: number | null; shop: boolean; realestate: boolean; lived_in: boolean; credit_remaining: number | null; sell_price: number };
export type PurchaseCredit = { id: string; label: string; kind: "auto" | "immo"; price: number; down_payment: number; principal: number; months: number; rate: number;
  monthly: number; remaining: number; paid_count: number; missed: number; next_due: string; status: "active" | "repaid" | "sold" | "seized" };
export type CreditSettings = { auto_rate: number; immo_rate: number; auto_min_months: number; auto_max_months: number; immo_min_months: number; immo_max_months: number;
  min_down_percent: number; max_debt_percent: number; seizure_after: number };
export type SecondhandListing = { id: string; catalog_id: string; name: string; brand: string | null; section: string; kind: string; price: number; new_price: number; condition: string; owned: boolean };
export type ShopState = {
  balance: number; license: boolean; age: number; city: string; products: ShopProduct[];
  orders: { reference: string; name: string; brand: string; price: number; at: string }[];
  assets: ShopAsset[];
  credit: { income: number; burden: number; max_monthly: number; score: number | null; settings: CreditSettings; list: PurchaseCredit[] };
  secondhand: SecondhandListing[];
  sales: { name: string; amount: number; credit_repaid: number; at: string }[];
};
export const shopQuery = queryOptions({
  queryKey: ["shop", "state"], retry: false,
  queryFn: async (): Promise<ShopState> => { const { data, error } = await untyped.rpc("shop_state", {}); if (error) throw new Error(error.message); return data as ShopState; },
});
export async function shopBuy(catalogId: string, requestId: string) {
  const { data, error } = await untyped.rpc("shop_buy", { _catalog_id: catalogId, _request_id: requestId });
  if (error) throw new Error(error.message);
  return data as { reference: string; already: boolean };
}
export async function shopBuyCredit(catalogId: string, downPayment: number, months: number, requestId: string) {
  const { data, error } = await untyped.rpc("shop_buy_credit", { _catalog_id: catalogId, _down_payment: downPayment, _months: months, _request_id: requestId });
  if (error) throw new Error(error.message);
  return data as { reference: string; monthly: number; already: boolean };
}
export async function shopSell(assetId: string, requestId: string) {
  const { data, error } = await untyped.rpc("shop_sell", { _asset_id: assetId, _request_id: requestId });
  if (error) throw new Error(error.message);
  return data as { amount: number; credit_repaid: number; already: boolean };
}
export async function secondhandBuy(listingId: string, requestId: string) {
  const { data, error } = await untyped.rpc("secondhand_buy", { _listing_id: listingId, _request_id: requestId });
  if (error) throw new Error(error.message);
  return data as { reference?: string; already: boolean };
}
export type ShopExtras = { promos: { id: string; percent: number }[]; promo_ends: string | null; wishlist: { id: string; goal: boolean }[] };
export const shopExtrasQuery = queryOptions({
  queryKey: ["shop", "extras"], retry: false,
  queryFn: async (): Promise<ShopExtras> => { const { data, error } = await untyped.rpc("shop_extras", {}); if (error) throw new Error(error.message); return data as ShopExtras; },
});
export async function shopWish(command: "wish" | "goal", catalogId: string) {
  const { data, error } = await untyped.rpc("shop_wish", { _command: command, _catalog_id: catalogId });
  if (error) throw new Error(error.message);
  return data as { wished?: boolean; goal?: boolean };
}
export async function maintainAsset(catalogId: string) {
  const { error } = await untyped.rpc("personal_economy_action", { _command: "maintain", _request_id: crypto.randomUUID(), _input: { catalog_id: catalogId } });
  if (error) throw new Error(error.message);
}

// ---- Logement : locations et emménagement dans un bien acheté (système de logement existant) ----
export type Lease = { id: string; kind: "location" | "propriete"; title: string; monthly: number; deposit: number; started_at: string; ended_at: string | null };
export type HousingState = {
  city: string; balance: number; salary: number;
  current: null | { type: string; type_id: string; monthly: number };
  lease: Lease | null; past_leases: Lease[];
  rentals: { id: string; title: string; district: string; type: string; type_id: string; surface: number; dpe: string; floor: number; monthly: number; deposit: number; move: number }[];
  owned: { id: string; name: string; city: string; price: number }[];
};
export const housingQuery = queryOptions({
  queryKey: ["housing", "state"], retry: false,
  queryFn: async (): Promise<HousingState> => { const { data, error } = await untyped.rpc("housing_state", {}); if (error) throw new Error(error.message); return data as HousingState; },
});
export async function housingAction(command: "rent" | "move_in", input: Record<string, unknown>) {
  const { data, error } = await untyped.rpc("housing_action", { _command: command, _input: input, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data as { lease_id: string; deposit?: number; move?: number };
}

export const furnishingQuery = queryOptions({
  queryKey: ["furnishing", "state"], retry: false,
  queryFn: async (): Promise<import("@/game/home-furnishing").FurnishingState> => {
    const updated = await untyped.rpc("furnishing_state_v2", {});
    if (!updated.error) return updated.data as import("@/game/home-furnishing").FurnishingState;
    const missingCode = "code" in updated.error ? updated.error.code : undefined;
    if (missingCode !== "PGRST202" && missingCode !== "42883" && !updated.error.message.includes("Could not find the function public.furnishing_state_v2")) throw new Error(updated.error.message);
    const { data, error } = await untyped.rpc("home_furnishing_state", {});
    if (error) {
      const code = "code" in error ? error.code : undefined;
      if (code === "PGRST202" || code === "42883" || error.message.includes("Could not find the function public.home_furnishing_state")) return { available: false, homes: [], furniture: [], grid: 8 };
      throw new Error(error.message);
    }
    return data as import("@/game/home-furnishing").FurnishingState;
  },
});
export async function furnishingSave(home: import("@/game/home-furnishing").FurnishingHome, version: number, roomNames: string[], placements: import("@/game/home-furnishing").Placement[], requestId: string) {
  const { furnishingTarget } = await import("@/game/home-furnishing");
  const target = furnishingTarget(home);
  const { data, error } = await untyped.rpc(target.rpc, { [target.key]: target.id, _version: version, _room_names: roomNames, _placements: placements, _request_id: requestId });
  if (error) throw new Error(error.message);
  return data as { version: number; already: boolean };
}

// ---- Entreprises de services : garages et déménageurs (joueurs en priorité, sinon entreprise fictive) ----
export type ServiceKind = "garage" | "demenagement" | "immobilier";
export type ServiceReview = { stars: number; comment: string | null; author: string; at?: string };
export type ServiceProvider = { id: string; name: string; service: ServiceKind; owner: string; mine: boolean; percent: number; rating: number | null; reviews: number; last_reviews: ServiceReview[] };
export type ServiceInvoice = { id: string; reference: string; label: string; amount: number; service: ServiceKind; at: string; provider: string; fictive: boolean; reviewed: boolean; can_review: boolean };
export type ServiceState = {
  balance: number; city: string;
  settings: { min_percent: number; max_percent: number; npc_base_clients: number; npc_max_clients: number; garage_npc_ticket: number; moving_npc_ticket: number };
  providers: ServiceProvider[];
  vehicles: { catalog_id: string; name: string; brand: string | null; condition: string; next_maintenance: string | null; maintenance: number }[];
  invoices: ServiceInvoice[];
  my_business: null | { id: string; name: string; service: ServiceKind; percent: number; rating: number | null; treasury: number;
    weeks: { week: number; clients: number; revenue: number }[]; orders: { reference: string; label: string; amount: number; at: string; client: string }[]; reviews: ServiceReview[] };
};
export const serviceQuery = queryOptions({
  queryKey: ["services", "state"], retry: false,
  queryFn: async (): Promise<ServiceState> => { const { data, error } = await untyped.rpc("service_state", {}); if (error) throw new Error(error.message); return data as ServiceState; },
});
export async function serviceRpc(fn: "service_garage" | "service_set_price" | "service_review", args: Record<string, unknown>) {
  const { data, error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as { amount?: number; already?: boolean } | null;
}

// ---- Marché : magasins des villes, commerces de joueurs, marché entre joueurs ----
export type CityStore = { id: string; city_id: string; city: string; name: string; kind: string; district: string; sections: string[]; discount: number; hours: string; here: boolean };
export type MarketListing = { id: string; catalog_id: string; name: string; brand: string | null; section: string; kind: string; price: number; new_price: number; note: string;
  status: "open" | "reserved"; mine: boolean; seller: string; created_at: string; reserved_for_me: boolean; reserved_price: number | null; reserved_until: string | null; owned: boolean };
export type MarketOffer = { id: string; listing_id: string; name: string; amount: number; price: number; buyer?: string; status: string; reserved_until?: string | null; at: string };
export type ShopStockItem = { id: string; catalog_id: string; name: string; brand: string | null; price: number; new_price: number; quantity: number; owned: boolean };
export type MarketState = {
  me: string; city: string; collected: number; balance: number; license: boolean;
  settings: { fee_percent: number; max_price_percent: number; min_offer_percent: number; reservation_days: number; max_listings: number; wholesale_percent: number; shop_min_percent: number; shop_max_percent: number; max_stock: number };
  stores: CityStore[]; listings: MarketListing[];
  my_assets: { id: string; name: string; brand: string | null; new_price: number; listed: boolean; credit: boolean }[];
  offers_received: MarketOffer[]; offers_sent: MarketOffer[];
  sales: { name: string; amount: number; fee: number; at: string }[];
  shops: { id: string; name: string; city_id: string; owner: string; mine: boolean; stock: ShopStockItem[]; listings: number }[];
  my_business: null | { id: string; name: string; sector: string; treasury: number;
    stock: { id: string; catalog_id: string; name: string; quantity: number; price: number; unit_cost: number; new_price: number; sold_npc: number; sold_players: number }[];
    wholesale: { id: string; name: string; brand: string | null; price: number; unit_cost: number }[] };
};
export const marketQuery = queryOptions({
  queryKey: ["market", "state"], retry: false,
  queryFn: async (): Promise<MarketState> => { const { data, error } = await untyped.rpc("market_state", {}); if (error) throw new Error(error.message); return data as MarketState; },
});
export async function marketRpc<T = unknown>(fn: "store_buy" | "business_restock" | "business_stock_buy" | "market_list" | "market_cancel" | "market_offer" | "market_offer_answer" | "market_buy", args: Record<string, unknown>): Promise<T> {
  const { data, error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---- Agence immobilière : propriétaire ↔ agence ↔ locataire (agence fictive CIVITAS en secours) ----
export type Agency = { id: string; name: string; city_id: string; owner: string; mine: boolean; percent: number; rating: number | null; reviews: number };
export type AgencyListing = { id: string; name: string; rent: number; surface: string | null; rooms: string | null; dpe: string | null; district: string | null; owner: string; agency: string; agency_id: string | null; fee: number };
export type AgencyState = {
  balance: number; city_id: string; city: string;
  settings: { rent_months: number; buy_percent: number; manage_percent: number; min_percent: number; max_percent: number; ref_permille: number; period_days: number; max_unpaid: number };
  agencies: Agency[];
  listings: AgencyListing[];
  my_properties: { catalog_id: string; name: string; city_id: string; price: number; ref_rent: number; living: boolean;
    mandate: null | { id: string; status: "libre" | "loue"; rent: number; agency: string; tenant: string | null; cut: number } }[];
  my_lease: null | { id: string; title: string; rent: number; deposit: number; started_at: string; owner: string; agency: string; next_due: string; unpaid: number;
    rents: { period: number; amount: number; status: "paye" | "impaye" }[] };
  payouts: { label: string; amount: number; at: string }[];
  my_agency: null | { id: string; name: string; city_id: string; percent: number; rating: number | null; treasury: number;
    mandates: { name: string; status: string; rent: number; owner: string; tenant: string | null; cut: number }[];
    weeks: { week: number; clients: number; revenue: number }[]; orders: { reference: string; label: string; amount: number; at: string; client: string }[] };
};
export const agencyQuery = queryOptions({
  queryKey: ["agency", "state"], retry: false,
  queryFn: async (): Promise<AgencyState> => { const { data, error } = await untyped.rpc("agency_state", {}); if (error) throw new Error(error.message); return data as AgencyState; },
});
export async function agencyRpc(fn: "agency_mandate" | "agency_mandate_end" | "agency_rent" | "agency_rent_listing" | "agency_buy", args: Record<string, unknown>) {
  const needsReq = fn === "agency_rent" || fn === "agency_rent_listing" || fn === "agency_buy";
  const { data, error } = await untyped.rpc(fn, needsReq ? { ...args, _request_id: crypto.randomUUID() } : args);
  if (error) throw new Error(error.message);
  return data as { fee?: number; agency_fee?: number; deposit?: number; already?: boolean } | null;
}

// ---- Concessionnaire automobile (0084) ----
export type DealerCar = { catalog_id: string; name: string; brand: string | null; quantity: number; catalog_price: number; price: number };
export type DealerUsed = { id: string; catalog_id: string; name: string; condition: string; price: number };
export type DealerState = {
  settings: { wholesale_percent: number; trade_percent: number; used_markup: number; max_stock: number; min_percent: number; max_percent: number };
  dealers: { id: string; name: string; percent: number; rating: number | null; mine: boolean; stock: DealerCar[]; used: DealerUsed[] }[];
  my_cars: { asset_id: string; catalog_id: string; name: string; condition: string; value: number; offer: number; credit: number | null }[];
  catalog: { id: string; name: string; brand: string | null; price: number; wholesale: number }[];
  mine: null | { id: string; name: string; balance: number; stock_count: number; ops: { kind: string; name: string; quantity: number; amount: number; at: string; client: string }[] };
};
export const dealerQuery = queryOptions({
  queryKey: ["dealer", "state"], retry: false,
  queryFn: async (): Promise<DealerState> => { const { data, error } = await untyped.rpc("dealer_state", {}); if (error) throw new Error(error.message); return data as DealerState; },
});
export async function dealerRpc(fn: "dealer_restock" | "dealer_buy" | "dealer_trade_in" | "dealer_used_buy" | "dealer_set_price", args: Record<string, unknown>) {
  const { data, error } = await untyped.rpc(fn, fn === "dealer_set_price" ? args : { ...args, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data as { already?: boolean; amount?: number; cost?: number } | null;
}

// ---- Construction (0085) ----
export type BuildProperty = { catalog_id: string; name: string; price: number; surface: number; extension_m2: number; value: number; renovated_at: string | null;
  can_renovate: boolean; can_extend: boolean; renov_ref: number; renov_gain: number; ext_ref: number; ext_gain: number };
export type ConstructionState = {
  settings: { renov_percent: number; renov_gain: number; renov_days: number; ext_percent: number; ext_gain: number; ext_m2: number; ext_max: number };
  builders: { id: string; name: string; percent: number; rating: number | null; mine: boolean }[];
  properties: BuildProperty[];
  history: { kind: string; name: string; amount: number; gain: number; at: string; builder: string }[];
  mine: null | { id: string; name: string; balance: number; percent: number; works: { kind: string; name: string; amount: number; at: string; client: string }[];
    npc_weeks: { week: number; clients: number; revenue: number }[] };
};
export const constructionQuery = queryOptions({
  queryKey: ["construction", "state"], retry: false,
  queryFn: async (): Promise<ConstructionState> => { const { data, error } = await untyped.rpc("construction_state", {}); if (error) throw new Error(error.message); return data as ConstructionState; },
});
export async function orderWorks(businessId: string | null, propertyId: string, kind: "renovation" | "extension") {
  const { data, error } = await untyped.rpc("construction_order", { _business_id: businessId, _property_id: propertyId, _kind: kind, _request_id: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data as { already?: boolean; amount?: number; gain?: number } | null;
}

// ---- Recrutement (0086) : candidats volontaires, prime payée par l'employeur ----
export type RecruitOffer = { id: string; title: string; salary: number; business: string; agency: string; mine: boolean; delegated: boolean; fee: number | null; proposed: boolean };
export type RecruitState = {
  seeking: boolean; fee: number;
  agencies: { id: string; name: string; percent: number }[];
  offers: RecruitOffer[];
  mine: null | { id: string; name: string; percent: number; balance: number;
    candidates: { id: string; name: string }[];
    mandates: { id: string; title: string; business: string; fee: number }[];
    weeks: { week: number; clients: number; revenue: number }[] };
  placements: { title: string; business: string; candidate: string; amount: number; at: string }[];
};
export const recruitQuery = queryOptions({
  queryKey: ["recruitment", "state"], retry: false,
  queryFn: async (): Promise<RecruitState> => {
    const { data, error } = await untyped.rpc("recruit_state", {});
    if (error) throw new Error(error.message);
    return data as RecruitState;
  },
});
export async function recruitAction(fn: "recruit_seek" | "recruit_mandate" | "recruit_propose" | "recruit_accept" | "recruit_hire_npc", args: Record<string, unknown>) {
  const { data, error } = await untyped.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as { already?: boolean; amount?: number } | null;
}

/** Read-only district facts: plain SELECTs only, never the *_state RPCs that advance the simulation. Missing VPS tables degrade to empty lists. */
export const districtFactsQuery = (cityId: string) => queryOptions({
  queryKey: ['district-facts', cityId], staleTime: 30000, refetchInterval: 60000,
  queryFn: async (): Promise<Omit<import('@/game/districts-state').DistrictFacts, 'events'>> => {
    const safe = async <T,>(p: PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>): Promise<T[]> => {
      const { data, error } = await p; if (error) return []; return data ?? [];
    };
    const db = supabase as unknown as { from: (t: string) => any };
    const [locations, decisions, issues, crises, projects] = await Promise.all([
      safe<{ id: string; name: string; district_id: string; civic_state: string }>(supabase.from('locations').select('id, name, district_id, civic_state, district:districts!inner(city_id)').eq('district.city_id', cityId) as never),
      safe(supabase.from('public_decisions').select('id, title, district_id, location_id, workflow, completed_at').eq('city_id', cityId).in('workflow', ['running', 'completed']) as never),
      safe(supabase.from('public_issues').select('id, title, district_id, location_id, severity, status').eq('city_id', cityId).neq('status', 'resolved') as never),
      safe(db.from('crises').select('id, district_id, status').eq('city_id', cityId).neq('status', 'terminee')),
      safe(db.from('citizen_projects').select('id, title, district_id, status').eq('city_id', cityId).eq('status', 'travaux')),
    ]);
    return { locations, decisions, issues, crises, projects } as never;
  },
});

export type DistrictGauges = { gauges: { district_id: string; gauge: 'cadre' | 'tranquillite' | 'animation'; value: number }[]; history: { district_id: string; gauge: string; delta: number; reason: string; created_at: string }[] };
/** District gauges (0091). Returns null when the VPS function is not installed yet. */
export const districtGaugesQuery = (cityId: string) => queryOptions({
  queryKey: ['district-gauges', cityId], staleTime: 30000, refetchInterval: 60000,
  queryFn: async (): Promise<DistrictGauges | null> => {
    const { data, error } = await (supabase.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>)('district_gauges_state', { _city: cityId });
    if (error) { if (error.code === 'PGRST202' || error.code === '42883' || /district_gauges_state/.test(error.message)) return null; throw error; }
    return data as DistrictGauges;
  },
});

export type UnemploymentState = {
  now: string; open_day: number; close_day: number; installed_at: string; employed: boolean; registered: boolean;
  layoff: { at: string; job: string; salary: number } | null; open_period: string | null;
  declarations: { period: string; still_searching: boolean; worked: boolean; declared_at: string }[];
  payments: { week: number; amount: number; at: string }[];
};
type LooseRpc = (f: string, a?: object) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
/** Monthly actualisation (0092). Null when the VPS function is not installed yet. */
export const unemploymentQuery = queryOptions({
  queryKey: ['unemployment'], staleTime: 0, refetchInterval: 30000,
  queryFn: async (): Promise<UnemploymentState | null> => {
    const { data, error } = await (supabase.rpc as unknown as LooseRpc)('unemployment_state');
    if (error) { if (error.code === 'PGRST202' || error.code === '42883' || /unemployment_state/.test(error.message)) return null; throw new Error(error.message); }
    return data as UnemploymentState;
  },
});
export async function declareUnemployment(input: { requestId: string; stillSearching: boolean; worked: boolean }) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('unemployment_declare', { _request_id: input.requestId, _still_searching: input.stillSearching, _worked: input.worked });
  if (error) throw new Error(error.message);
  return data as string;
}

// Carrières de sécurité et de secours (0093) — état et actions via RPC sécurisées
export type SecurityService = { id: "police" | "gendarmerie" | "pompier_pro" | "pompier_vol" | "protection_civile" | "samu_ambulancier" | "samu_infirmier"; label: string; min_age: number; max_age: number; exam: boolean; training_days: number; training_monthly: number; rank_titles: string[]; rank_monthly: number[]; rank_missions: number[]; hourly_pay: number; civic_per_shift: number; exclusive_job: boolean };
export type SecurityMission = { id: string; title: string; situation: string; choices: { id: string; label: string }[] };
export type SecurityShift = { id: string; service: string; starts_at: string; ends_at: string; hours: number; mission_id: string; choice: string | null; outcome: string | null; settled: boolean };
export type SecurityState = {
  now: string; age: number; energy: number; employed: boolean;
  settings: { exam_retry_days: number; exam_energy: number; exam_pass_total: number; injury_days: number };
  services: SecurityService[];
  questions: { id: string; service: string; question: string; choices: string[] }[];
  career: null | { service: SecurityService["id"]; status: "formation" | "service" | "quitte"; team: string; rank: number; joined_at: string; trained_at: string; missions_ok: number; missions_total: number; commendations: number; complaints: number; injured_until: string | null };
  exams: { id: string; service: string; written: number; sport: number; oral: number; passed: boolean; taken_at: string }[];
  shifts: SecurityShift[];
  ledger: { key: string; kind: string; amount: number; label: string; created_at: string }[];
};
export const securityQuery = queryOptions({
  queryKey: ['security-careers'], staleTime: 0, refetchInterval: 30000,
  queryFn: async (): Promise<SecurityState | null> => {
    const { data, error } = await (supabase.rpc as unknown as LooseRpc)('security_state');
    if (error) { if (error.code === 'PGRST202' || error.code === '42883' || /security_state/.test(error.message)) return null; throw new Error(error.message); }
    return data as SecurityState;
  },
});
export const securityMissionsQuery = queryOptions({
  queryKey: ['security-missions'], staleTime: 600000,
  queryFn: async (): Promise<SecurityMission[]> => {
    const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: { message: string } | null }> } }).from('security_missions').select('id,title,situation,choices');
    if (error) return [];
    return data as SecurityMission[];
  },
});
export async function securityAction(fn: 'security_apply' | 'security_set_team' | 'security_start_shift' | 'security_choose' | 'security_quit', args: object = {}) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)(fn, args);
  if (error) throw new Error(error.message);
  return data as SecurityState;
}

// Réalisme France (0095) : médecin traitant, bulletins, permis
export type MedicalState = {
  now: string; settings: { refund_with_doctor: number; refund_without_doctor: number; refund_delay_days: number; change_days: number };
  doctor: null | { id: string; name: string; address: string; chosen_at: string };
  doctors: { id: string; name: string; address: string }[];
  refunds: { consult_day: string; cost: number; rate: number; amount: number; with_doctor: boolean; paid_at: string }[];
  pending: string[];
};
export type PayslipMonth = { month: string; employer: string; shifts: number; net: number; holidays: number };
export type DrivingState = {
  now: string; age: number; energy: number; balance: number; lessons_today: number;
  settings: { min_age: number; code_fee: number; code_pass: number; code_questions: number; lesson_price: number; lesson_energy: number; lessons_per_day: number; min_lessons: number; exam_base_pct: number; exam_pct_per_lesson: number; exam_max_pct: number; exam_retry_days: number };
  questions: { id: string; question: string; choices: string[] }[];
  license: null | { registered_at: string; code_passed_at: string | null; last_code_day: string | null; lessons: number; last_exam_at: string | null; license_at: string | null };
  history: { kind: string; result: string | null; amount: number; created_at: string }[];
};
const looseState = <T,>(fn: string) => async (): Promise<T | null> => {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)(fn);
  if (error) { if (error.code === 'PGRST202' || error.code === '42883' || error.message.includes(fn)) return null; throw new Error(error.message); }
  return data as T;
};
export const medicalQuery = queryOptions({ queryKey: ['medical'], staleTime: 0, queryFn: looseState<MedicalState>('medical_state') });
export const payslipsQuery = queryOptions({ queryKey: ['payslips'], staleTime: 0, queryFn: looseState<{ now: string; months: PayslipMonth[] }>('payslips_state') });
export type IncomeTaxState = {
  now: string;
  settings: { thresholds: number[]; rates: number[]; abatement_pct: number; late_pct: number; declare_from_month: number; declare_until_month: number };
  profile: { debt: number; paid_total: number } | null;
  current_month: { month: string; income: number };
  months: { month: string; income: number; rate: number; withheld: number }[];
  returns: { year: number; income: number; abatement: number; taxable: number; tax: number; late_fee: number; withheld: number; balance: number; kind: 'declaree' | 'automatique'; created_at: string }[];
};
export const incomeTaxQuery = queryOptions({ queryKey: ['income-tax'], staleTime: 0, queryFn: looseState<IncomeTaxState>('income_tax_state') });
export async function declareIncome(year: number) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('income_tax_declare', { _year: year });
  if (error) throw new Error(error.message);
  return data as IncomeTaxState;
}
export type TransportState = {
  now: string; month: string; balance: number; employed: boolean; license_at: string | null;
  settings: { pass_price: number; employer_pct: number; control_one_in: number; fare_fine: number; insurance_month: number; insurance_young_month: number; young_years: number; inspection_price: number; inspection_years: number; radar_pct: number; radar_fine: number; points_full: number; points_young: number };
  profile: { without_ticket: boolean; points_lost: number; debt: number; paid_total: number } | null;
  pass: { month: string; price: number; employer_refund: number } | null;
  cars: { asset_id: string; name: string; due_at: string; last_at: string | null }[];
  history: { key: string; kind: string; amount: number; label: string; unpaid: number; created_at: string }[];
};
export const transportQuery = queryOptions({ queryKey: ['transport'], staleTime: 0, queryFn: looseState<TransportState>('transport_state') });
export async function transportAction(fn: 'transit_buy_pass' | 'transport_set_without_ticket' | 'transport_inspect', args: object = {}) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)(fn, args);
  if (error) throw new Error(error.message);
  return data as TransportState;
}
export type DriveState = {
  now: string; time_speed: number; settings: { tolerance: number; fuel_per_hour: number; duration_pct: number; energy_cost: number };
  trip: null | { id: string; title: string; status: string; start_time: string; end_time: string; kind: 'voiture' | 'car' | 'train';
    drive: null | { activity_id: string; from_city: string; to_city: string; segments: { from: number; to: number; limit: number; label: string }[]; radars: { at: number; limit: number }[]; mode: string; speeds: number[] | null; flashes: number; settled: boolean } };
};
export const driveQuery = queryOptions({ queryKey: ['drive'], staleTime: 0, queryFn: looseState<DriveState>('drive_state') });
export async function travelDrive(input: { toCity: string; catalogId: string }) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('travel_drive_intercity', { _to_city: input.toCity, _catalog: input.catalogId });
  if (error) throw new Error(error.message);
  return data;
}
export async function driveReport(activity: string, speeds: number[] | null, auto = false) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('drive_report', { _activity: activity, _speeds: speeds, _auto: auto });
  if (error) throw new Error(error.message);
  return data as DriveState;
}
export type StudentProgram = { id: string; kind: 'BTS' | 'BUT' | 'Licence' | 'École'; name: string; field_id: string; years: number; min_grade: number; diploma: string };
export type StudentState = {
  now: string; age: number; path: string; progress: number;
  settings: { max_wishes: number; answer_days: number; min_age: number; scholarship: number[]; room_rent: number; pass_grade: number };
  profile: null | { hs_average: number; family_income: number; scholarship_level: number; program_id: string | null; year: number; year_started_at: string | null; retake_open: boolean };
  programs: StudentProgram[];
  wishes: { program_id: string; answer: 'attente_reponse' | 'oui' | 'en_attente' | 'non' | 'acceptee' | 'renoncee'; answer_at: string }[];
  room: null | { status: 'attribuee' | 'refusee'; residence: string; since: string };
  ledger: { key: string; kind: string; amount: number; grade: number | null; label: string; created_at: string }[];
};
export const studentQuery = queryOptions({ queryKey: ['student'], staleTime: 0, queryFn: looseState<StudentState>('student_state') });
export async function studentAction(fn: 'student_wish' | 'student_accept' | 'student_retake' | 'student_room_request', args: object = {}) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)(fn, args);
  if (error) throw new Error(error.message);
  return data as StudentState;
}
export const drivingQuery = queryOptions({ queryKey: ['driving'], staleTime: 0, queryFn: looseState<DrivingState>('driving_state') });
export async function realismAction<T>(fn: 'medical_choose_doctor' | 'driving_register' | 'driving_code' | 'driving_lesson' | 'driving_exam', args: object = {}) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export type AgingState = { age: number; next_birthday: string | null; new_birthday: boolean; birthdays: { age: number; at: string }[] };
export const agingQuery = queryOptions({ queryKey: ['aging'], staleTime: 60_000, retry: false, queryFn: looseState<AgingState>('aging_state') });
export type VehicleWearState = {
  settings: { breakdown_below: number; breakdown_pct: number; tow_price: number; repair_permille_per_10: number };
  cars: { catalog_id: string; name: string; condition_pct: number; repair_ref: number }[];
  garages: { id: string; name: string; percent: number; rating: number | null }[];
  history: { kind: 'usure' | 'panne' | 'reparation'; delta: number; amount: number; label: string; at: string }[];
};
export const vehicleWearQuery = queryOptions({ queryKey: ['vehicle-wear'], staleTime: 0, retry: false, queryFn: looseState<VehicleWearState>('vehicle_wear_state') });
export async function repairVehicle(catalogId: string, businessId: string | null) {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('vehicle_repair', { _catalog: catalogId, _business: businessId, _request: crypto.randomUUID() });
  if (error) throw new Error(error.message);
  return data as VehicleWearState;
}
export type RetirementState = {
  age: number; employed: boolean; retired_at: string | null; monthly_pension: number | null;
  settings: { legal_age: number; quarter_gross: number; full_quarters: number; base_rate: number; best_years: number };
  estimate: { quarters: number; points: number; average_salary: number; base_monthly: number; compl_monthly: number; monthly: number };
  years: { age: number; gross_annual: number; quarters: number; points: number }[];
  payments: { month: string; amount: number }[];
};
export const retirementQuery = queryOptions({ queryKey: ['retirement'], staleTime: 0, retry: false, queryFn: looseState<RetirementState>('retirement_state') });
export async function claimRetirement() {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('retirement_claim', {});
  if (error) throw new Error(error.message);
  return data as RetirementState;
}

export type EconomyState = {
  smic: number;
  treasury: { balance: number; debt: number; income: number; expenses: number };
  history: { month: string; inflation: number; cpi: number; smic: number; unemployment: number; growth: number; budget: number; debt: number }[];
  cities: { id: string; name: string; food: number; rent: number; fuel: number }[];
  city_history: { city_id: string; month: string; food: number; rent: number; fuel: number }[];
};
export const economyQuery = queryOptions({ queryKey: ['economy', 'conjoncture'], staleTime: 30_000, queryFn: async (): Promise<EconomyState> => {
  const { data, error } = await (supabase.rpc as unknown as LooseRpc)('economy_state', {});
  if (error) throw new Error(error.message);
  return data as EconomyState;
} });
