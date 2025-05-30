import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { endOfMonth, parse, format } from 'date-fns';

type Availability = Database['public']['Tables']['availability']['Row'];

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

  bulkUpdateAvailability: async (updates: Partial<Availability>[]) => {
    console.log('Starting bulkUpdateAvailability with updates:', updates);

    try {
      // First, delete any existing records for these dates and room
      if (updates.length > 0) {
        const roomId = updates[0].room_id;
        const dates = updates.map(u => u.date);
        
        console.log('Deleting existing records for:', {
          roomId,
          dates,
        });

        const { error: deleteError } = await supabase
          .from('availability')
          .delete()
          .eq('room_id', roomId)
          .in('date', dates);
          
        if (deleteError) {
          console.error('Error deleting existing records:', deleteError);
          throw deleteError;
        }

        console.log('Successfully deleted existing records');
      }

      // Then insert the new records
      console.log('Inserting new records:', updates);

      const { data, error } = await supabase
        .from('availability')
        .insert(updates)
        .select();

      if (error) {
        console.error('Error inserting new records:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Successfully inserted new records:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error in bulkUpdateAvailability:', error);
      throw error;
    }
  }
};