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
    console.log('Starting bulkUpdateAvailability:', {
      updateCount: updates.length,
      firstUpdate: updates[0],
      lastUpdate: updates[updates.length - 1]
    });

    try {
      // First, get existing records for these dates and room
      const roomId = updates[0]?.room_id;
      const dates = updates.map(u => u.date);
      
      const { data: existingRecords, error: fetchError } = await supabase
        .from('availability')
        .select('*')
        .eq('room_id', roomId)
        .in('date', dates);

      if (fetchError) {
        console.error('Error fetching existing records:', fetchError);
        throw fetchError;
      }

      console.log('Existing records found:', existingRecords?.length || 0);

      // Prepare upsert data
      const upsertData = updates.map(update => ({
        ...update,
        updated_at: new Date().toISOString()
      }));

      console.log('Preparing upsert with data:', {
        count: upsertData.length,
        sample: upsertData[0]
      });

      // Perform the upsert
      const { data, error } = await supabase
        .from('availability')
        .upsert(upsertData, {
          onConflict: 'room_id,date',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Error during upsert:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      console.log('Upsert successful:', {
        updatedCount: data?.length || 0,
        firstRecord: data?.[0],
        lastRecord: data?.[data?.length - 1]
      });

      return data;
    } catch (error) {
      console.error('Unexpected error in bulkUpdateAvailability:', error);
      throw error;
    }
  }
};