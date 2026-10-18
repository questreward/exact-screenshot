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
          created_at: string
          end_time: string
          energy_cost: number
          energy_gain: number
          id: string
          location_id: string
          money_cost: number
          organization_event_id: string | null
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
          created_at?: string
          end_time: string
          energy_cost?: number
          energy_gain?: number
          id?: string
          location_id: string
          money_cost?: number
          organization_event_id?: string | null
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
          created_at?: string
          end_time?: string
          energy_cost?: number
          energy_gain?: number
          id?: string
          location_id?: string
          money_cost?: number
          organization_event_id?: string | null
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
          city_id: string | null
          created_at: string
          description: string
          id: string
          starts_at: string | null
          title: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          starts_at?: string | null
          title: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          starts_at?: string | null
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
          body: string
          id: string
          published_at: string
          title: string
        }
        Insert: {
          body?: string
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          body?: string
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_events: {
        Row: {
          description: string
          duration_minutes: number
          energy_cost: number
          id: string
          influence_gain: number
          location_id: string
          organization_id: string
          relation_gain: number
          reputation_gain: number
          start_hour: number
          status: string
          title: string
        }
        Insert: {
          description: string
          duration_minutes?: number
          energy_cost?: number
          id?: string
          influence_gain?: number
          location_id: string
          organization_id: string
          relation_gain?: number
          reputation_gain?: number
          start_hour?: number
          status?: string
          title: string
        }
        Update: {
          description?: string
          duration_minutes?: number
          energy_cost?: number
          id?: string
          influence_gain?: number
          location_id?: string
          organization_id?: string
          relation_gain?: number
          reputation_gain?: number
          start_hour?: number
          status?: string
          title?: string
        }
        Relationships: [
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
          status: string
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
          status?: string
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
          status?: string
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
          last_name: string
          location_id: string
          organization_id: string | null
          profession: string
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
          last_name: string
          location_id: string
          organization_id?: string | null
          profession: string
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
          last_name?: string
          location_id?: string
          organization_id?: string | null
          profession?: string
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
          cooldown_minutes: number
          energy_cost: number
          id: string
          influence_gain: number
          min_score: number
          relation_gain: number
          reputation_gain: number
          title: string
        }
        Insert: {
          cooldown_minutes?: number
          energy_cost?: number
          id: string
          influence_gain?: number
          min_score?: number
          relation_gain?: number
          reputation_gain?: number
          title: string
        }
        Update: {
          cooldown_minutes?: number
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
          notifications_enabled: boolean
          profile_public: boolean
          reduced_motion: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          language?: string
          notifications_enabled?: boolean
          profile_public?: boolean
          reduced_motion?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          language?: string
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
      cancel_life_activity: {
        Args: { _activity_id: string }
        Returns: undefined
      }
      change_membership: {
        Args: { _join: boolean; _organization_id: string }
        Returns: undefined
      }
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
      organization_directory: { Args: { _city_id: string }; Returns: Json }
      pay_housing: { Args: never; Returns: undefined }
      prepare_daily_life: { Args: never; Returns: string }
      reserve_social_event: { Args: { _event_id: string }; Returns: string }
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
