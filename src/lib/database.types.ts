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
      rooms: {
        Row: {
          id: number
          name: string
          slug: string
          base_price: number
          max_guests: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          base_price: number
          max_guests?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          base_price?: number
          max_guests?: number
          active?: boolean
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: number
          room_id: number
          date: string
          available: boolean
          price_override: number | null
          blocked_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          room_id: number
          date: string
          available?: boolean
          price_override?: number | null
          blocked_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          room_id?: number
          date?: string
          available?: boolean
          price_override?: number | null
          blocked_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: number
          room_id: number
          guest_name: string
          guest_email: string
          guest_phone: string
          check_in: string
          check_out: string
          nights: number
          adults: number
          children: number
          total_amount: number
          status: string
          payment_method: string | null
          payment_intent_id: string | null
          special_requests: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          room_id: number
          guest_name: string
          guest_email: string
          guest_phone: string
          check_in: string
          check_out: string
          nights: number
          adults: number
          children: number
          total_amount: number
          status?: string
          payment_method?: string | null
          payment_intent_id?: string | null
          special_requests?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          room_id?: number
          guest_name?: string
          guest_email?: string
          guest_phone?: string
          check_in?: string
          check_out?: string
          nights?: number
          adults?: number
          children?: number
          total_amount?: number
          status?: string
          payment_method?: string | null
          payment_intent_id?: string | null
          special_requests?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
        }
      }
    }
  }
}