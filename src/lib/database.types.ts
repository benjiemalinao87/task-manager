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
        }
        Insert: {
          id?: string
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
        }
        Update: {
          id?: string
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
        }
      }
      settings: {
        Row: {
          id: string
          default_email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          default_email?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          default_email?: string
          created_at?: string
          updated_at?: string
        }
      }
      time_sessions: {
        Row: {
          id: string
          clock_in: string
          clock_out: string | null
          duration_minutes: number | null
          report_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clock_in?: string
          clock_out?: string | null
          duration_minutes?: number | null
          report_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clock_in?: string
          clock_out?: string | null
          duration_minutes?: number | null
          report_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
