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
      throw new Error('Il prezzo non può essere negativo');
    }

    // Only set blocked_reason when explicitly closing dates
    const processedUpdates = {
      ...updates,
      blocked_reason: updates.available === false ? 'manual_block' : null,
      // Keep existing price_override unless explicitly closing
      price_override: updates.available === false ? null : updates.price_override
    };

    const { data, error } = await supabase
      .from('availability')
      .update(processedUpdates)
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
        throw new Error('Il prezzo non può essere negativo');
      }
    });

    // Process updates to maintain data consistency
    const processedUpdates = updates.map(update => ({
      ...update,
      blocked_reason: update.available === false ? 'manual_block' : null,
      price_override: update.available === false ? null : update.price_override
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

  // New method to reset availability for specific dates
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