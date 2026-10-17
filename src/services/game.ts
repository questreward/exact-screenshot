import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Appearance } from "@/game/appearance";
import type { PathId } from "@/game/rules";

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
  language?: string; notifications_enabled?: boolean; reduced_motion?: boolean; profile_public?: boolean;
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
