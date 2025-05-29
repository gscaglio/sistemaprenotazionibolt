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
          base_price: number
          max_adults: number
          max_children: number
          description: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          base_price: number
          max_adults: number
          max_children: number
          description: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          base_price?: number
          max_adults?: number
          max_children?: number
          description?: string
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: number
          room_id: number
          date: string
          status: 'available' | 'blocked' | 'booked'
          price_override: number | null
          created_at: string
        }
        Insert: {
          id?: number
          room_id: number
          date: string
          status: 'available' | 'blocked' | 'booked'
          price_override?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          room_id?: number
          date?: string
          status?: 'available' | 'blocked' | 'booked'
          price_override?: number | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: number
          check_in: string
          check_out: string
          guest_name: string
          guest_email: string
          guest_phone: string
          adults_count: number
          children_count: number
          total_amount: number
          status: 'pending' | 'confirmed' | 'cancelled'
          booking_type: 'single' | 'double'
          created_at: string
        }
        Insert: {
          id?: number
          check_in: string
          check_out: string
          guest_name: string
          guest_email: string
          guest_phone: string
          adults_count: number
          children_count: number
          total_amount: number
          status?: 'pending' | 'confirmed' | 'cancelled'
          booking_type: 'single' | 'double'
          created_at?: string
        }
        Update: {
          id?: number
          check_in?: string
          check_out?: string
          guest_name?: string
          guest_email?: string
          guest_phone?: string
          adults_count?: number
          children_count?: number
          total_amount?: number
          status?: 'pending' | 'confirmed' | 'cancelled'
          booking_type?: 'single' | 'double'
          created_at?: string
        }
      }
      booking_rooms: {
        Row: {
          id: number
          booking_id: number
          room_id: number
        }
        Insert: {
          id?: number
          booking_id: number
          room_id: number
        }
        Update: {
          id?: number
          booking_id?: number
          room_id?: number
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: Json
          created_at: string
        }
        Insert: {
          id?: number
          key: string
          value: Json
          created_at?: string
        }
        Update: {
          id?: number
          key?: string
          value?: Json
          created_at?: string
        }
      }
    }
  }
}