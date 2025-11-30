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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          stripe_customer_id: string | null
          subscription_status: string
          subscription_tier: string
          server_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          server_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          server_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      servers: {
        Row: {
          id: string
          user_id: string
          name: string
          hostname: string
          api_key: string
          status: string
          last_seen_at: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          hostname: string
          api_key?: string
          status?: string
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          hostname?: string
          api_key?: string
          status?: string
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      metrics: {
        Row: {
          id: string
          server_id: string
          timestamp: string
          cpu_usage: number | null
          memory_usage: number | null
          disk_usage: number | null
          network_in: number
          network_out: number
          load_average: number | null
          uptime: number
          processes: number
          created_at: string
        }
        Insert: {
          id?: string
          server_id: string
          timestamp?: string
          cpu_usage?: number | null
          memory_usage?: number | null
          disk_usage?: number | null
          network_in?: number
          network_out?: number
          load_average?: number | null
          uptime?: number
          processes?: number
          created_at?: string
        }
        Update: {
          id?: string
          server_id?: string
          timestamp?: string
          cpu_usage?: number | null
          memory_usage?: number | null
          disk_usage?: number | null
          network_in?: number
          network_out?: number
          load_average?: number | null
          uptime?: number
          processes?: number
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          server_id: string
          user_id: string
          alert_type: string
          severity: string
          message: string
          threshold_value: number | null
          current_value: number | null
          acknowledged: boolean
          acknowledged_at: string | null
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          server_id: string
          user_id: string
          alert_type: string
          severity?: string
          message: string
          threshold_value?: number | null
          current_value?: number | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          server_id?: string
          user_id?: string
          alert_type?: string
          severity?: string
          message?: string
          threshold_value?: number | null
          current_value?: number | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
