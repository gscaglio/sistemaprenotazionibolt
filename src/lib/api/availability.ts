import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { endOfMonth, parse, format } from 'date-fns';
import { errorLogger } from '../errorLogger';

type Availability = Database['public']['Tables']['availability']['Row'];
type AvailabilityUpdate = Partial<Availability>;

// Helper to log a sample of data if it's too large
const logSample = (data: any[], sampleSize: number = 3) => {
  if (!data) return 'undefined data';
  if (data.length > sampleSize) {
    return `Array of ${data.length} items. Sample: ${JSON.stringify(data.slice(0, sampleSize))}...`;
  }
  return data;
};

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
    console.log('[API] Starting bulkUpdateAvailability with incoming updates:', logSample(updates));

    if (!updates || updates.length === 0) {
      console.warn('[API] bulkUpdateAvailability called with no updates.');
      return [];
    }

    try {
      const firstUpdate = updates[0];
      if (firstUpdate?.room_id && firstUpdate.date) {
        const roomId = firstUpdate.room_id;
        const dates = updates.map(u => u.date).filter(d => d !== undefined) as string[];
        
        if (roomId && dates.length > 0) {
          console.log(`[API] Pre-fetching existing records for room_id: ${roomId} and ${dates.length} specific dates for potential comparison.`);
          const { data: existingRecords, error: fetchError } = await supabase
            .from('availability')
            .select('id, date, room_id, price_override, available')
            .eq('room_id', roomId)
            .in('date', dates);

          if (fetchError) {
            errorLogger.log(new Error(fetchError.message), 'warning', {
              operation: 'bulkUpdateAvailability_prefetch',
              roomId,
              dates
            });
          } else {
            console.log(`[API] Found ${existingRecords?.length || 0} existing records before upsert. Sample:`, logSample(existingRecords));
          }
        }
      }
      
      const upsertData = updates.map(update => ({
        ...update,
        updated_at: new Date().toISOString() 
      }));

      console.log('[API] Prepared upsertData for Supabase:', logSample(upsertData));
      console.log(`[API] Upserting ${upsertData.length} records.`);

      const { data, error } = await supabase
        .from('availability')
        .upsert(upsertData, {
          onConflict: 'room_id,date',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        errorLogger.log(new Error(error.message), 'error', {
          operation: 'bulkUpdateAvailability_upsert',
          code: error.code,
          details: error.details,
          hint: error.hint,
          updatesCount: updates.length
        });
        throw error;
      }

      console.log(`[API] Supabase upsert successful. ${data?.length || 0} records processed/returned.`);
      console.log('[API] Sample of returned data:', logSample(data));

      return data;
    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
        operation: 'bulkUpdateAvailability',
        updatesCount: updates.length,
        sample: logSample(updates)
      });
      throw error;
    }
  }
};