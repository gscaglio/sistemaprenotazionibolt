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
      console.error('Error fetching availability:', error);
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
      console.error('Error updating availability:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateBulkAvailability: async (updates) => {
    set({ loading: true, error: null });
    try {
      console.log('Starting bulk update in store:', {
        updateCount: updates.length,
        firstUpdate: updates[0],
        lastUpdate: updates[updates.length - 1]
      });

      const { data, error } = await supabase
        .from('availability')
        .upsert(updates, { 
          onConflict: 'room_id,date',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Error in bulk update:', error);
        throw error;
      }

      // Refresh the availability data for affected months
      const months = new Set(updates.map(u => u.date.substring(0, 7)));
      await Promise.all(Array.from(months).map(month => get().fetchAvailability(month)));
      
      set({ loading: false });
      
      console.log('Bulk update completed successfully:', {
        updatedCount: data?.length || 0,
        affectedMonths: Array.from(months)
      });
    } catch (error) {
      console.error('Error in bulk availability update:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
}));