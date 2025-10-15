export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          invited_by: string | null
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          joined_at?: string
          created_at?: string
        }
      }
      workspace_invitations: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: 'admin' | 'member'
          invited_by: string
          token: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role?: 'admin' | 'member'
          invited_by: string
          token: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: 'admin' | 'member'
          invited_by?: string
          token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at?: string
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          integration_type: string
          api_key: string
          is_active: boolean
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_type: string
          api_key?: string
          is_active?: boolean
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_type?: string
          api_key?: string
          is_active?: boolean
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          task_name: string
          description: string
          estimated_time: string
          actual_time: string | null
          task_link: string | null
          ai_summary: string | null
          email_sent: boolean
          status: string
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
          asana_task_id: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          workspace_id: string | null
          assigned_to: string | null
          assigned_by: string | null
          assigned_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          task_name: string
          description: string
          estimated_time: string
          actual_time?: string | null
          task_link?: string | null
          ai_summary?: string | null
          email_sent?: boolean
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          asana_task_id?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          workspace_id?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          assigned_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          task_name?: string
          description?: string
          estimated_time?: string
          actual_time?: string | null
          task_link?: string | null
          ai_summary?: string | null
          email_sent?: boolean
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          asana_task_id?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          workspace_id?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          assigned_at?: string | null
        }
      }
      settings: {
        Row: {
          id: string
          default_email: string
          invoice_module_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          default_email?: string
          invoice_module_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          default_email?: string
          invoice_module_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      time_sessions: {
        Row: {
          id: string
          user_id: string
          clock_in: string
          clock_out: string | null
          duration_minutes: number | null
          report_sent: boolean
          created_at: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          clock_in?: string
          clock_out?: string | null
          duration_minutes?: number | null
          report_sent?: boolean
          created_at?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          clock_in?: string
          clock_out?: string | null
          duration_minutes?: number | null
          report_sent?: boolean
          created_at?: string
          updated_at?: string
          workspace_id?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          invoice_number: string
          client_name: string
          client_email: string | null
          client_address: string | null
          client_company: string | null
          invoice_date: string
          due_date: string | null
          period_start: string
          period_end: string
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_amount: number
          total: number
          currency: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          notes: string | null
          payment_terms: string
          sent_at: string | null
          sent_to: string | null
          share_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number: string
          client_name: string
          client_email?: string | null
          client_address?: string | null
          client_company?: string | null
          invoice_date: string
          due_date?: string | null
          period_start: string
          period_end: string
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          currency?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          notes?: string | null
          payment_terms?: string
          sent_at?: string | null
          sent_to?: string | null
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string
          client_name?: string
          client_email?: string | null
          client_address?: string | null
          client_company?: string | null
          invoice_date?: string
          due_date?: string | null
          period_start?: string
          period_end?: string
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          currency?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          notes?: string | null
          payment_terms?: string
          sent_at?: string | null
          sent_to?: string | null
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          task_id: string | null
          description: string
          quantity: number
          rate: number
          amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          task_id?: string | null
          description: string
          quantity?: number
          rate: number
          amount: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          task_id?: string | null
          description?: string
          quantity?: number
          rate?: number
          amount?: number
          sort_order?: number
          created_at?: string
        }
      }
      invoice_settings: {
        Row: {
          id: string
          user_id: string
          business_name: string | null
          business_address: string | null
          business_phone: string | null
          business_email: string | null
          tax_id: string | null
          logo_url: string | null
          website: string | null
          default_hourly_rate: number
          default_currency: string
          default_tax_rate: number
          default_payment_terms: string
          invoice_prefix: string
          next_invoice_number: number
          payment_instructions: string | null
          bank_details: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_email?: string | null
          tax_id?: string | null
          logo_url?: string | null
          website?: string | null
          default_hourly_rate?: number
          default_currency?: string
          default_tax_rate?: number
          default_payment_terms?: string
          invoice_prefix?: string
          next_invoice_number?: number
          payment_instructions?: string | null
          bank_details?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_email?: string | null
          tax_id?: string | null
          logo_url?: string | null
          website?: string | null
          default_hourly_rate?: number
          default_currency?: string
          default_tax_rate?: number
          default_payment_terms?: string
          invoice_prefix?: string
          next_invoice_number?: number
          payment_instructions?: string | null
          bank_details?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          client_name: string
          client_email: string | null
          client_phone: string | null
          client_address: string | null
          client_company: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_name: string
          client_email?: string | null
          client_phone?: string | null
          client_address?: string | null
          client_company?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_name?: string
          client_email?: string | null
          client_phone?: string | null
          client_address?: string | null
          client_company?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
