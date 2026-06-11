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
      cash_entries: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string | null
          receivable_id: string | null
          type: Database["public"]["Enums"]["cash_type"]
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          receivable_id?: string | null
          type: Database["public"]["Enums"]["cash_type"]
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          receivable_id?: string | null
          type?: Database["public"]["Enums"]["cash_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          district: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          default_deadline_days: number | null
          default_order_text: string | null
          default_quote_text: string | null
          document: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          default_deadline_days?: number | null
          default_order_text?: string | null
          default_quote_text?: string | null
          document?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          default_deadline_days?: number | null
          default_order_text?: string | null
          default_quote_text?: string | null
          document?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      order_files: {
        Row: {
          client_id: string | null
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          order_id: string | null
          quote_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          order_id?: string | null
          quote_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          order_id?: string | null
          quote_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          order_id: string
          quantity: number
          service_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_id: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_id?: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attendant_id: string | null
          client_id: string
          client_notes: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          finishing: string | null
          id: string
          internal_notes: string | null
          material: string | null
          measurements: string | null
          number: number
          paid: number
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          production_status: Database["public"]["Enums"]["production_status"]
          quote_id: string | null
          title: string | null
          total: number
          updated_at: string
          urgent: boolean
        }
        Insert: {
          attendant_id?: string | null
          client_id: string
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          finishing?: string | null
          id?: string
          internal_notes?: string | null
          material?: string | null
          measurements?: string | null
          number?: number
          paid?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_status?: Database["public"]["Enums"]["production_status"]
          quote_id?: string | null
          title?: string | null
          total?: number
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          attendant_id?: string | null
          client_id?: string
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          finishing?: string | null
          id?: string
          internal_notes?: string | null
          material?: string | null
          measurements?: string | null
          number?: number
          paid?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_status?: Database["public"]["Enums"]["production_status"]
          quote_id?: string | null
          title?: string | null
          total?: number
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          quote_id: string
          service_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          quote_id: string
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quote_id?: string
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          discount: number
          id: string
          notes: string | null
          number: number
          status: Database["public"]["Enums"]["quote_status"]
          total: number
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: number
          status?: Database["public"]["Enums"]["quote_status"]
          total?: number
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: number
          status?: Database["public"]["Enums"]["quote_status"]
          total?: number
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["receivable_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          default_deadline_days: number | null
          description: string | null
          id: string
          name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category: string
          created_at?: string
          default_deadline_days?: number | null
          description?: string | null
          id?: string
          name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          default_deadline_days?: number | null
          description?: string | null
          id?: string
          name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "atendente" | "producao" | "financeiro"
      cash_type: "entrada" | "saida"
      payment_status:
        | "nao_pago"
        | "sinal_pago"
        | "pago_parcial"
        | "pago_completo"
        | "em_atraso"
      production_status:
        | "orcamento"
        | "aguardando_aprovacao"
        | "aguardando_arte"
        | "arte_em_criacao"
        | "aguardando_pagamento"
        | "aprovado"
        | "em_producao"
        | "pausado"
        | "pronto_para_retirada"
        | "entregue"
        | "cancelado"
      quote_status: "em_analise" | "enviado" | "aprovado" | "recusado"
      receivable_status: "pendente" | "pago" | "vencido" | "cancelado"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "atendente", "producao", "financeiro"],
      cash_type: ["entrada", "saida"],
      payment_status: [
        "nao_pago",
        "sinal_pago",
        "pago_parcial",
        "pago_completo",
        "em_atraso",
      ],
      production_status: [
        "orcamento",
        "aguardando_aprovacao",
        "aguardando_arte",
        "arte_em_criacao",
        "aguardando_pagamento",
        "aprovado",
        "em_producao",
        "pausado",
        "pronto_para_retirada",
        "entregue",
        "cancelado",
      ],
      quote_status: ["em_analise", "enviado", "aprovado", "recusado"],
      receivable_status: ["pendente", "pago", "vencido", "cancelado"],
    },
  },
} as const
