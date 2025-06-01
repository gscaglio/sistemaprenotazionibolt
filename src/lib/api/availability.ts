import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { endOfMonth, parse, format } from 'date-fns';
import toast from 'react-hot-toast';

type Availability = Database['public']['Tables']['availability']['Row'];
type AvailabilityUpdate = Partial<Availability>;

export const availabilityApi = {
  getPublicAvailability: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    if (error) throw error;
    return data;
  },

  getAvailability: async (month: string) => {
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
    return data;
  },

  updateAvailability: async (id: number, updates: Partial<Availability>) => {
    const { data, error } = await supabase
      .from('availability')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bulkUpdateAvailability: async (updates: AvailabilityUpdate[]) => {
    if (!updates || updates.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('availability')
        .upsert(
          updates.map(update => ({
            ...update,
            updated_at: new Date().toISOString()
          })),
          {
            onConflict: 'room_id,date',
            ignoreDuplicates: false
          }
        )
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in bulkUpdateAvailability:', error);
      toast.error('Errore durante l\'aggiornamento della disponibilità');
      throw error;
    }
  }
};