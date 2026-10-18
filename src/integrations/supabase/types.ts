export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          character_id: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          balance?: number
          character_id: string
          created_at?: string
          id?: string
          label?: string
        }
        Update: {
          balance?: number
          character_id?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          character_id: string
          civic_engagement_gain: number
          created_at: string
          end_time: string
          energy_cost: number
          energy_gain: number
          id: string
          location_id: string
          money_cost: number
          organization_event_id: string | null
          political_engagement_gain: number
          political_influence_gain: number
          political_reputation_gain: number
          progression_gain: number
          reward: number
          social_influence_gain: number
          social_npc_id: string | null
          social_relation_gain: number
          social_reputation_gain: number
          source_key: string | null
          start_time: string
          status: string
          target_location_id: string | null
          title: string
          type: string
        }
        Insert: {
          character_id: string
          civic_engagement_gain?: number
          created_at?: string
          end_time: string
          energy_cost?: number
          energy_gain?: number
          id?: string
          location_id: string
          money_cost?: number
          organization_event_id?: string | null
          political_engagement_gain?: number
          political_influence_gain?: number
          political_reputation_gain?: number
          progression_gain?: number
          reward?: number
          social_influence_gain?: number
          social_npc_id?: string | null
          social_relation_gain?: number
          social_reputation_gain?: number
          source_key?: string | null
          start_time: string
          status?: string
          target_location_id?: string | null
          title: string
          type: string
        }
        Update: {
          character_id?: string
          civic_engagement_gain?: number
          created_at?: string
          end_time?: string
          energy_cost?: number
          energy_gain?: number
          id?: string
          location_id?: string
          money_cost?: number
          organization_event_id?: string | null
          political_engagement_gain?: number
          political_influence_gain?: number
          political_reputation_gain?: number
          progression_gain?: number
          reward?: number
          social_influence_gain?: number
          social_npc_id?: string | null
          social_relation_gain?: number
          social_reputation_gain?: number
          source_key?: string | null
          start_time?: string
          status?: string
          target_location_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_event_id_fkey"
            columns: ["organization_event_id"]
            isOneToOne: false
            referencedRelation: "organization_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_social_npc_id_fkey"
            columns: ["social_npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "life_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      character_housing: {
        Row: {
          character_id: string
          last_paid_date: string | null
          location_id: string
          type_id: string
        }
        Insert: {
          character_id: string
          last_paid_date?: string | null
          location_id: string
          type_id: string
        }
        Update: {
          character_id?: string
          last_paid_date?: string | null
          location_id?: string
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_housing_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_housing_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_housing_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "housing_types"
            referencedColumns: ["id"]
          },
        ]
      }
      character_positions: {
        Row: {
          character_id: string
          city_id: string
          district_id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          character_id: string
          city_id: string
          district_id: string
          location_id: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          city_id?: string
          district_id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_positions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_positions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_positions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_positions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number
          appearance: Json
          city_id: string
          created_at: string
          energy: number
          first_name: string
          id: string
          last_name: string
          path_id: string
          progression: Json
          situation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          appearance?: Json
          city_id: string
          created_at?: string
          energy?: number
          first_name: string
          id?: string
          last_name: string
          path_id: string
          progression?: Json
          situation?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          appearance?: Json
          city_id?: string
          created_at?: string
          energy?: number
          first_name?: string
          id?: string
          last_name?: string
          path_id?: string
          progression?: Json
          situation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "starting_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          available: boolean
          description: string
          id: string
          illustration: string | null
          map_x: number
          map_y: number
          name: string
          population: number
          region: string
          sort_order: number
        }
        Insert: {
          available?: boolean
          description?: string
          id: string
          illustration?: string | null
          map_x?: number
          map_y?: number
          name: string
          population?: number
          region: string
          sort_order?: number
        }
        Update: {
          available?: boolean
          description?: string
          id?: string
          illustration?: string | null
          map_x?: number
          map_y?: number
          name?: string
          population?: number
          region?: string
          sort_order?: number
        }
        Relationships: []
      }
      citizen_reports: {
        Row: {
          character_id: string
          created_at: string
          description: string
          id: string
          issue_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          description: string
          id?: string
          issue_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citizen_reports_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citizen_reports_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "public_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      city_weather: {
        Row: {
          city_id: string
          condition: string
          simulated: boolean
          temperature: number
          updated_at: string
          wind_speed: number
        }
        Insert: {
          city_id: string
          condition?: string
          simulated?: boolean
          temperature?: number
          updated_at?: string
          wind_speed?: number
        }
        Update: {
          city_id?: string
          condition?: string
          simulated?: boolean
          temperature?: number
          updated_at?: string
          wind_speed?: number
        }
        Relationships: [
          {
            foreignKeyName: "city_weather_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: true
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_rewards: {
        Row: {
          amount: number
          character_id: string
          kind: string
          occurred_at: string
          reward_key: string
        }
        Insert: {
          amount: number
          character_id: string
          kind: string
          occurred_at?: string
          reward_key: string
        }
        Update: {
          amount?: number
          character_id?: string
          kind?: string
          occurred_at?: string
          reward_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_rewards_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_settings: {
        Row: {
          association_gain: number
          consultation_days: number
          consultation_gain: number
          event_duration_minutes: number
          event_energy_cost: number
          event_gain: number
          event_influence_gain: number
          event_relation_gain: number
          event_reputation_gain: number
          event_start_hour: number
          id: number
          issue_stage_hours: number
          report_cooldown_minutes: number
          report_gain: number
          reports_per_day: number
        }
        Insert: {
          association_gain?: number
          consultation_days?: number
          consultation_gain?: number
          event_duration_minutes?: number
          event_energy_cost?: number
          event_gain?: number
          event_influence_gain?: number
          event_relation_gain?: number
          event_reputation_gain?: number
          event_start_hour?: number
          id?: number
          issue_stage_hours?: number
          report_cooldown_minutes?: number
          report_gain?: number
          reports_per_day?: number
        }
        Update: {
          association_gain?: number
          consultation_days?: number
          consultation_gain?: number
          event_duration_minutes?: number
          event_energy_cost?: number
          event_gain?: number
          event_influence_gain?: number
          event_relation_gain?: number
          event_reputation_gain?: number
          event_start_hour?: number
          id?: number
          issue_stage_hours?: number
          report_cooldown_minutes?: number
          report_gain?: number
          reports_per_day?: number
        }
        Relationships: []
      }
      civic_stats: {
        Row: {
          character_id: string
          engagement: number
        }
        Insert: {
          character_id: string
          engagement?: number
        }
        Update: {
          character_id?: string
          engagement?: number
        }
        Relationships: [
          {
            foreignKeyName: "civic_stats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_options: {
        Row: {
          consequence: string
          consultation_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          consequence: string
          consultation_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          consequence?: string
          consultation_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultation_options_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_participations: {
        Row: {
          character_id: string
          consultation_id: string
          option_id: string
          participated_at: string
        }
        Insert: {
          character_id: string
          consultation_id: string
          option_id: string
          participated_at?: string
        }
        Update: {
          character_id?: string
          consultation_id?: string
          option_id?: string
          participated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_participations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_participations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_participations_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "consultation_options"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          city_id: string
          closed_at: string | null
          consultation_key: string | null
          description: string
          district_id: string | null
          ends_at: string
          id: string
          institution_id: string
          issue_id: string | null
          location_id: string
          organization_id: string | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          city_id: string
          closed_at?: string | null
          consultation_key?: string | null
          description: string
          district_id?: string | null
          ends_at: string
          id?: string
          institution_id: string
          issue_id?: string | null
          location_id: string
          organization_id?: string | null
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          city_id?: string
          closed_at?: string | null
          consultation_key?: string | null
          description?: string
          district_id?: string | null
          ends_at?: string
          id?: string
          institution_id?: string
          issue_id?: string | null
          location_id?: string
          organization_id?: string | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "public_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          available: boolean
          city_id: string
          description: string
          id: string
          map_x: number
          map_y: number
          name: string
          sort_order: number
        }
        Insert: {
          available?: boolean
          city_id: string
          description?: string
          id: string
          map_x?: number
          map_y?: number
          name: string
          sort_order?: number
        }
        Update: {
          available?: boolean
          city_id?: string
          description?: string
          id?: string
          map_x?: number
          map_y?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      employments: {
        Row: {
          character_id: string
          job_id: string
          progress: number
          skills: Json
          started_at: string
          status: string
        }
        Insert: {
          character_id: string
          job_id: string
          progress?: number
          skills?: Json
          started_at: string
          status?: string
        }
        Update: {
          character_id?: string
          job_id?: string
          progress?: number
          skills?: Json
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          city_id: string | null
          created_at: string
          description: string
          event_key: string | null
          id: string
          image: string | null
          importance: number
          location_id: string | null
          news_body: string | null
          news_summary: string | null
          news_title: string | null
          organization_event_id: string | null
          organization_id: string | null
          region: string | null
          scope: string
          source_id: string | null
          starts_at: string | null
          status: string
          target_kind: string
          title: string
        }
        Insert: {
          category?: string
          city_id?: string | null
          created_at?: string
          description?: string
          event_key?: string | null
          id?: string
          image?: string | null
          importance?: number
          location_id?: string | null
          news_body?: string | null
          news_summary?: string | null
          news_title?: string | null
          organization_event_id?: string | null
          organization_id?: string | null
          region?: string | null
          scope?: string
          source_id?: string | null
          starts_at?: string | null
          status?: string
          target_kind?: string
          title: string
        }
        Update: {
          category?: string
          city_id?: string | null
          created_at?: string
          description?: string
          event_key?: string | null
          id?: string
          image?: string | null
          importance?: number
          location_id?: string | null
          news_body?: string | null
          news_summary?: string | null
          news_title?: string | null
          organization_event_id?: string | null
          organization_id?: string | null
          region?: string | null
          scope?: string
          source_id?: string | null
          starts_at?: string | null
          status?: string
          target_kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_event_id_fkey"
            columns: ["organization_event_id"]
            isOneToOne: false
            referencedRelation: "organization_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_types: {
        Row: {
          daily_cost: number
          id: string
          name: string
        }
        Insert: {
          daily_cost: number
          id: string
          name: string
        }
        Update: {
          daily_cost?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          address: string
          city_id: string
          description: string
          id: string
          institution_key: string
          level: string
          location_id: string
          name: string
          opening_hours: string
          parent_id: string | null
          responsible: string
          role: string
          service_state: string
          status: string
          type: string
          visibility: string
        }
        Insert: {
          address: string
          city_id: string
          description: string
          id?: string
          institution_key: string
          level?: string
          location_id: string
          name: string
          opening_hours: string
          parent_id?: string | null
          responsible?: string
          role: string
          service_state?: string
          status?: string
          type: string
          visibility?: string
        }
        Update: {
          address?: string
          city_id?: string
          description?: string
          id?: string
          institution_key?: string
          level?: string
          location_id?: string
          name?: string
          opening_hours?: string
          parent_id?: string | null
          responsible?: string
          role?: string
          service_state?: string
          status?: string
          type?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_history: {
        Row: {
          description: string
          id: string
          issue_id: string
          occurred_at: string
          status: string
        }
        Insert: {
          description: string
          id?: string
          issue_id: string
          occurred_at?: string
          status: string
        }
        Update: {
          description?: string
          id?: string
          issue_id?: string
          occurred_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "public_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string
          character_id: string
          id: string
          job_id: string
          response_at: string
          status: string
        }
        Insert: {
          applied_at: string
          character_id: string
          id?: string
          job_id: string
          response_at: string
          status?: string
        }
        Update: {
          applied_at?: string
          character_id?: string
          id?: string
          job_id?: string
          response_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          city_id: string | null
          created_at: string
          description: string
          id: string
          location_id: string | null
          min_age: number
          organization_id: string | null
          required_skill: string
          salary: number
          skill_min: number
          title: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location_id?: string | null
          min_age?: number
          organization_id?: string | null
          required_skill?: string
          salary?: number
          skill_min?: number
          title: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location_id?: string | null
          min_age?: number
          organization_id?: string | null
          required_skill?: string
          salary?: number
          skill_min?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      life_rules: {
        Row: {
          allowed_kinds: string[]
          duration_minutes: number
          energy_cost: number
          energy_gain: number
          id: string
          money_cost: number
          progression_gain: number
          title: string
        }
        Insert: {
          allowed_kinds?: string[]
          duration_minutes?: number
          energy_cost?: number
          energy_gain?: number
          id: string
          money_cost?: number
          progression_gain?: number
          title: string
        }
        Update: {
          allowed_kinds?: string[]
          duration_minutes?: number
          energy_cost?: number
          energy_gain?: number
          id?: string
          money_cost?: number
          progression_gain?: number
          title?: string
        }
        Relationships: []
      }
      life_settings: {
        Row: {
          course_end: number
          course_start: number
          id: number
          max_energy: number
          paid_shifts_month: number
          response_minutes: number
          work_end: number
          work_start: number
        }
        Insert: {
          course_end?: number
          course_start?: number
          id?: number
          max_energy?: number
          paid_shifts_month?: number
          response_minutes?: number
          work_end?: number
          work_start?: number
        }
        Update: {
          course_end?: number
          course_start?: number
          id?: number
          max_energy?: number
          paid_shifts_month?: number
          response_minutes?: number
          work_end?: number
          work_start?: number
        }
        Relationships: []
      }
      location_spaces: {
        Row: {
          accessible: boolean
          id: string
          kind: string
          location_id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          accessible?: boolean
          id?: string
          kind?: string
          location_id: string
          name: string
          parent_id?: string | null
        }
        Update: {
          accessible?: boolean
          id?: string
          kind?: string
          location_id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_spaces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "location_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          accessible: boolean
          city_id: string
          civic_project: string | null
          civic_state: string
          created_at: string
          description: string
          district_id: string | null
          id: string
          illustration: string | null
          kind: string
          map_x: number
          map_y: number
          name: string
          opening_hours: string | null
        }
        Insert: {
          accessible?: boolean
          city_id: string
          civic_project?: string | null
          civic_state?: string
          created_at?: string
          description?: string
          district_id?: string | null
          id?: string
          illustration?: string | null
          kind: string
          map_x?: number
          map_y?: number
          name: string
          opening_hours?: string | null
        }
        Update: {
          accessible?: boolean
          city_id?: string
          civic_project?: string | null
          civic_state?: string
          created_at?: string
          description?: string
          district_id?: string | null
          id?: string
          illustration?: string | null
          kind?: string
          map_x?: number
          map_y?: number
          name?: string
          opening_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          action: string
          character_id: string
          id: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          action: string
          character_id: string
          id?: string
          occurred_at: string
          organization_id: string
        }
        Update: {
          action?: string
          character_id?: string
          id?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          character_id: string
          id: string
          joined_at: string
          left_at: string | null
          organization_id: string
          progress: number
          role: string
          status: string
        }
        Insert: {
          character_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          organization_id: string
          progress?: number
          role?: string
          status?: string
        }
        Update: {
          character_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          organization_id?: string
          progress?: number
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author: string
          body: string
          category: string
          city_id: string | null
          event_id: string | null
          id: string
          image: string | null
          importance: number
          location_id: string | null
          organization_id: string | null
          published_at: string
          region: string | null
          related_entities: Json
          scope: string
          source_id: string | null
          status: string
          summary: string
          title: string
        }
        Insert: {
          author?: string
          body?: string
          category?: string
          city_id?: string | null
          event_id?: string | null
          id?: string
          image?: string | null
          importance?: number
          location_id?: string | null
          organization_id?: string | null
          published_at?: string
          region?: string | null
          related_entities?: Json
          scope?: string
          source_id?: string | null
          status?: string
          summary?: string
          title: string
        }
        Update: {
          author?: string
          body?: string
          category?: string
          city_id?: string | null
          event_id?: string | null
          id?: string
          image?: string | null
          importance?: number
          location_id?: string | null
          organization_id?: string | null
          published_at?: string
          region?: string | null
          related_entities?: Json
          scope?: string
          source_id?: string | null
          status?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_bookmarks: {
        Row: {
          news_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          news_id: string
          saved_at?: string
          user_id?: string
        }
        Update: {
          news_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_bookmarks_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_reads: {
        Row: {
          news_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          news_id: string
          read_at?: string
          user_id?: string
        }
        Update: {
          news_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_reads_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_settings: {
        Row: {
          archive_days: number
          generation_days: number
          id: number
          important_threshold: number
          new_hours: number
          notification_cooldown_hours: number
          page_size: number
          recent_hours: number
        }
        Insert: {
          archive_days?: number
          generation_days?: number
          id?: number
          important_threshold?: number
          new_hours?: number
          notification_cooldown_hours?: number
          page_size?: number
          recent_hours?: number
        }
        Update: {
          archive_days?: number
          generation_days?: number
          id?: number
          important_threshold?: number
          new_hours?: number
          notification_cooldown_hours?: number
          page_size?: number
          recent_hours?: number
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          city_id: string | null
          description: string
          id: string
          kind: string
          logo: string | null
          name: string
          reputation: number
          scope: string
          status: string
        }
        Insert: {
          city_id?: string | null
          description?: string
          id: string
          kind?: string
          logo?: string | null
          name: string
          reputation?: number
          scope?: string
          status?: string
        }
        Update: {
          city_id?: string | null
          description?: string
          id?: string
          kind?: string
          logo?: string | null
          name?: string
          reputation?: number
          scope?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_sources_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          news_id: string | null
          read: boolean
          title: string
          user_id: string
          world_at: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          news_id?: string | null
          read?: boolean
          title: string
          user_id: string
          world_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          news_id?: string | null
          read?: boolean
          title?: string
          user_id?: string
          world_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_events: {
        Row: {
          civic: boolean
          description: string
          duration_minutes: number
          energy_cost: number
          id: string
          influence_gain: number
          institution_id: string | null
          location_id: string
          organization_id: string
          political_engagement_gain: number
          political_influence_gain: number
          political_kind: string | null
          political_reputation_gain: number
          relation_gain: number
          reputation_gain: number
          start_hour: number
          status: string
          title: string
        }
        Insert: {
          civic?: boolean
          description: string
          duration_minutes?: number
          energy_cost?: number
          id?: string
          influence_gain?: number
          institution_id?: string | null
          location_id: string
          organization_id: string
          political_engagement_gain?: number
          political_influence_gain?: number
          political_kind?: string | null
          political_reputation_gain?: number
          relation_gain?: number
          reputation_gain?: number
          start_hour?: number
          status?: string
          title: string
        }
        Update: {
          civic?: boolean
          description?: string
          duration_minutes?: number
          energy_cost?: number
          id?: string
          influence_gain?: number
          institution_id?: string | null
          location_id?: string
          organization_id?: string
          political_engagement_gain?: number
          political_influence_gain?: number
          political_kind?: string | null
          political_reputation_gain?: number
          relation_gain?: number
          reputation_gain?: number
          start_hour?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city_id: string | null
          created_at: string
          description: string
          id: string
          influence: number
          kind: string
          location_id: string | null
          name: string
          reputation: number
          scope: string | null
          status: string
          symbol: string | null
          visibility: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          influence?: number
          kind: string
          location_id?: string | null
          name: string
          reputation?: number
          scope?: string | null
          status?: string
          symbol?: string | null
          visibility?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          influence?: number
          kind?: string
          location_id?: string | null
          name?: string
          reputation?: number
          scope?: string | null
          status?: string
          symbol?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      political_axes: {
        Row: {
          high_label: string
          id: string
          label: string
          low_label: string
          sort_order: number
        }
        Insert: {
          high_label: string
          id: string
          label: string
          low_label: string
          sort_order?: number
        }
        Update: {
          high_label?: string
          id?: string
          label?: string
          low_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      political_branches: {
        Row: {
          city_id: string
          id: string
          kind: string
          location_id: string
          organization_id: string
        }
        Insert: {
          city_id: string
          id?: string
          kind: string
          location_id: string
          organization_id: string
        }
        Update: {
          city_id?: string
          id?: string
          kind?: string
          location_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "political_branches_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_branches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      political_opinions: {
        Row: {
          character_id: string
          stance: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          character_id: string
          stance: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          stance?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "political_opinions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_opinions_stance_fkey"
            columns: ["stance"]
            isOneToOne: false
            referencedRelation: "political_stances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_opinions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "political_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      political_profiles: {
        Row: {
          core_values: string[]
          ideology: Json
          organization_id: string
          priorities: string[]
          slogan: string
        }
        Insert: {
          core_values?: string[]
          ideology: Json
          organization_id: string
          priorities?: string[]
          slogan?: string
        }
        Update: {
          core_values?: string[]
          ideology?: Json
          organization_id?: string
          priorities?: string[]
          slogan?: string
        }
        Relationships: [
          {
            foreignKeyName: "political_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      political_rewards: {
        Row: {
          character_id: string
          engagement: number
          influence: number
          interest: number
          kind: string
          label: string
          occurred_at: string
          reputation: number
          reward_key: string
        }
        Insert: {
          character_id: string
          engagement?: number
          influence?: number
          interest?: number
          kind: string
          label?: string
          occurred_at?: string
          reputation?: number
          reward_key: string
        }
        Update: {
          character_id?: string
          engagement?: number
          influence?: number
          interest?: number
          kind?: string
          label?: string
          occurred_at?: string
          reputation?: number
          reward_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "political_rewards_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      political_roles: {
        Row: {
          id: string
          label: string
          min_progress: number
          min_reputation: number
          player_start: boolean
          rank: number
        }
        Insert: {
          id: string
          label: string
          min_progress?: number
          min_reputation?: number
          player_start?: boolean
          rank: number
        }
        Update: {
          id?: string
          label?: string
          min_progress?: number
          min_reputation?: number
          player_start?: boolean
          rank?: number
        }
        Relationships: []
      }
      political_settings: {
        Row: {
          activity_interest_gain: number
          id: number
          influence_reputation_bonus: number
          influence_reputation_threshold: number
          join_engagement_gain: number
          join_interest_gain: number
          opinion_interest_gain: number
          single_party: boolean
          stat_cap: number
        }
        Insert: {
          activity_interest_gain?: number
          id?: number
          influence_reputation_bonus?: number
          influence_reputation_threshold?: number
          join_engagement_gain?: number
          join_interest_gain?: number
          opinion_interest_gain?: number
          single_party?: boolean
          stat_cap?: number
        }
        Update: {
          activity_interest_gain?: number
          id?: number
          influence_reputation_bonus?: number
          influence_reputation_threshold?: number
          join_engagement_gain?: number
          join_interest_gain?: number
          opinion_interest_gain?: number
          single_party?: boolean
          stat_cap?: number
        }
        Relationships: []
      }
      political_stances: {
        Row: {
          id: string
          label: string
          sort_order: number
          target: number | null
        }
        Insert: {
          id: string
          label: string
          sort_order?: number
          target?: number | null
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          target?: number | null
        }
        Relationships: []
      }
      political_stats: {
        Row: {
          character_id: string
          engagement: number
          influence: number
          interest: number
          reputation: number
        }
        Insert: {
          character_id: string
          engagement?: number
          influence?: number
          interest?: number
          reputation?: number
        }
        Update: {
          character_id?: string
          engagement?: number
          influence?: number
          interest?: number
          reputation?: number
        }
        Relationships: [
          {
            foreignKeyName: "political_stats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      political_topics: {
        Row: {
          axis_id: string
          description: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          axis_id: string
          description: string
          id: string
          label: string
          sort_order?: number
        }
        Update: {
          axis_id?: string
          description?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "political_topics_axis_id_fkey"
            columns: ["axis_id"]
            isOneToOne: false
            referencedRelation: "political_axes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_decisions: {
        Row: {
          applied_at: string | null
          category: string
          city_id: string
          consequences: Json
          consultation_id: string | null
          decided_at: string
          decision_key: string
          description: string
          district_id: string | null
          id: string
          institution_id: string
          issue_id: string | null
          location_id: string
          news_id: string | null
          status: string
          title: string
        }
        Insert: {
          applied_at?: string | null
          category?: string
          city_id: string
          consequences?: Json
          consultation_id?: string | null
          decided_at?: string
          decision_key: string
          description: string
          district_id?: string | null
          id?: string
          institution_id: string
          issue_id?: string | null
          location_id: string
          news_id?: string | null
          status?: string
          title: string
        }
        Update: {
          applied_at?: string | null
          category?: string
          city_id?: string
          consequences?: Json
          consultation_id?: string | null
          decided_at?: string
          decision_key?: string
          description?: string
          district_id?: string | null
          id?: string
          institution_id?: string
          issue_id?: string | null
          location_id?: string
          news_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_decisions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "public_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_decisions_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      public_issues: {
        Row: {
          appeared_at: string
          category: string
          city_id: string
          description: string
          district_id: string
          id: string
          institution_id: string
          issue_key: string | null
          location_id: string
          news_id: string | null
          severity: number
          stage: number
          stage_hours: number
          status: string
          title: string
        }
        Insert: {
          appeared_at?: string
          category: string
          city_id: string
          description: string
          district_id: string
          id?: string
          institution_id: string
          issue_key?: string | null
          location_id: string
          news_id?: string | null
          severity?: number
          stage?: number
          stage_hours?: number
          status?: string
          title: string
        }
        Update: {
          appeared_at?: string
          category?: string
          city_id?: string
          description?: string
          district_id?: string
          id?: string
          institution_id?: string
          issue_key?: string | null
          location_id?: string
          news_id?: string | null
          severity?: number
          stage?: number
          stage_hours?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_issues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_issues_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_issues_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_issues_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_issues_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      social_interactions: {
        Row: {
          action_id: string
          character_id: string
          id: string
          npc_id: string
          occurred_at: string
          relation_gain: number
        }
        Insert: {
          action_id: string
          character_id: string
          id?: string
          npc_id: string
          occurred_at: string
          relation_gain: number
        }
        Update: {
          action_id?: string
          character_id?: string
          id?: string
          npc_id?: string
          occurred_at?: string
          relation_gain?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_interactions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "social_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_interactions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_interactions_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_npcs: {
        Row: {
          age: number
          appearance: Json
          city_id: string
          description: string
          district_id: string
          first_name: string
          id: string
          influence: number
          last_name: string
          location_id: string
          organization_id: string | null
          political_role: string | null
          profession: string
          reputation: number
          traits: string[]
        }
        Insert: {
          age: number
          appearance?: Json
          city_id: string
          description: string
          district_id: string
          first_name: string
          id?: string
          influence?: number
          last_name: string
          location_id: string
          organization_id?: string | null
          political_role?: string | null
          profession: string
          reputation?: number
          traits?: string[]
        }
        Update: {
          age?: number
          appearance?: Json
          city_id?: string
          description?: string
          district_id?: string
          first_name?: string
          id?: string
          influence?: number
          last_name?: string
          location_id?: string
          organization_id?: string | null
          political_role?: string | null
          profession?: string
          reputation?: number
          traits?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "social_npcs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_npcs_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_npcs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_npcs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_participations: {
        Row: {
          activity_id: string
          character_id: string
          event_id: string | null
          npc_id: string | null
          rewarded_at: string | null
          status: string
        }
        Insert: {
          activity_id: string
          character_id: string
          event_id?: string | null
          npc_id?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          activity_id?: string
          character_id?: string
          event_id?: string | null
          npc_id?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_participations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_participations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "organization_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_participations_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_relations: {
        Row: {
          character_id: string
          id: string
          last_interaction: string | null
          met_at: string
          npc_id: string
          score: number
          status: string
        }
        Insert: {
          character_id: string
          id?: string
          last_interaction?: string | null
          met_at: string
          npc_id: string
          score?: number
          status?: string
        }
        Update: {
          character_id?: string
          id?: string
          last_interaction?: string | null
          met_at?: string
          npc_id?: string
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_relations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_relations_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_rules: {
        Row: {
          activity_energy_cost: number
          activity_influence_gain: number
          activity_relation_gain: number
          activity_reputation_gain: number
          cooldown_minutes: number
          duration_minutes: number
          energy_cost: number
          id: string
          influence_gain: number
          min_score: number
          relation_gain: number
          reputation_gain: number
          title: string
        }
        Insert: {
          activity_energy_cost?: number
          activity_influence_gain?: number
          activity_relation_gain?: number
          activity_reputation_gain?: number
          cooldown_minutes?: number
          duration_minutes?: number
          energy_cost?: number
          id: string
          influence_gain?: number
          min_score?: number
          relation_gain?: number
          reputation_gain?: number
          title: string
        }
        Update: {
          activity_energy_cost?: number
          activity_influence_gain?: number
          activity_relation_gain?: number
          activity_reputation_gain?: number
          cooldown_minutes?: number
          duration_minutes?: number
          energy_cost?: number
          id?: string
          influence_gain?: number
          min_score?: number
          relation_gain?: number
          reputation_gain?: number
          title?: string
        }
        Relationships: []
      }
      social_stats: {
        Row: {
          character_id: string
          influence: number
          reputation: number
        }
        Insert: {
          character_id: string
          influence?: number
          reputation?: number
        }
        Update: {
          character_id?: string
          influence?: number
          reputation?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_stats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      starting_paths: {
        Row: {
          description: string
          id: string
          initial_situation: string
          max_age: number
          min_age: number
          name: string
          sort_order: number
          starting_money: number
        }
        Insert: {
          description: string
          id: string
          initial_situation: string
          max_age: number
          min_age: number
          name: string
          sort_order?: number
          starting_money: number
        }
        Update: {
          description?: string
          id?: string
          initial_situation?: string
          max_age?: number
          min_age?: number
          name?: string
          sort_order?: number
          starting_money?: number
        }
        Relationships: []
      }
      study_enrollments: {
        Row: {
          character_id: string
          enrolled_at: string
          field_id: string
          location_id: string
          progress: number
          semester: number
          skills: Json
        }
        Insert: {
          character_id: string
          enrolled_at?: string
          field_id: string
          location_id: string
          progress?: number
          semester?: number
          skills?: Json
        }
        Update: {
          character_id?: string
          enrolled_at?: string
          field_id?: string
          location_id?: string
          progress?: number
          semester?: number
          skills?: Json
        }
        Relationships: [
          {
            foreignKeyName: "study_enrollments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_enrollments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "study_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_enrollments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      study_fields: {
        Row: {
          description: string
          id: string
          name: string
          skill: string
        }
        Insert: {
          description?: string
          id: string
          name: string
          skill: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          skill?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          label: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          language: string
          news_notifications: boolean
          news_personalized: boolean
          notifications_enabled: boolean
          profile_public: boolean
          reduced_motion: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          language?: string
          news_notifications?: boolean
          news_personalized?: boolean
          notifications_enabled?: boolean
          profile_public?: boolean
          reduced_motion?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          language?: string
          news_notifications?: boolean
          news_personalized?: boolean
          notifications_enabled?: boolean
          profile_public?: boolean
          reduced_motion?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      world_state: {
        Row: {
          clock_started_at: string
          id: number
          season: string
          time_speed: number
          updated_at: string
          world_date: string
          world_time: string
        }
        Insert: {
          clock_started_at?: string
          id?: number
          season?: string
          time_speed?: number
          updated_at?: string
          world_date?: string
          world_time?: string
        }
        Update: {
          clock_started_at?: string
          id?: number
          season?: string
          time_speed?: number
          updated_at?: string
          world_date?: string
          world_time?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_job: { Args: { _job_id: string }; Returns: undefined }
      award_civic: {
        Args: { _amount: number; _cid: string; _key: string; _kind: string }
        Returns: undefined
      }
      award_political: {
        Args: {
          _cid: string
          _eng: number
          _inf: number
          _interest: number
          _key: string
          _kind: string
          _label: string
          _rep: number
        }
        Returns: boolean
      }
      bookmark_news: {
        Args: { _news_id: string; _saved: boolean }
        Returns: undefined
      }
      cancel_life_activity: {
        Args: { _activity_id: string }
        Returns: undefined
      }
      change_membership: {
        Args: { _join: boolean; _organization_id: string }
        Returns: undefined
      }
      change_political_membership: {
        Args: { _join: boolean; _organization_id: string }
        Returns: undefined
      }
      civic_actor: {
        Args: never
        Returns: {
          age: number
          appearance: Json
          city_id: string
          created_at: string
          energy: number
          first_name: string
          id: string
          last_name: string
          path_id: string
          progression: Json
          situation: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "characters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      civic_news: {
        Args: {
          _body: string
          _city: string
          _key: string
          _location: string
          _organization?: string
          _title: string
        }
        Returns: string
      }
      civic_state: { Args: never; Returns: Json }
      create_character: {
        Args: {
          _age: number
          _appearance: Json
          _city_id: string
          _first_name: string
          _last_name: string
          _path_id: string
        }
        Returns: string
      }
      daily_life_state: { Args: never; Returns: Json }
      enroll_studies: { Args: { _field_id: string }; Returns: undefined }
      game_now: { Args: never; Returns: string }
      mark_news_read: { Args: { _news_id: string }; Returns: undefined }
      move_character: {
        Args: { _location_id: string }
        Returns: {
          character_id: string
          city_id: string
          district_id: string
          location_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "character_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      news_state: { Args: never; Returns: Json }
      notify_news: { Args: { _news_id: string }; Returns: undefined }
      organization_directory: { Args: { _city_id: string }; Returns: Json }
      participate_consultation: {
        Args: { _consultation_id: string; _option_id: string }
        Returns: undefined
      }
      pay_housing: { Args: never; Returns: undefined }
      political_state: { Args: never; Returns: Json }
      prepare_daily_life: { Args: never; Returns: string }
      publish_world_event: { Args: { _event_id: string }; Returns: string }
      refresh_civic_city: { Args: { _city: string }; Returns: undefined }
      refresh_world_news: { Args: never; Returns: number }
      report_civic_issue: {
        Args: { _category: string; _description: string; _location_id: string }
        Returns: string
      }
      reserve_political_event: { Args: { _event_id: string }; Returns: string }
      reserve_social_event: { Args: { _event_id: string }; Returns: string }
      set_political_opinion: {
        Args: { _stance: string; _topic_id: string }
        Returns: undefined
      }
      settle_daily_life: { Args: { _character_id: string }; Returns: undefined }
      social_actor: { Args: never; Returns: string }
      social_interact: {
        Args: { _action_id: string; _npc_id: string }
        Returns: undefined
      }
      social_level: { Args: { _score: number }; Returns: string }
      social_state: { Args: never; Returns: Json }
      start_life_activity: {
        Args: {
          _activity_id?: string
          _target_location_id?: string
          _type?: string
        }
        Returns: string
      }
      world_clock: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
