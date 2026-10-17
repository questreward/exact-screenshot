import type { Tables } from "@/integrations/supabase/types";
export type LifeLocation = Tables<"locations">;
export type LifeActivity = Tables<"activities"> & { location: LifeLocation };
export type LifeState = {
  world_now: string;
  character: Tables<"characters">;
  settings: Tables<"life_settings">;
  rules: Tables<"life_rules">[];
  fields: Tables<"study_fields">[];
  housing_types: Tables<"housing_types">[];
  housing: (Tables<"character_housing"> & { name: string; daily_cost: number; location: LifeLocation }) | null;
  enrollment: (Tables<"study_enrollments"> & { field_name: string; skill: string; location: LifeLocation }) | null;
  employment: (Tables<"employments"> & { job: Tables<"jobs">; location: LifeLocation }) | null;
  offers: (Tables<"jobs"> & { location: LifeLocation; employer: string })[];
  applications: (Tables<"job_applications"> & { job_title: string })[];
  activities: LifeActivity[];
  position: Tables<"character_positions">;
};