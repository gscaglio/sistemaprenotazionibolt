import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { endOfMonth, parse, format } from 'date-fns';

type Availability = Database['public']['Tables']['availability']['Row'];

interface AvailabilityStore {
  availability: Availability[];
  loading: boolean;
  error: string | null;
  fetchAvailability: (month: string) => Promise<void>;
  updateAvailability: (id: number, updates: Partial<Availability>) => Promise<void>;
  updateBulkAvailability: (updates: Partial<Availability>[]) => Promise<void>;
}

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  availability: [],
  loading: false,
  error: null,
  fetchAvailability: async (month) => {
    set({ loading: true, error: null });
    try {
      const startDate = `${month}-01`;
      const parsedDate = parse(month, 'yyyy-MM', new Date());
      const endDate = format(endOfMonth(parsedDate), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      if (error) throw error;
      set({ availability: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateAvailability: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateBulkAvailability: async (updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('availability')
        .upsert(updates, { 
          onConflict: 'room_id,date',
          ignoreDuplicates: false 
        })
        .select('*');
      
      if (error) throw error;

      const currentState = get();
      const month = updates[0]?.date?.substring(0, 7);
      if (month) {
        await currentState.fetchAvailability(month);
      }
      
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));