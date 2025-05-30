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
    // Validate updates before applying
    if (updates.price_override !== undefined && updates.price_override < 0) {
      throw new Error('Price cannot be negative');
    }

    const { data, error } = await supabase
      .from('availability')
      .update({
        ...updates,
        // Ensure availability is explicitly set when updating price
        available: updates.price_override !== undefined ? true : updates.available
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bulkUpdateAvailability: async (updates: Partial<Availability>[]) => {
    // Validate all updates before processing
    updates.forEach(update => {
      if (update.price_override !== undefined && update.price_override < 0) {
        throw new Error('Price cannot be negative');
      }
    });

    const processedUpdates = updates.map(update => ({
      ...update,
      // Ensure availability is true when setting price
      available: update.price_override !== undefined ? true : update.available
    }));

    const { data, error } = await supabase
      .from('availability')
      .upsert(processedUpdates, {
        onConflict: 'room_id,date',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return data;
  },

  resetAvailability: async (roomId: number, dates: string[]) => {
    const { error } = await supabase
      .from('availability')
      .update({
        available: true,
        blocked_reason: null,
        price_override: null
      })
      .in('date', dates)
      .eq('room_id', roomId);
    
    if (error) throw error;
  }
};