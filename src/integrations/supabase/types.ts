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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      entries: {
        Row: {
          boxes: number
          created_at: string
          document: string | null
          entry_date: string
          id: string
          loose_rolls: number
          notes: string | null
          supplier: string | null
          total_rolls: number
          updated_at: string
        }
        Insert: {
          boxes?: number
          created_at?: string
          document?: string | null
          entry_date: string
          id?: string
          loose_rolls?: number
          notes?: string | null
          supplier?: string | null
          total_rolls: number
          updated_at?: string
        }
        Update: {
          boxes?: number
          created_at?: string
          document?: string | null
          entry_date?: string
          id?: string
          loose_rolls?: number
          notes?: string | null
          supplier?: string | null
          total_rolls?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventories: {
        Row: {
          boxes: number
          counted_rolls: number
          created_at: string
          difference: number
          id: string
          inventory_date: string
          loose_rolls: number
          notes: string | null
          system_balance_before: number
        }
        Insert: {
          boxes?: number
          counted_rolls: number
          created_at?: string
          difference?: number
          id?: string
          inventory_date: string
          loose_rolls?: number
          notes?: string | null
          system_balance_before?: number
        }
        Update: {
          boxes?: number
          counted_rolls?: number
          created_at?: string
          difference?: number
          id?: string
          inventory_date?: string
          loose_rolls?: number
          notes?: string | null
          system_balance_before?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          boxes: number | null
          created_at: string
          document: string | null
          id: string
          notes: string | null
          product: string
          purchase_date: string
          rolls: number | null
          supplier: string | null
          total_value: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          boxes?: number | null
          created_at?: string
          document?: string | null
          id?: string
          notes?: string | null
          product: string
          purchase_date: string
          rolls?: number | null
          supplier?: string | null
          total_value?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          boxes?: number | null
          created_at?: string
          document?: string | null
          id?: string
          notes?: string | null
          product?: string
          purchase_date?: string
          rolls?: number | null
          supplier?: string | null
          total_value?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          alert_critical_rolls: number
          alert_low_rolls: number
          id: number
          rolls_per_box: number
          updated_at: string
        }
        Insert: {
          alert_critical_rolls?: number
          alert_low_rolls?: number
          id?: number
          rolls_per_box?: number
          updated_at?: string
        }
        Update: {
          alert_critical_rolls?: number
          alert_low_rolls?: number
          id?: number
          rolls_per_box?: number
          updated_at?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          responsible: string
          rolls: number
          updated_at: string
          withdrawal_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          responsible: string
          rolls: number
          updated_at?: string
          withdrawal_date: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          responsible?: string
          rolls?: number
          updated_at?: string
          withdrawal_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_balance: {
        Args: { p_exclude_withdrawal?: string }
        Returns: number
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