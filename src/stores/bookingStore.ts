import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];

interface BookingStore {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  fetchBookings: () => Promise<void>;
  createBooking: (booking: Omit<Booking, 'id' | 'created_at'>) => Promise<void>;
  updateBooking: (id: number, updates: Partial<Booking>) => Promise<void>;
  deleteBooking: (id: number) => Promise<void>;
}

export const useBookingStore = create<BookingStore>((set) => ({
  bookings: [],
  loading: false,
  error: null,
  fetchBookings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('check_in', { ascending: true });
      
      if (error) throw error;
      set({ bookings: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  createBooking: async (booking) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([booking])
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        bookings: [...state.bookings, data],
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateBooking: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({
        bookings: state.bookings.map((booking) =>
          booking.id === id ? { ...booking, ...updates } : booking
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  deleteBooking: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({
        bookings: state.bookings.filter((booking) => booking.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));