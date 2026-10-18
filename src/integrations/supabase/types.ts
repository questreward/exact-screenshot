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
          campaign_action_id: string | null
          character_id: string
          civic_engagement_gain: number
          created_at: string
          economy_payload: Json
          end_time: string
          energy_cost: number
          energy_gain: number
          governance_action_id: string | null
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
          campaign_action_id?: string | null
          character_id: string
          civic_engagement_gain?: number
          created_at?: string
          economy_payload?: Json
          end_time: string
          energy_cost?: number
          energy_gain?: number
          governance_action_id?: string | null
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
          campaign_action_id?: string | null
          character_id?: string
          civic_engagement_gain?: number
          created_at?: string
          economy_payload?: Json
          end_time?: string
          energy_cost?: number
          energy_gain?: number
          governance_action_id?: string | null
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
            foreignKeyName: "activities_campaign_action_id_fkey"
            columns: ["campaign_action_id"]
            isOneToOne: false
            referencedRelation: "campaign_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_governance_action_id_fkey"
            columns: ["governance_action_id"]
            isOneToOne: false
            referencedRelation: "governance_actions"
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
      campaign_actions: {
        Row: {
          activity_id: string | null
          candidacy_id: string
          character_id: string | null
          cost: number
          created_at: string
          debate_choices: Json | null
          id: string
          outcome: string | null
          reputation_delta: number
          rewarded_at: string | null
          rule_id: string
          support_delta: number
          visibility_delta: number
        }
        Insert: {
          activity_id?: string | null
          candidacy_id: string
          character_id?: string | null
          cost: number
          created_at?: string
          debate_choices?: Json | null
          id?: string
          outcome?: string | null
          reputation_delta: number
          rewarded_at?: string | null
          rule_id: string
          support_delta: number
          visibility_delta: number
        }
        Update: {
          activity_id?: string | null
          candidacy_id?: string
          character_id?: string | null
          cost?: number
          created_at?: string
          debate_choices?: Json | null
          id?: string
          outcome?: string | null
          reputation_delta?: number
          rewarded_at?: string | null
          rule_id?: string
          support_delta?: number
          visibility_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_actions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_actions_candidacy_id_fkey"
            columns: ["candidacy_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_actions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rules: {
        Row: {
          category: string
          cost: number
          duration_minutes: number
          energy_cost: number
          id: string
          reputation_gain: number
          risk: number
          support_gain: number
          title: string
          visibility_gain: number
        }
        Insert: {
          category: string
          cost?: number
          duration_minutes?: number
          energy_cost?: number
          id: string
          reputation_gain?: number
          risk?: number
          support_gain?: number
          title: string
          visibility_gain?: number
        }
        Update: {
          category?: string
          cost?: number
          duration_minutes?: number
          energy_cost?: number
          id?: string
          reputation_gain?: number
          risk?: number
          support_gain?: number
          title?: string
          visibility_gain?: number
        }
        Relationships: []
      }
      campaign_teams: {
        Row: {
          candidacy_id: string
          cost: number
          npc_id: string
          role: string
          skill: number
        }
        Insert: {
          candidacy_id: string
          cost: number
          npc_id: string
          role: string
          skill: number
        }
        Update: {
          candidacy_id?: string
          cost?: number
          npc_id?: string
          role?: string
          skill?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_teams_candidacy_id_fkey"
            columns: ["candidacy_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_teams_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidacies: {
        Row: {
          base_influence: number
          base_reputation: number
          budget: number
          campaign_reputation: number
          character_id: string | null
          display_name: string
          donations: number
          election_id: string
          id: string
          npc_id: string | null
          organization_id: string | null
          program: Json
          program_score: number
          refusal_reason: string | null
          slogan: string
          started_at: string | null
          status: string
          submitted_at: string | null
          support: number
          visibility: number
        }
        Insert: {
          base_influence?: number
          base_reputation?: number
          budget?: number
          campaign_reputation?: number
          character_id?: string | null
          display_name: string
          donations?: number
          election_id: string
          id?: string
          npc_id?: string | null
          organization_id?: string | null
          program?: Json
          program_score?: number
          refusal_reason?: string | null
          slogan?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          support?: number
          visibility?: number
        }
        Update: {
          base_influence?: number
          base_reputation?: number
          budget?: number
          campaign_reputation?: number
          character_id?: string | null
          display_name?: string
          donations?: number
          election_id?: string
          id?: string
          npc_id?: string | null
          organization_id?: string | null
          program?: Json
          program_score?: number
          refusal_reason?: string | null
          slogan?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          support?: number
          visibility?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidacies_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      career_history: {
        Row: {
          character_id: string
          id: string
          kind: string
          label: string
          occurred_at: string
        }
        Insert: {
          character_id: string
          id?: string
          kind: string
          label: string
          occurred_at?: string
        }
        Update: {
          character_id?: string
          id?: string
          kind?: string
          label?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_history_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
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
      city_indicators: {
        Row: {
          baseline: number
          city_id: string
          indicator: string
          value: number
        }
        Insert: {
          baseline: number
          city_id: string
          indicator: string
          value: number
        }
        Update: {
          baseline?: number
          city_id?: string
          indicator?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "city_indicators_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
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
          advisory: boolean
          city_id: string
          closed_at: string | null
          consultation_key: string | null
          description: string
          district_id: string | null
          ends_at: string
          governance_decision_id: string | null
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
          advisory?: boolean
          city_id: string
          closed_at?: string | null
          consultation_key?: string | null
          description: string
          district_id?: string | null
          ends_at: string
          governance_decision_id?: string | null
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
          advisory?: boolean
          city_id?: string
          closed_at?: string | null
          consultation_key?: string | null
          description?: string
          district_id?: string | null
          ends_at?: string
          governance_decision_id?: string | null
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
            foreignKeyName: "consultations_governance_decision_id_fkey"
            columns: ["governance_decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
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
      economy_catalog: {
        Row: {
          category: string
          config: Json
          duration_minutes: number
          energy_cost: number
          id: string
          kind: string
          location_kind: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category: string
          config?: Json
          duration_minutes?: number
          energy_cost?: number
          id: string
          kind: string
          location_kind?: string
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          category?: string
          config?: Json
          duration_minutes?: number
          energy_cost?: number
          id?: string
          kind?: string
          location_kind?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      economy_goals: {
        Row: {
          character_id: string
          created_at: string
          id: string
          kind: string
          metric: string
          name: string
          notified: boolean
          request_id: string
          saved: number
          status: string
          target: number
          target_date: string | null
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          kind: string
          metric?: string
          name: string
          notified?: boolean
          request_id: string
          saved?: number
          status?: string
          target: number
          target_date?: string | null
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          kind?: string
          metric?: string
          name?: string
          notified?: boolean
          request_id?: string
          saved?: number
          status?: string
          target?: number
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economy_goals_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_operations: {
        Row: {
          amount: number
          character_id: string
          kind: string
          occurred_at: string
          operation_key: string
          payload: Json
          status: string
        }
        Insert: {
          amount?: number
          character_id: string
          kind: string
          occurred_at?: string
          operation_key: string
          payload?: Json
          status?: string
        }
        Update: {
          amount?: number
          character_id?: string
          kind?: string
          occurred_at?: string
          operation_key?: string
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "economy_operations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_settings: {
        Row: {
          id: number
          low_balance: number
          max_goals: number
          promotion_level: number
          promotion_progress: number
          promotion_raise: number
          promotion_skill: string
        }
        Insert: {
          id?: number
          low_balance?: number
          max_goals?: number
          promotion_level?: number
          promotion_progress?: number
          promotion_raise?: number
          promotion_skill?: string
        }
        Update: {
          id?: number
          low_balance?: number
          max_goals?: number
          promotion_level?: number
          promotion_progress?: number
          promotion_raise?: number
          promotion_skill?: string
        }
        Relationships: []
      }
      election_polls: {
        Row: {
          election_id: string
          estimates: Json
          id: string
          margin: number
          published_at: string
          sample_size: number
        }
        Insert: {
          election_id: string
          estimates: Json
          id?: string
          margin?: number
          published_at: string
          sample_size?: number
        }
        Update: {
          election_id?: string
          estimates?: Json
          id?: string
          margin?: number
          published_at?: string
          sample_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "election_polls_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_results: {
        Row: {
          candidacy_id: string
          election_id: string
          percentage: number
          rank: number
          votes: number
        }
        Insert: {
          candidacy_id: string
          election_id: string
          percentage: number
          rank: number
          votes: number
        }
        Update: {
          candidacy_id?: string
          election_id?: string
          percentage?: number
          rank?: number
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "election_results_candidacy_id_fkey"
            columns: ["candidacy_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_results_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_votes: {
        Row: {
          candidacy_id: string
          character_id: string
          election_id: string
          voted_at: string
        }
        Insert: {
          candidacy_id: string
          character_id: string
          election_id: string
          voted_at?: string
        }
        Update: {
          candidacy_id?: string
          character_id?: string
          election_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_votes_candidacy_id_fkey"
            columns: ["candidacy_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          abstention: number | null
          campaign_starts_at: string
          candidacy_ends_at: string
          city_id: string
          closed_at: string | null
          count_at: string
          debate_at: string
          description: string
          election_key: string
          eligible_voters: number
          id: string
          institution_id: string
          last_npc_day: string | null
          location_id: string
          name: string
          participation: number | null
          predecessor_election_id: string | null
          round: number
          rules: Json
          starts_at: string
          status: string
          type: string
          vote_ends_at: string
          vote_starts_at: string
          winner_id: string | null
        }
        Insert: {
          abstention?: number | null
          campaign_starts_at: string
          candidacy_ends_at: string
          city_id: string
          closed_at?: string | null
          count_at: string
          debate_at: string
          description?: string
          election_key: string
          eligible_voters?: number
          id?: string
          institution_id: string
          last_npc_day?: string | null
          location_id: string
          name: string
          participation?: number | null
          predecessor_election_id?: string | null
          round?: number
          rules?: Json
          starts_at: string
          status?: string
          type?: string
          vote_ends_at: string
          vote_starts_at: string
          winner_id?: string | null
        }
        Update: {
          abstention?: number | null
          campaign_starts_at?: string
          candidacy_ends_at?: string
          city_id?: string
          closed_at?: string | null
          count_at?: string
          debate_at?: string
          description?: string
          election_key?: string
          eligible_voters?: number
          id?: string
          institution_id?: string
          last_npc_day?: string | null
          location_id?: string
          name?: string
          participation?: number | null
          predecessor_election_id?: string | null
          round?: number
          rules?: Json
          starts_at?: string
          status?: string
          type?: string
          vote_ends_at?: string
          vote_starts_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_predecessor_election_id_fkey"
            columns: ["predecessor_election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      employments: {
        Row: {
          character_id: string
          job_id: string
          progress: number
          promotion_level: number
          salary_bonus: number
          skills: Json
          started_at: string
          status: string
        }
        Insert: {
          character_id: string
          job_id: string
          progress?: number
          promotion_level?: number
          salary_bonus?: number
          skills?: Json
          started_at: string
          status?: string
        }
        Update: {
          character_id?: string
          job_id?: string
          progress?: number
          promotion_level?: number
          salary_bonus?: number
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
      governance_actions: {
        Row: {
          activity_id: string | null
          character_id: string
          command: string
          compromise: boolean
          decision_id: string
          group_id: string | null
          id: string
          settled_at: string | null
        }
        Insert: {
          activity_id?: string | null
          character_id: string
          command: string
          compromise?: boolean
          decision_id: string
          group_id?: string | null
          id?: string
          settled_at?: string | null
        }
        Update: {
          activity_id?: string | null
          character_id?: string
          command?: string
          compromise?: boolean
          decision_id?: string
          group_id?: string | null
          id?: string
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_actions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_actions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_actions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_actions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "municipal_council_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_effects: {
        Row: {
          applied_at: string | null
          decision_id: string
          deltas: Json
          due_at: string
          effect_key: string
          id: string
          kind: string
        }
        Insert: {
          applied_at?: string | null
          decision_id: string
          deltas: Json
          due_at: string
          effect_key: string
          id?: string
          kind: string
        }
        Update: {
          applied_at?: string | null
          decision_id?: string
          deltas?: Json
          due_at?: string
          effect_key?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_effects_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_periods: {
        Row: {
          city_id: string
          occurred_at: string
          period: number
        }
        Insert: {
          city_id: string
          occurred_at: string
          period: number
        }
        Update: {
          city_id?: string
          occurred_at?: string
          period?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_periods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_positions: {
        Row: {
          decision_id: string
          group_id: string
          negotiated: boolean
          reaction: string
          support: number
        }
        Insert: {
          decision_id: string
          group_id: string
          negotiated?: boolean
          reaction: string
          support: number
        }
        Update: {
          decision_id?: string
          group_id?: string
          negotiated?: boolean
          reaction?: string
          support?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_positions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_positions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "municipal_council_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_reactions: {
        Row: {
          city_id: string
          decision_id: string | null
          description: string
          id: string
          kind: string
          news_id: string | null
          occurred_at: string
          reaction_key: string
          title: string
        }
        Insert: {
          city_id: string
          decision_id?: string | null
          description: string
          id?: string
          kind: string
          news_id?: string | null
          occurred_at: string
          reaction_key: string
          title: string
        }
        Update: {
          city_id?: string
          decision_id?: string | null
          description?: string
          id?: string
          kind?: string
          news_id?: string | null
          occurred_at?: string
          reaction_key?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_reactions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_reactions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_reactions_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_rules: {
        Row: {
          axis: string
          category: string
          completion: Json
          cost: number
          delayed: Json
          delayed_days: number
          duration_days: number
          failure_delta: Json
          id: string
          immediate: Json
          indicator: string
          influence_gain: number
          location_kind: string
          objective: string
          reputation_gain: number
          risk: number
          target: number
          title: string
        }
        Insert: {
          axis: string
          category: string
          completion?: Json
          cost: number
          delayed?: Json
          delayed_days?: number
          duration_days: number
          failure_delta?: Json
          id: string
          immediate?: Json
          indicator: string
          influence_gain?: number
          location_kind: string
          objective: string
          reputation_gain?: number
          risk?: number
          target: number
          title: string
        }
        Update: {
          axis?: string
          category?: string
          completion?: Json
          cost?: number
          delayed?: Json
          delayed_days?: number
          duration_days?: number
          failure_delta?: Json
          id?: string
          immediate?: Json
          indicator?: string
          influence_gain?: number
          location_kind?: string
          objective?: string
          reputation_gain?: number
          risk?: number
          target?: number
          title?: string
        }
        Relationships: []
      }
      governance_settings: {
        Row: {
          consultation_hours: number
          council_seats: number
          energy_cost: number
          event_hour: number
          id: number
          initial_budget: number
          max_priorities: number
          monthly_expense: number
          monthly_income: number
          negotiation_minutes: number
          reserve: number
          study_minutes: number
          vote_minutes: number
        }
        Insert: {
          consultation_hours?: number
          council_seats?: number
          energy_cost?: number
          event_hour?: number
          id: number
          initial_budget?: number
          max_priorities?: number
          monthly_expense?: number
          monthly_income?: number
          negotiation_minutes?: number
          reserve?: number
          study_minutes?: number
          vote_minutes?: number
        }
        Update: {
          consultation_hours?: number
          council_seats?: number
          energy_cost?: number
          event_hour?: number
          id?: number
          initial_budget?: number
          max_priorities?: number
          monthly_expense?: number
          monthly_income?: number
          negotiation_minutes?: number
          reserve?: number
          study_minutes?: number
          vote_minutes?: number
        }
        Relationships: []
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
      indicator_history: {
        Row: {
          after_value: number
          before_value: number
          city_id: string | null
          effect_key: string
          id: string
          indicator: string
          occurred_at: string
        }
        Insert: {
          after_value: number
          before_value: number
          city_id?: string | null
          effect_key: string
          id?: string
          indicator: string
          occurred_at: string
        }
        Update: {
          after_value?: number
          before_value?: number
          city_id?: string | null
          effect_key?: string
          id?: string
          indicator?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_history_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
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
          economy_level: number
          economy_skill: string | null
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
          economy_level?: number
          economy_skill?: string | null
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
          economy_level?: number
          economy_skill?: string | null
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
      municipal_council_groups: {
        Row: {
          base_support: number
          candidate_id: string | null
          id: string
          ideology: Json
          leader_id: string | null
          majority: boolean
          mandate_id: string
          name: string
          organization_id: string | null
          seats: number
        }
        Insert: {
          base_support?: number
          candidate_id?: string | null
          id?: string
          ideology?: Json
          leader_id?: string | null
          majority?: boolean
          mandate_id: string
          name: string
          organization_id?: string | null
          seats: number
        }
        Update: {
          base_support?: number
          candidate_id?: string | null
          id?: string
          ideology?: Json
          leader_id?: string | null
          majority?: boolean
          mandate_id?: string
          name?: string
          organization_id?: string | null
          seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "municipal_council_groups_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_council_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "social_npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_council_groups_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "municipal_mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_council_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_ledger: {
        Row: {
          amount: number
          category: string
          city_id: string
          decision_id: string | null
          entry_key: string
          id: string
          label: string
          occurred_at: string
        }
        Insert: {
          amount: number
          category: string
          city_id: string
          decision_id?: string | null
          entry_key: string
          id?: string
          label: string
          occurred_at?: string
        }
        Update: {
          amount?: number
          category?: string
          city_id?: string
          decision_id?: string | null
          entry_key?: string
          id?: string
          label?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_ledger_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_ledger_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_mandates: {
        Row: {
          candidacy_id: string
          city_id: string
          closed_at: string | null
          closing_indicators: Json | null
          closing_politics: Json | null
          decision_id: string | null
          election_id: string
          ends_at: string
          final_report: Json | null
          function: string
          governance_initialized_at: string | null
          id: string
          opening_indicators: Json
          opening_politics: Json
          priorities: string[]
          starts_at: string
          status: string
        }
        Insert: {
          candidacy_id: string
          city_id: string
          closed_at?: string | null
          closing_indicators?: Json | null
          closing_politics?: Json | null
          decision_id?: string | null
          election_id: string
          ends_at: string
          final_report?: Json | null
          function?: string
          governance_initialized_at?: string | null
          id?: string
          opening_indicators?: Json
          opening_politics?: Json
          priorities?: string[]
          starts_at: string
          status?: string
        }
        Update: {
          candidacy_id?: string
          city_id?: string
          closed_at?: string | null
          closing_indicators?: Json | null
          closing_politics?: Json | null
          decision_id?: string | null
          election_id?: string
          ends_at?: string
          final_report?: Json | null
          function?: string
          governance_initialized_at?: string | null
          id?: string
          opening_indicators?: Json
          opening_politics?: Json
          priorities?: string[]
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_mandates_candidacy_id_fkey"
            columns: ["candidacy_id"]
            isOneToOne: false
            referencedRelation: "candidacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_mandates_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_mandates_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "public_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_mandates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: true
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_treasuries: {
        Row: {
          anchor: string
          balance: number
          city_id: string
          expenses: number
          income: number
          last_period: number
          reserve: number
        }
        Insert: {
          anchor?: string
          balance: number
          city_id: string
          expenses?: number
          income?: number
          last_period?: number
          reserve: number
        }
        Update: {
          anchor?: string
          balance?: number
          city_id?: string
          expenses?: number
          income?: number
          last_period?: number
          reserve?: number
        }
        Relationships: [
          {
            foreignKeyName: "municipal_treasuries_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: true
            referencedRelation: "cities"
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
          election_id: string | null
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
          election_id?: string | null
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
          election_id?: string | null
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
            foreignKeyName: "news_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
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
      personal_assets: {
        Row: {
          acquired_at: string
          catalog_id: string
          character_id: string
          condition: string
          id: string
          next_maintenance: string | null
          purchase_price: number
        }
        Insert: {
          acquired_at?: string
          catalog_id: string
          character_id: string
          condition?: string
          id?: string
          next_maintenance?: string | null
          purchase_price: number
        }
        Update: {
          acquired_at?: string
          catalog_id?: string
          character_id?: string
          condition?: string
          id?: string
          next_maintenance?: string | null
          purchase_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_assets_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "economy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_assets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_budgets: {
        Row: {
          auto_rent: boolean
          character_id: string
          low_balance_notified: boolean
          next_rent: string | null
          planned: Json
        }
        Insert: {
          auto_rent?: boolean
          character_id: string
          low_balance_notified?: boolean
          next_rent?: string | null
          planned?: Json
        }
        Update: {
          auto_rent?: boolean
          character_id?: string
          low_balance_notified?: boolean
          next_rent?: string | null
          planned?: Json
        }
        Relationships: [
          {
            foreignKeyName: "personal_budgets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
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
          completed_at: string | null
          compromise: boolean
          consequences: Json
          consultation_id: string | null
          cost: number | null
          council_result: Json | null
          decided_at: string
          decision_key: string
          delay_days: number
          description: string
          district_id: string | null
          duration_days: number | null
          ends_at: string | null
          failure: boolean
          funded_at: string | null
          governance_rule_id: string | null
          id: string
          impact_expected: Json | null
          impact_real: Json
          institution_id: string
          issue_id: string | null
          location_id: string
          mandate_id: string | null
          news_id: string | null
          objective: string | null
          political_settled_at: string | null
          proposed_at: string | null
          rule_snapshot: Json | null
          status: string
          studied_at: string | null
          title: string
          voted_at: string | null
          workflow: string | null
        }
        Insert: {
          applied_at?: string | null
          category?: string
          city_id: string
          completed_at?: string | null
          compromise?: boolean
          consequences?: Json
          consultation_id?: string | null
          cost?: number | null
          council_result?: Json | null
          decided_at?: string
          decision_key: string
          delay_days?: number
          description: string
          district_id?: string | null
          duration_days?: number | null
          ends_at?: string | null
          failure?: boolean
          funded_at?: string | null
          governance_rule_id?: string | null
          id?: string
          impact_expected?: Json | null
          impact_real?: Json
          institution_id: string
          issue_id?: string | null
          location_id: string
          mandate_id?: string | null
          news_id?: string | null
          objective?: string | null
          political_settled_at?: string | null
          proposed_at?: string | null
          rule_snapshot?: Json | null
          status?: string
          studied_at?: string | null
          title: string
          voted_at?: string | null
          workflow?: string | null
        }
        Update: {
          applied_at?: string | null
          category?: string
          city_id?: string
          completed_at?: string | null
          compromise?: boolean
          consequences?: Json
          consultation_id?: string | null
          cost?: number | null
          council_result?: Json | null
          decided_at?: string
          decision_key?: string
          delay_days?: number
          description?: string
          district_id?: string | null
          duration_days?: number | null
          ends_at?: string | null
          failure?: boolean
          funded_at?: string | null
          governance_rule_id?: string | null
          id?: string
          impact_expected?: Json | null
          impact_real?: Json
          institution_id?: string
          issue_id?: string | null
          location_id?: string
          mandate_id?: string | null
          news_id?: string | null
          objective?: string | null
          political_settled_at?: string | null
          proposed_at?: string | null
          rule_snapshot?: Json | null
          status?: string
          studied_at?: string | null
          title?: string
          voted_at?: string | null
          workflow?: string | null
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
            foreignKeyName: "public_decisions_governance_rule_id_fkey"
            columns: ["governance_rule_id"]
            isOneToOne: false
            referencedRelation: "governance_rules"
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
            foreignKeyName: "public_decisions_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "municipal_mandates"
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
          governance_delta: number
          governance_managed: boolean
          id: string
          indicator: string | null
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
          governance_delta?: number
          governance_managed?: boolean
          id?: string
          indicator?: string | null
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
          governance_delta?: number
          governance_managed?: boolean
          id?: string
          indicator?: string | null
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
          category: string
          created_at: string
          id: string
          label: string
          operation_key: string | null
          world_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category?: string
          created_at?: string
          id?: string
          label: string
          operation_key?: string | null
          world_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          operation_key?: string | null
          world_at?: string | null
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
      abandon_municipal_dossier: {
        Args: { _decision_id: string }
        Returns: undefined
      }
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
      cast_election_vote: {
        Args: { _candidacy_id: string; _election_id: string }
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
      create_municipal_dossier: {
        Args: { _issue_id?: string; _mandate_id: string; _rule_id: string }
        Returns: string
      }
      daily_life_state: { Args: never; Returns: Json }
      economy_cash: {
        Args: {
          _amount: number
          _category: string
          _cid: string
          _key: string
          _label: string
          _payload?: Json
        }
        Returns: boolean
      }
      economy_notify: {
        Args: { _body: string; _cid: string; _key: string; _title: string }
        Returns: undefined
      }
      economy_progress: {
        Args: { _cid: string; _metric: string }
        Returns: number
      }
      election_news: {
        Args: {
          _body: string
          _candidate?: string
          _election: string
          _key: string
          _title: string
        }
        Returns: string
      }
      election_state: { Args: never; Returns: Json }
      enroll_studies: { Args: { _field_id: string }; Returns: undefined }
      finish_municipal_mandates: { Args: { _city: string }; Returns: undefined }
      fund_municipal_project: {
        Args: { _decision_id: string }
        Returns: undefined
      }
      game_now: { Args: never; Returns: string }
      governance_news: {
        Args: {
          _at: string
          _body: string
          _decision: string
          _key: string
          _kind?: string
          _title: string
        }
        Returns: string
      }
      governance_owner: { Args: { _mandate: string }; Returns: string }
      governance_state: { Args: never; Returns: Json }
      initialize_governance_city: {
        Args: { _city: string }
        Returns: undefined
      }
      manage_campaign: {
        Args: {
          _candidacy_id: string
          _command: string
          _npc_id?: string
          _role?: string
        }
        Returns: undefined
      }
      mandate_politics_at_end: { Args: { _mandate: string }; Returns: Json }
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
      open_governance_consultation: {
        Args: { _decision_id: string }
        Returns: string
      }
      organization_directory: { Args: { _city_id: string }; Returns: Json }
      participate_consultation: {
        Args: { _consultation_id: string; _option_id: string }
        Returns: undefined
      }
      pay_housing: { Args: never; Returns: undefined }
      pay_housing_attempt: { Args: never; Returns: Json }
      personal_economy_action: {
        Args: { _command: string; _input?: Json; _request_id: string }
        Returns: undefined
      }
      personal_economy_state: { Args: never; Returns: Json }
      political_state: { Args: never; Returns: Json }
      prepare_daily_life: { Args: never; Returns: string }
      prepare_municipal_reelection: {
        Args: { _mandate: string }
        Returns: string
      }
      publish_world_event: { Args: { _event_id: string }; Returns: string }
      refresh_civic_city: { Args: { _city: string }; Returns: undefined }
      refresh_election: { Args: { _election: string }; Returns: undefined }
      refresh_governance_city: { Args: { _city: string }; Returns: undefined }
      refresh_governance_world: { Args: never; Returns: number }
      refresh_world_news: { Args: never; Returns: number }
      report_civic_issue: {
        Args: { _category: string; _description: string; _location_id: string }
        Returns: string
      }
      reserve_governance_action: {
        Args: {
          _command: string
          _compromise?: boolean
          _decision_id: string
          _group_id?: string
        }
        Returns: string
      }
      reserve_municipal_event: {
        Args: { _decision_id: string }
        Returns: string
      }
      reserve_political_event: { Args: { _event_id: string }; Returns: string }
      reserve_social_event: { Args: { _event_id: string }; Returns: string }
      save_candidate_program: {
        Args: { _candidacy_id: string; _program: Json; _slogan: string }
        Returns: undefined
      }
      set_mandate_priorities: {
        Args: { _mandate_id: string; _priorities: string[] }
        Returns: undefined
      }
      set_political_opinion: {
        Args: { _stance: string; _topic_id: string }
        Returns: undefined
      }
      settle_daily_life: { Args: { _character_id: string }; Returns: undefined }
      settle_governance_politics: { Args: { _cid: string }; Returns: undefined }
      settle_personal_economy: { Args: { _cid: string }; Returns: undefined }
      social_actor: { Args: never; Returns: string }
      social_interact: {
        Args: { _action_id: string; _npc_id: string }
        Returns: undefined
      }
      social_level: { Args: { _score: number }; Returns: string }
      social_state: { Args: never; Returns: Json }
      start_campaign_action: {
        Args: { _candidacy_id: string; _choices?: Json; _rule_id: string }
        Returns: string
      }
      start_life_activity: {
        Args: {
          _activity_id?: string
          _target_location_id?: string
          _type?: string
        }
        Returns: string
      }
      submit_candidacy: {
        Args: { _election_id: string; _organization_id?: string }
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
