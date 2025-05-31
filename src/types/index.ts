export interface ErrorLog {
  id?: number;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  error_stack?: string;
  context?: Record<string, any>;
  browser_info?: Record<string, any>;
  user_id?: string;
  created_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface Room {
  id: number;
  name: string;
  base_price: number;
  max_adults: number;
  max_children: number;
  description: string;
}

export interface Availability {
  id: number;
  room_id: number;
  date: string;
  status: 'available' | 'blocked' | 'booked';
  price_override: number | null;
  created_at: string;
}

export interface Booking {
  id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  adults_count: number;
  children_count: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  booking_type: 'single' | 'double';
  created_at: string;
}

export interface BookingRoom {
  id: number;
  booking_id: number;
  room_id: number;
}