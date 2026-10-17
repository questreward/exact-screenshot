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
          description: string
          id: string
          name: string
          population: number
          region: string
          sort_order: number
        }
        Insert: {
          description?: string
          id: string
          name: string
          population?: number
          region: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          population?: number
          region?: string
          sort_order?: number
        }
        Relationships: []
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
      jobs: {
        Row: {
          city_id: string | null
          created_at: string
          id: string
          min_age: number
          organization_id: string | null
          salary: number
          title: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          id?: string
          min_age?: number
          organization_id?: string | null
          salary?: number
          title: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          id?: string
          min_age?: number
          organization_id?: string | null
          salary?: number
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
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city_id: string
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          character_id: string
          id: string
          joined_at: string
          organization_id: string
          role: string
        }
        Insert: {
          character_id: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
        }
        Update: {
          character_id?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
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
      organizations: {
        Row: {
          city_id: string | null
          created_at: string
          description: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
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
          id: number
          season: string
          updated_at: string
          world_date: string
          world_time: string
        }
        Insert: {
          id?: number
          season?: string
          updated_at?: string
          world_date?: string
          world_time?: string
        }
        Update: {
          id?: number
          season?: string
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
