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
export type TvSegment = { id: string; kind: "news" | "interview"; title: string; body: string; news_id: string | null };
export type TvState = { date: string; city_id: string; local: TvSegment[]; national: TvSegment[]; invitations: { id: string; question: string; deadline: string; answer: string | null; scope: string }[] };
export const tvQuery = (cityId?: string) => queryOptions({
  queryKey: ["tv", "state", cityId ?? "mine"],
  queryFn: async (): Promise<TvState> => {
    const { data, error } = await untyped.rpc("tv_state", { _city: cityId ?? null });
    if (error) throw new Error(error.message);
    return data as TvState;
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
  contracts: { id: string; product_id: string; name: string; covers: string[]; status: "active" | "suspended"; monthly_price: number; covered_from: string; next_due_at: string }[];
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
