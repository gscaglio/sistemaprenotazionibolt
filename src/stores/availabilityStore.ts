import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Availability = Database['public']['Tables']['availability']['Row'];

interface AvailabilityStore {
  availability: Availability[];
  loading: boolean;
  error: string | null;
  fetchAvailability: (month: string) => Promise<void>;
  updateAvailability: (id: number, updates: Partial<Availability>) => Promise<void>;
  updateBulkAvailability: (updates: Partial<Availability>[]) => Promise<void>;
}

export const useAvailabilityStore = create<AvailabilityStore>((set) => ({
  availability: [],
  loading: false,
  error: null,
  fetchAvailability: async (month) => {
    set({ loading: true, error: null });
    try {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      if (error) throw error;
      set({ availability: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateAvailability: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('availability')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...updates } : item
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
      const { error } = await supabase
        .from('availability')
        .upsert(updates);
      
      if (error) throw error;
      
      set((state) => ({
        availability: state.availability.map((item) => {
          const update = updates.find((u) => u.id === item.id);
          return update ? { ...item, ...update } : item;
        }),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));