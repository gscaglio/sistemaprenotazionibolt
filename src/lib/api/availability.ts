import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { endOfMonth, parse, format } from 'date-fns';

type Availability = Database['public']['Tables']['availability']['Row'];
type AvailabilityUpdate = Partial<Availability>; // For updates, not all fields are required

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

  /**
   * Performs a bulk upsert (insert or update) of availability records.
   * - Adds `updated_at` timestamp to each record.
   * - Uses Supabase `upsert` with `onConflict` on `room_id,date` to ensure data integrity.
   * - Optionally fetches and logs existing records for the given room and dates before upserting (for debugging/auditing).
   * 
   * @param updates An array of `AvailabilityUpdate` objects. Each object should contain
   *                at least `room_id` and `date`, along with any fields to be updated
   *                (e.g., `price_override`, `available`).
   * @returns A promise that resolves with the array of upserted availability records, 
   *          or an empty array if the input was empty. Throws an error on Supabase failure.
   */
  bulkUpdateAvailability: async (updates: AvailabilityUpdate[]) => {
    console.log('[API] Starting bulkUpdateAvailability with incoming updates:', logSample(updates));

    if (!updates || updates.length === 0) {
      console.warn('[API] bulkUpdateAvailability called with no updates.');
      return [];
    }

    try {
      // Optional: Pre-fetch existing records for logging or pre-check purposes.
      // This part is not strictly necessary for the upsert operation itself, as
      // `onConflict` handles the insert vs. update logic.
      const firstUpdate = updates[0];
      if (firstUpdate?.room_id && firstUpdate.date) { // Check if there's enough info for a meaningful pre-fetch
        const roomId = firstUpdate.room_id;
        // Collect all unique dates for the specific room_id from the updates for a more targeted fetch.
        // This example just uses the first update's details for simplicity if pre-fetch is broad.
        // For a more precise pre-fetch, one might iterate all updates for their dates and room_ids.
        const dates = updates.map(u => u.date).filter(d => d !== undefined) as string[];
        
        if (roomId && dates.length > 0) {
          console.log(`[API] Pre-fetching existing records for room_id: ${roomId} and ${dates.length} specific dates for potential comparison.`);
          const { data: existingRecords, error: fetchError } = await supabase
            .from('availability')
            .select('id, date, room_id, price_override, available') // Select fields relevant for comparison
            .eq('room_id', roomId)
            .in('date', dates);

          if (fetchError) {
            console.error('[API] Error pre-fetching existing records (non-fatal for upsert):', fetchError);
          } else {
            console.log(`[API] Found ${existingRecords?.length || 0} existing records before upsert. Sample:`, logSample(existingRecords));
          }
        }
      } else {
        console.log('[API] Skipping pre-fetch of existing records due to insufficient data in first update item or varied room_ids.');
      }
      
      // Prepare data for upsert: ensure `updated_at` is set for all records.
      const upsertData = updates.map(update => ({
        ...update,
        updated_at: new Date().toISOString() 
      }));

      console.log('[API] Prepared upsertData for Supabase:', logSample(upsertData));
      console.log(`[API] Upserting ${upsertData.length} records.`);

      // Perform the upsert
      const { data, error } = await supabase
        .from('availability')
        .upsert(upsertData, {
          onConflict: 'room_id,date', // Ensures update if room_id and date match
          ignoreDuplicates: false      // Ensures it updates, not ignores
        })
        .select(); // Select all columns of the upserted rows

      if (error) {
        console.error('[API] Error during Supabase upsert:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error; // Re-throw the error to be caught by the caller
      }

      console.log(`[API] Supabase upsert successful. ${data?.length || 0} records processed/returned.`);
      console.log('[API] Sample of returned data:', logSample(data));

      return data;
    } catch (error) {
      // Catch any other unexpected errors
      console.error('[API] Unexpected error in bulkUpdateAvailability:', error);
      // Ensure the error is re-thrown so the caller (e.g., store) can handle it
      throw error;
    }
  }
};